'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types'
import { formatCurrency, formatDate, getMonthRange } from '@/lib/utils'
import { Plus, Trash2, Pencil, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/expenses/TransactionForm'
import EmptyState from '@/components/ui/EmptyState'
import { CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [monthOffset, setMonthOffset]   = useState(0)
  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState<'all' | 'income' | 'expense'>('all')
  const [showModal, setShowModal]       = useState(false)
  const [editTx, setEditTx]             = useState<Transaction | undefined>()
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const supabase = createClient()

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const { start, end } = getMonthRange(monthOffset)
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(name,color,icon), wallet:wallets(name,color)')
      .gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    setTransactions((data ?? []) as unknown as Transaction[])
    setLoading(false)
  }, [monthOffset])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  const filtered = transactions.filter(t => {
    const matchType   = filterType === 'all' || t.type === filterType
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  async function handleDelete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Transação excluída')
    setDeleteId(null)
    loadTransactions()
  }

  const { start } = getMonthRange(monthOffset)
  const monthLabel = new Date(start + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos & Entradas</h1>
          <p className="text-sm text-gray-400 capitalize">{monthLabel}</p>
        </div>
        <button onClick={() => { setEditTx(undefined); setShowModal(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Transação
        </button>
      </div>

      {/* Month nav + Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(o => o - 1)}
            className="p-2 rounded-xl hover:bg-surface-hover text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white capitalize min-w-36 text-center">{monthLabel}</span>
          <button onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset === 0}
            className="p-2 rounded-xl hover:bg-surface-hover text-gray-400 hover:text-white transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-income font-semibold">+{formatCurrency(totalIncome)}</span>
          <span className="text-gray-500">·</span>
          <span className="text-expense font-semibold">-{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-9" placeholder="Buscar transações..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 p-1 bg-surface-hover rounded-xl border border-surface-border">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === t ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {t === 'all' ? 'Todos' : t === 'income' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhuma transação encontrada"
          description="Adicione sua primeira transação usando o botão acima"
          action={
            <button onClick={() => { setEditTx(undefined); setShowModal(true) }} className="btn-primary">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-surface-border">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                     style={{ backgroundColor: `${t.category?.color ?? '#94a3b8'}20` }}>
                  {t.source === 'voice' ? '🎙️' : t.type === 'income' ? '💰' : '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{t.description}</p>
                    {!t.is_paid && <span className="badge-neutral text-[10px]">Pendente</span>}
                    {t.is_recurring && <span className="badge-neutral text-[10px]">Recorrente</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {t.category?.name ?? 'Sem categoria'} · {formatDate(t.date)} · {(t.wallet as { name?: string })?.name ?? ''}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditTx(t); setShowModal(true) }}
                    className="p-1.5 rounded-lg hover:bg-brand-600/20 text-gray-500 hover:text-brand-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(t.id)}
                    className="p-1.5 rounded-lg hover:bg-expense/10 text-gray-500 hover:text-expense transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editTx ? 'Editar Transação' : 'Nova Transação'}>
        <TransactionForm
          transaction={editTx}
          onSuccess={() => { setShowModal(false); loadTransactions() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir transação" size="sm">
        <p className="text-sm text-gray-400 mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger flex-1">Excluir</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
