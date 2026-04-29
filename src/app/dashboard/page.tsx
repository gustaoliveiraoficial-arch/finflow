'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import { formatCurrency, formatDate, getMonthRange, getDaysUntilDue } from '@/lib/utils'
import { createNotification } from '@/lib/notifications'
import StatCard from '@/components/dashboard/StatCard'
import ExpenseChart from '@/components/dashboard/ExpenseChart'
import BalanceTrend from '@/components/dashboard/BalanceTrend'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import type { Transaction, Bill, Receivable, Task, HealthLog } from '@/types'
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  CheckSquare, Droplets, Dumbbell, AlertTriangle,
  Plus, ChevronRight, Clock
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const WATER_GOAL = 8
const GYM_GOAL_WEEK = 3

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayWater, setTodayWater] = useState(0)
  const [weekGym, setWeekGym] = useState(0)
  const [expenseByCategory, setExpenseByCategory] = useState<{ category: string; amount: number; color: string }[]>([])
  const [balanceTrend, setBalanceTrend] = useState<{ date: string; balance: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const deviceId = getDeviceId()
    const supabase = createClient()
    const { start, end } = getMonthRange()
    const today = new Date().toISOString().slice(0, 10)

    // Início da semana (segunda)
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    const [walletsRes, txRes, billsRes, receivablesRes, tasksRes, waterRes, gymRes] = await Promise.all([
      supabase.from('wallets').select('balance').eq('device_id', deviceId).eq('is_active', true),
      supabase.from('transactions')
        .select('*, category:categories(name,color,icon), wallet:wallets(name,color)')
        .eq('device_id', deviceId)
        .gte('date', start).lte('date', end)
        .order('date', { ascending: false }),
      supabase.from('bills').select('*, category:categories(name,color,icon)')
        .eq('device_id', deviceId).eq('is_active', true),
      supabase.from('receivables').select('*')
        .eq('device_id', deviceId).eq('is_received', false)
        .gte('due_date', today)
        .order('due_date', { ascending: true }),
      supabase.from('tasks').select('*')
        .eq('device_id', deviceId).eq('is_done', false)
        .order('due_date', { ascending: true })
        .limit(5),
      supabase.from('health_logs').select('value')
        .eq('device_id', deviceId).eq('type', 'water')
        .gte('logged_at', today + 'T00:00:00'),
      supabase.from('health_logs').select('id')
        .eq('device_id', deviceId).eq('type', 'gym')
        .gte('logged_at', weekStartStr + 'T00:00:00'),
    ])

    const txList = (txRes.data ?? []) as unknown as Transaction[]
    const totalBalance = (walletsRes.data ?? []).reduce((s, w) => s + (w.balance ?? 0), 0)

    // Expense by category
    const catMap = new Map<string, { amount: number; color: string }>()
    txList.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category?.name ?? 'Outros'
      const color = t.category?.color ?? '#94a3b8'
      const prev = catMap.get(key) ?? { amount: 0, color }
      catMap.set(key, { amount: prev.amount + t.amount, color })
    })

    // Balance trend
    const trendMap = new Map<string, number>()
    txList.slice().reverse().forEach(t => {
      const d = t.date
      const cur = trendMap.get(d) ?? 0
      trendMap.set(d, t.type === 'income' ? cur + t.amount : cur - t.amount)
    })
    const trend = Array.from(trendMap.entries())
      .slice(-7)
      .map(([date, delta], i, arr) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        balance: arr.slice(0, i + 1).reduce((s, [, d]) => s + d, totalBalance),
      }))

    setWalletBalance(totalBalance)
    setTransactions(txList)
    setBills((billsRes.data ?? []) as unknown as Bill[])
    setReceivables((receivablesRes.data ?? []) as unknown as Receivable[])
    setTasks((tasksRes.data ?? []) as unknown as Task[])
    setTodayWater((waterRes.data ?? []).reduce((s, r) => s + (r.value ?? 0), 0))
    setWeekGym((gymRes.data ?? []).length)
    setExpenseByCategory(Array.from(catMap.entries()).map(([category, { amount, color }]) => ({ category, amount, color })).sort((a, b) => b.amount - a.amount))
    setBalanceTrend(trend)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Verificar alertas de contas 3 dias — toast + salva no banco
  useEffect(() => {
    if (loading) return
    const deviceId = getDeviceId()
    const urgentBills = bills.filter(b => getDaysUntilDue(b.due_day) <= 3)
    const urgentReceivables = receivables.filter(r => {
      const days = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000)
      return days <= 3
    })
    if (urgentBills.length > 0) {
      toast(`⚠️ ${urgentBills.length} conta(s) vencem em até 3 dias!`, { duration: 5000 })
      urgentBills.forEach(b => {
        createNotification({
          device_id: deviceId,
          title: `⚠️ ${b.name} vence em ${getDaysUntilDue(b.due_day)} dia(s)`,
          body: `Valor: ${formatCurrency(b.amount)} — dia ${b.due_day}`,
          type: 'bill_due',
          data: { bill_id: b.id, amount: b.amount, due_day: b.due_day },
        })
      })
    }
    if (urgentReceivables.length > 0) {
      toast(`💰 ${urgentReceivables.length} recebimento(s) chegando em até 3 dias!`, { duration: 5000 })
      urgentReceivables.forEach(r => {
        const days = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000)
        createNotification({
          device_id: deviceId,
          title: `💰 ${r.name} chega em ${days} dia(s)`,
          body: `Valor: ${formatCurrency(r.amount)} — ${r.due_date}`,
          type: 'receivable_due',
          data: { receivable_id: r.id, amount: r.amount, due_date: r.due_date },
        })
      })
    }
  }, [loading, bills, receivables])

  const monthlyIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savingsRate    = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const urgentBills = bills.filter(b => getDaysUntilDue(b.due_day) <= 3)
  const urgentReceivables = receivables.filter(r => {
    const days = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000)
    return days <= 3
  })

  const priorityColor = { low: 'text-gray-400', medium: 'text-warning', high: 'text-expense' }
  const categoryEmoji = { pessoal: '👤', trabalho: '💼', saude: '💪', financeiro: '💰', outro: '📌' }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="skeleton h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 skeleton h-64 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{greeting}, Gustavo! 👋</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alertas urgentes */}
      {(urgentBills.length > 0 || urgentReceivables.length > 0) && (
        <div className="mb-6 space-y-2">
          {urgentBills.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-expense/10 border border-expense/30">
              <AlertTriangle className="w-4 h-4 text-expense flex-shrink-0" />
              <p className="text-sm text-white flex-1">
                <span className="font-semibold">{b.name}</span> vence em {getDaysUntilDue(b.due_day)} dia(s) — {formatCurrency(b.amount)}
              </p>
              <Link href="/contas" className="text-xs text-expense font-semibold hover:underline">Ver</Link>
            </div>
          ))}
          {urgentReceivables.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-income/10 border border-income/30">
              <TrendingUp className="w-4 h-4 text-income flex-shrink-0" />
              <p className="text-sm text-white flex-1">
                <span className="font-semibold">{r.name}</span> chega em {Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000)} dia(s) — {formatCurrency(r.amount)}
              </p>
              <Link href="/contas" className="text-xs text-income font-semibold hover:underline">Ver</Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Saldo Total"      value={walletBalance}  icon={Wallet}      variant="default" />
        <StatCard label="Entradas do Mês"  value={monthlyIncome}  icon={TrendingUp}  variant="income" />
        <StatCard label="Gastos do Mês"    value={monthlyExpense} icon={TrendingDown} variant="expense" />
        <StatCard label="Taxa de Poupança" value={savingsRate}    icon={PiggyBank}   variant="neutral"
          subtitle={`${savingsRate.toFixed(1)}% da renda`} />
      </div>

      {/* Grid principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Esquerda — gráficos + transações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Evolução */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Evolução do Saldo</h3>
            <BalanceTrend data={balanceTrend} />
          </div>

          {/* Gastos por categoria */}
          {expenseByCategory.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Gastos por Categoria</h3>
              <p className="text-xs text-gray-500 mb-4">Distribuição no mês atual</p>
              <ExpenseChart data={expenseByCategory} />
            </div>
          )}

          {/* Transações recentes */}
          <RecentTransactions transactions={transactions.slice(0, 6)} />
        </div>

        {/* Direita — saúde, tarefas, contas */}
        <div className="space-y-6">
          {/* Saúde */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Saúde de Hoje</h3>
              <Link href="/saude" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                Ver mais <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {/* Água */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Água</span>
                    <span className="text-xs font-semibold text-white">{todayWater}/{WATER_GOAL} copos</span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (todayWater / WATER_GOAL) * 100)}%` }} />
                  </div>
                </div>
              </div>
              {/* Academia */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Academia (semana)</span>
                    <span className="text-xs font-semibold text-white">{weekGym}/{GYM_GOAL_WEEK}x</span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (weekGym / GYM_GOAL_WEEK) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <Link href="/saude"
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-surface-border text-xs text-gray-400 hover:text-white hover:border-brand-600/50 transition-all">
              <Plus className="w-3.5 h-3.5" /> Registrar
            </Link>
          </div>

          {/* Tarefas pendentes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Tarefas Pendentes</h3>
              <Link href="/tarefas" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-4">
                <CheckSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Nenhuma tarefa pendente</p>
                <Link href="/tarefas" className="text-xs text-brand-400 hover:underline mt-1 block">Criar tarefa</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-start gap-2.5 py-1.5">
                    <span className="text-base leading-none mt-0.5">{categoryEmoji[t.category]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', priorityColor[t.priority] === 'text-expense' ? 'text-white' : 'text-white')}>
                        {t.title}
                      </p>
                      {t.due_date && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <p className="text-xs text-gray-500">{formatDate(t.due_date)}{t.due_time ? ` às ${t.due_time.slice(0, 5)}` : ''}</p>
                        </div>
                      )}
                    </div>
                    <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      t.priority === 'high' ? 'bg-expense' : t.priority === 'medium' ? 'bg-warning' : 'bg-gray-600'
                    )} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximas contas a pagar */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Contas a Pagar</h3>
              <Link href="/contas" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {bills.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">Nenhuma conta cadastrada</p>
            ) : (
              <div className="space-y-2">
                {bills
                  .filter(b => b.is_active)
                  .sort((a, b) => getDaysUntilDue(a.due_day) - getDaysUntilDue(b.due_day))
                  .slice(0, 4)
                  .map(b => {
                    const days = getDaysUntilDue(b.due_day)
                    return (
                      <div key={b.id} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                        <p className="text-sm text-white flex-1 truncate">{b.name}</p>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white tabular-nums">{formatCurrency(b.amount)}</p>
                          <p className={cn('text-xs', days <= 3 ? 'text-expense font-semibold' : days <= 7 ? 'text-warning' : 'text-gray-500')}>
                            {days === 0 ? 'Hoje!' : `${days}d`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
