'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import type { Bill, Receivable } from '@/types'
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils'
import { Plus, Trash2, Pencil, AlertTriangle, CheckCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab = 'pagar' | 'receber'

const COLORS_PAY = ['#f87171', '#fb923c', '#fbbf24', '#a78bfa', '#60a5fa', '#f472b6']
const COLORS_REC = ['#22d3a4', '#34d399', '#6ee7b7', '#a7f3d0', '#86efac', '#4ade80']

function daysUntilDate(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function ContasPage() {
  const [tab, setTab] = useState<Tab>('pagar')
  const [bills, setBills] = useState<Bill[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(true)

  // Bill form
  const [showBillModal, setShowBillModal] = useState(false)
  const [editBill, setEditBill] = useState<Bill | undefined>()
  const [billForm, setBillForm] = useState({ name: '', amount: '', due_day: '1', color: COLORS_PAY[0], is_recurring: true })

  // Receivable form
  const [showRecModal, setShowRecModal] = useState(false)
  const [editRec, setEditRec] = useState<Receivable | undefined>()
  const [recForm, setRecForm] = useState({ name: '', amount: '', due_date: '', color: COLORS_REC[0], notes: '' })

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'bill' | 'receivable'; id: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const deviceId = getDeviceId()
    const [{ data: b }, { data: r }] = await Promise.all([
      supabase.from('bills').select('*, category:categories(name,color,icon)')
        .eq('device_id', deviceId).eq('is_active', true).order('due_day'),
      supabase.from('receivables').select('*')
        .eq('device_id', deviceId).order('due_date'),
    ])
    setBills((b ?? []) as unknown as Bill[])
    setReceivables((r ?? []) as unknown as Receivable[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // === BILLS ===
  function openNewBill() {
    setEditBill(undefined)
    setBillForm({ name: '', amount: '', due_day: '1', color: COLORS_PAY[0], is_recurring: true })
    setShowBillModal(true)
  }
  function openEditBill(b: Bill) {
    setEditBill(b)
    setBillForm({ name: b.name, amount: b.amount.toString(), due_day: b.due_day.toString(), color: b.color, is_recurring: b.is_recurring })
    setShowBillModal(true)
  }
  async function saveBill() {
    if (!billForm.name || !billForm.amount) { toast.error('Preencha nome e valor'); return }
    const supabase = createClient()
    const deviceId = getDeviceId()
    const payload = {
      device_id: deviceId,
      name: billForm.name,
      amount: parseFloat(billForm.amount),
      due_day: parseInt(billForm.due_day),
      color: billForm.color,
      is_recurring: billForm.is_recurring,
    }
    if (editBill) {
      const { error } = await supabase.from('bills').update(payload).eq('id', editBill.id)
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Conta atualizada!')
    } else {
      const { error } = await supabase.from('bills').insert(payload)
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Conta cadastrada!')
    }
    setShowBillModal(false); load()
  }

  // === RECEIVABLES ===
  function openNewRec() {
    setEditRec(undefined)
    setRecForm({ name: '', amount: '', due_date: '', color: COLORS_REC[0], notes: '' })
    setShowRecModal(true)
  }
  function openEditRec(r: Receivable) {
    setEditRec(r)
    setRecForm({ name: r.name, amount: r.amount.toString(), due_date: r.due_date, color: r.color, notes: r.notes ?? '' })
    setShowRecModal(true)
  }
  async function saveRec() {
    if (!recForm.name || !recForm.amount || !recForm.due_date) { toast.error('Preencha todos os campos'); return }
    const supabase = createClient()
    const deviceId = getDeviceId()
    const payload = {
      device_id: deviceId,
      name: recForm.name,
      amount: parseFloat(recForm.amount),
      due_date: recForm.due_date,
      color: recForm.color,
      notes: recForm.notes || null,
    }
    if (editRec) {
      const { error } = await supabase.from('receivables').update(payload).eq('id', editRec.id)
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Recebimento atualizado!')
    } else {
      const { error } = await supabase.from('receivables').insert(payload)
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Recebimento cadastrado!')
    }
    setShowRecModal(false); load()
  }

  async function markReceived(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('receivables').update({ is_received: true }).eq('id', id)
    if (error) { toast.error('Erro'); return }
    toast.success('Marcado como recebido!')
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const supabase = createClient()
    if (deleteTarget.type === 'bill') {
      await supabase.from('bills').update({ is_active: false }).eq('id', deleteTarget.id)
    } else {
      await supabase.from('receivables').delete().eq('id', deleteTarget.id)
    }
    toast.success('Removido!')
    setDeleteTarget(null); load()
  }

  const totalBills = bills.reduce((s, b) => s + b.amount, 0)
  const totalRec   = receivables.filter(r => !r.is_received).reduce((s, r) => s + r.amount, 0)

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Contas</h1>
          <p className="text-sm text-gray-400">Controle o que você paga e o que recebe</p>
        </div>
        <button onClick={tab === 'pagar' ? openNewBill : openNewRec} className="btn-primary">
          <Plus className="w-4 h-4" /> {tab === 'pagar' ? 'Nova Conta' : 'Novo Recebimento'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-hover rounded-xl border border-surface-border mb-6 w-fit">
        <button onClick={() => setTab('pagar')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'pagar' ? 'bg-expense/20 text-expense border border-expense/30' : 'text-gray-400 hover:text-white'}`}>
          💸 A Pagar — {formatCurrency(totalBills)}/mês
        </button>
        <button onClick={() => setTab('receber')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'receber' ? 'bg-income/20 text-income border border-income/30' : 'text-gray-400 hover:text-white'}`}>
          💰 A Receber — {formatCurrency(totalRec)}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : tab === 'pagar' ? (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-gray-500 mb-3">Nenhuma conta cadastrada</p>
              <button onClick={openNewBill} className="btn-primary mx-auto"><Plus className="w-4 h-4" /> Adicionar conta</button>
            </div>
          ) : bills.sort((a, b) => getDaysUntilDue(a.due_day) - getDaysUntilDue(b.due_day)).map(b => {
            const days = getDaysUntilDue(b.due_day)
            const urgent = days <= 3
            return (
              <div key={b.id} className={cn('card p-4 flex items-center gap-4', urgent && 'border-expense/40 bg-expense/5')}>
                <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{b.name}</p>
                    {urgent && <AlertTriangle className="w-4 h-4 text-expense" />}
                  </div>
                  <p className="text-xs text-gray-500">
                    Vence dia {b.due_day} · {b.is_recurring ? 'Mensal' : 'Única vez'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white tabular-nums">{formatCurrency(b.amount)}</p>
                  <p className={cn('text-xs font-semibold', urgent ? 'text-expense' : days <= 7 ? 'text-warning' : 'text-gray-500')}>
                    {days === 0 ? 'Hoje!' : `${days} dia(s)`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditBill(b)} className="p-2 rounded-lg hover:bg-brand-600/20 text-gray-500 hover:text-brand-400 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget({ type: 'bill', id: b.id })} className="p-2 rounded-lg hover:bg-expense/10 text-gray-500 hover:text-expense transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {receivables.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-gray-500 mb-3">Nenhum recebimento cadastrado</p>
              <button onClick={openNewRec} className="btn-primary mx-auto"><Plus className="w-4 h-4" /> Adicionar recebimento</button>
            </div>
          ) : receivables.map(r => {
            const days = daysUntilDate(r.due_date)
            const urgent = days >= 0 && days <= 3
            return (
              <div key={r.id} className={cn('card p-4 flex items-center gap-4', r.is_received && 'opacity-60', urgent && !r.is_received && 'border-income/40 bg-income/5')}>
                <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{r.name}</p>
                    {r.is_received && <span className="badge-income text-[10px]">Recebido</span>}
                    {urgent && !r.is_received && <AlertTriangle className="w-4 h-4 text-income" />}
                  </div>
                  <p className="text-xs text-gray-500">
                    Vence em {formatDate(r.due_date)}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-income tabular-nums">{formatCurrency(r.amount)}</p>
                  <p className={cn('text-xs font-semibold', r.is_received ? 'text-gray-500' : urgent ? 'text-income' : days < 0 ? 'text-expense' : 'text-gray-500')}>
                    {r.is_received ? 'Recebido' : days < 0 ? `Atrasado ${Math.abs(days)}d` : days === 0 ? 'Hoje!' : `${days} dia(s)`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!r.is_received && (
                    <button onClick={() => markReceived(r.id)} className="p-2 rounded-lg hover:bg-income/20 text-gray-500 hover:text-income transition-colors" title="Marcar como recebido">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => openEditRec(r)} className="p-2 rounded-lg hover:bg-brand-600/20 text-gray-500 hover:text-brand-400 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget({ type: 'receivable', id: r.id })} className="p-2 rounded-lg hover:bg-expense/10 text-gray-500 hover:text-expense transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal - Conta a Pagar */}
      <Modal open={showBillModal} onClose={() => setShowBillModal(false)} title={editBill ? 'Editar Conta' : 'Nova Conta a Pagar'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nome da conta *</label>
            <input className="input" placeholder="Ex: Aluguel, Internet, Netflix..."
              value={billForm.name} onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Valor (R$) *</label>
              <input className="input" type="number" step="0.01" placeholder="0,00"
                value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Dia do vencimento *</label>
              <input className="input" type="number" min="1" max="31"
                value={billForm.due_day} onChange={e => setBillForm(f => ({ ...f, due_day: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Cor</label>
            <div className="flex gap-2">
              {COLORS_PAY.map(c => (
                <button key={c} onClick={() => setBillForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-full transition-all', billForm.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-surface-card')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
              checked={billForm.is_recurring} onChange={e => setBillForm(f => ({ ...f, is_recurring: e.target.checked }))} />
            <span className="text-sm text-gray-400">Conta mensal recorrente</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowBillModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={saveBill} className="btn-primary flex-1">Salvar</button>
          </div>
        </div>
      </Modal>

      {/* Modal - Recebimento */}
      <Modal open={showRecModal} onClose={() => setShowRecModal(false)} title={editRec ? 'Editar Recebimento' : 'Novo Recebimento'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descrição *</label>
            <input className="input" placeholder="Ex: Salário cliente, Comissão..."
              value={recForm.name} onChange={e => setRecForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Valor (R$) *</label>
              <input className="input" type="number" step="0.01" placeholder="0,00"
                value={recForm.amount} onChange={e => setRecForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Data prevista *</label>
              <input className="input" type="date"
                value={recForm.due_date} onChange={e => setRecForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Observações</label>
            <input className="input" placeholder="Opcional..."
              value={recForm.notes} onChange={e => setRecForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Cor</label>
            <div className="flex gap-2">
              {COLORS_REC.map(c => (
                <button key={c} onClick={() => setRecForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-full transition-all', recForm.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-surface-card')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowRecModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={saveRec} className="btn-primary flex-1">Salvar</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover" size="sm">
        <p className="text-sm text-gray-400 mb-6">Tem certeza que deseja remover este item?</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Remover</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
