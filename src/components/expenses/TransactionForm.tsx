'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import type { Transaction, Wallet, Category } from '@/types'
import toast from 'react-hot-toast'

interface TransactionFormProps {
  transaction?: Transaction
  onSuccess: () => void
  onCancel: () => void
  defaultType?: 'income' | 'expense'
}

export default function TransactionForm({ transaction, onSuccess, onCancel, defaultType = 'expense' }: TransactionFormProps) {
  const [wallets, setWallets]       = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(false)
  const [form, setForm] = useState({
    type:        transaction?.type        ?? defaultType,
    amount:      transaction?.amount?.toString() ?? '',
    description: transaction?.description ?? '',
    date:        transaction?.date        ?? new Date().toISOString().slice(0, 10),
    wallet_id:   transaction?.wallet_id   ?? '',
    category_id: transaction?.category_id ?? '',
    is_recurring: transaction?.is_recurring ?? false,
    recurrence:  transaction?.recurrence  ?? 'monthly',
    is_paid:     transaction?.is_paid     ?? true,
    notes:       transaction?.notes       ?? '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const deviceId = getDeviceId()
      const [{ data: w }, { data: c }] = await Promise.all([
        supabase.from('wallets').select('*').eq('device_id', deviceId).eq('is_active', true),
        supabase.from('categories').select('*').order('name'),
      ])
      setWallets(w ?? [])
      setCategories(c ?? [])
      if (!form.wallet_id && w?.length) setForm(f => ({ ...f, wallet_id: w[0].id }))
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredCategories = categories.filter(c => c.type === form.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.description || !form.wallet_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const deviceId = getDeviceId()
    const payload = {
      device_id:   deviceId,
      type:        form.type,
      amount:      parseFloat(form.amount),
      description: form.description,
      date:        form.date,
      wallet_id:   form.wallet_id,
      category_id: form.category_id || null,
      is_recurring: form.is_recurring,
      recurrence:  form.is_recurring ? form.recurrence : null,
      is_paid:     form.is_paid,
      notes:       form.notes || null,
    }
    try {
      if (transaction) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', transaction.id)
        if (error) throw error
        toast.success('Transação atualizada!')
      } else {
        const { error } = await supabase.from('transactions').insert(payload)
        if (error) throw error
        // Atualizar saldo da carteira
        const wallet = wallets.find(w => w.id === form.wallet_id)
        if (wallet) {
          const delta = form.type === 'income' ? parseFloat(form.amount) : -parseFloat(form.amount)
          await supabase.from('wallets').update({ balance: wallet.balance + delta }).eq('id', wallet.id)
        }
        toast.success('Transação adicionada!')
      }
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="flex rounded-xl border border-surface-border overflow-hidden">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} type="button"
            onClick={() => setForm(f => ({ ...f, type: t }))}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              form.type === t
                ? t === 'income' ? 'bg-income text-black' : 'bg-expense text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'income' ? '+ Entrada' : '- Saída'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1.5">Descrição *</label>
          <input className="input" placeholder="Ex: Supermercado, Salário..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Valor (R$) *</label>
          <input className="input" type="number" step="0.01" min="0.01" placeholder="0,00"
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Data *</label>
          <input className="input" type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Carteira *</label>
          <select className="select" value={form.wallet_id} onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value }))} required>
            <option value="">Selecione...</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Categoria</label>
          <select className="select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">Sem categoria</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1.5">Observações</label>
          <textarea className="input resize-none" rows={2} placeholder="Opcional..."
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
            checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} />
          <span className="text-sm text-gray-400">Recorrente</span>
        </label>
        {form.type === 'expense' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-income"
              checked={form.is_paid} onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))} />
            <span className="text-sm text-gray-400">Pago</span>
          </label>
        )}
      </div>

      {form.is_recurring && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Frequência</label>
          <select className="select" value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as import('@/types').RecurrenceType }))}>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Salvando...' : transaction ? 'Atualizar' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
