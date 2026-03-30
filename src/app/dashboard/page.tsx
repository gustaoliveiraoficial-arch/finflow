import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import StatCard from '@/components/dashboard/StatCard'
import UpcomingBills from '@/components/dashboard/UpcomingBills'
import FinancialTipCard from '@/components/dashboard/FinancialTipCard'
import ExpenseChart from '@/components/dashboard/ExpenseChart'
import BalanceTrend from '@/components/dashboard/BalanceTrend'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { getMonthRange } from '@/lib/utils'
import type { Transaction, Bill } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { start, end } = getMonthRange()

  // Parallel data fetching
  const [walletsRes, transactionsRes, billsRes] = await Promise.all([
    supabase.from('wallets').select('*').eq('is_active', true),
    supabase.from('transactions').select('*, category:categories(name,color,icon), wallet:wallets(name,color)')
      .gte('date', start).lte('date', end).order('date', { ascending: false }),
    supabase.from('bills').select('*, category:categories(name,color,icon)').eq('is_active', true),
  ])

  const wallets      = walletsRes.data      ?? []
  const transactions = (transactionsRes.data ?? []) as unknown as Transaction[]
  const bills        = (billsRes.data        ?? []) as unknown as Bill[]

  const totalBalance   = wallets.reduce((s, w) => s + w.balance, 0)
  const monthlyIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savingsRate    = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0

  // Expense by category
  const catMap = new Map<string, { amount: number; color: string }>()
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key   = t.category?.name ?? 'Outros'
    const color = t.category?.color ?? '#94a3b8'
    const prev  = catMap.get(key) ?? { amount: 0, color }
    catMap.set(key, { amount: prev.amount + t.amount, color })
  })
  const expenseByCategory = Array.from(catMap.entries())
    .map(([category, { amount, color }]) => ({ category, amount, color }))
    .sort((a, b) => b.amount - a.amount)

  // Balance trend (last 7 days of month)
  const trendMap = new Map<string, number>()
  transactions.slice().reverse().forEach(t => {
    const d = t.date
    const cur = trendMap.get(d) ?? 0
    trendMap.set(d, t.type === 'income' ? cur + t.amount : cur - t.amount)
  })
  const balanceTrend = Array.from(trendMap.entries())
    .slice(-7)
    .map(([date, delta], i, arr) => ({
      date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      balance: arr.slice(0, i + 1).reduce((s, [, d]) => s + d, totalBalance),
    }))

  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user.user_metadata?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'você'

  return (
    <AppLayout>
      {/* Hero Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{greeting}, {firstName} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">
          Aqui está o resumo financeiro de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Saldo Total"      value={totalBalance}   icon={Wallet}      variant="default" subtitle={`${wallets.length} carteiras`} />
        <StatCard label="Entradas do Mês"  value={monthlyIncome}  icon={TrendingUp}  variant="income"  />
        <StatCard label="Gastos do Mês"    value={monthlyExpense} icon={TrendingDown} variant="expense" />
        <StatCard label="Taxa de Poupança" value={savingsRate}    icon={PiggyBank}   variant="neutral"
          subtitle={`${savingsRate.toFixed(1)}% da renda`}
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance Trend */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Evolução do Saldo</h3>
            <BalanceTrend data={balanceTrend} />
          </div>

          {/* Expense by Category */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Gastos por Categoria</h3>
            <p className="text-xs text-gray-500 mb-4">Distribuição no mês atual</p>
            <ExpenseChart data={expenseByCategory} />
          </div>

          {/* Recent Transactions */}
          <RecentTransactions transactions={transactions.slice(0, 8)} />
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          <FinancialTipCard />
          <UpcomingBills bills={bills} />
        </div>
      </div>
    </AppLayout>
  )
}
