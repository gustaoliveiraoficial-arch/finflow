'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { Wallet, WalletType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Pencil, Wallet as WalletIcon, TrendingUp } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'

const WALLET_TYPES: { value: WalletType; label: string; icon: string }[] = [
  { value: 'checking',   label: 'Conta Corrente',  icon: '🏦' },
  { value: 'savings',    label: 'Poupança',         icon: '💰' },
  { value: 'investment', label: 'Investimentos',    icon: '📈' },
  { value: 'cash',       label: 'Dinheiro Físico',  icon: '💵' },
  { value: 'business',   label: 'Conta Empresarial',icon: '🏢' },
  { value: 'credit',     label: 'Cartão de Crédito',icon: '💳' },
]

const COLORS = [
  '#35976b','#22d3a4','#818cf8','#f87171','#fbbf24','#60a5fa',
  '#f472b6','#34d399','#fb923c','#a78bfa','#e879f9','#38bdf8',
]

const defaultForm = {
  name: '', type: 'checking' as WalletType, color: '#35976b',
  balance: '', currency: 'BRL', description: '',
}

export default function WalletsPage() {
  const [wallets, setWallets]     = useState<Wallet[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editWallet, setEditWallet] = useState<Wallet | undefined>()
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(defaultForm)
  const supabase = createClient()

  async function loadWallets() {
    setLoading(true)
    const { data } = await supabase.from('wallets').select('*').order('created_at')
    setWallets(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadWallets() }, [])

  function openCreate() { setForm(defaultForm); setEditWallet(undefined); setShowModal(true) }
  function openEdit(w: Wallet) {
    setForm({ name: w.name, type: w.type, color: w.color, balance: w.balance.toString(), currency: w.currency, description: w.description ?? '' })
    setEditWallet(w)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    const payload = { ...form, balance: parseFloat(form.balance || '0') }
    try {
      if (editWallet) {
        const { error } = await supabase.from('wallets').update(payload).eq('id', editWallet.id)
        if (error) throw error
        toast.success('Carteira atualizada!')
      } else {
        const { error } = await supabase.from('wallets').insert(payload)
        if (error) throw error
        toast.success('Carteira criada!')
      }
      setShowModal(false)
      loadWallets()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('wallets').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Carteira excluída')
    setDeleteId(null)
    loadWallets()
  }

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0)

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Carteiras</h1>
          <p className="text-sm text-gray-400">Gerencie suas contas e fontes de renda</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Carteira
        </button>
      </div>

      {/* Total summary */}
      <div className="card p-5 mb-6 flex items-center justify-between bg-gradient-to-r from-brand-600/10 to-transparent border-brand-600/20">
        <div>
          <p className="text-sm text-gray-400">Patrimônio Total</p>
          <p className="text-3xl font-bold text-white tabular-nums mt-1">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-gray-500 mt-1">{wallets.length} carteiras ativas</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-brand-400" />
        </div>
      </div>

      {/* Wallet grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : wallets.length === 0 ? (
        <EmptyState icon={WalletIcon} title="Nenhuma carteira criada"
          description="Crie sua primeira carteira para começar a controlar seu dinheiro"
          action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Criar Carteira</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(w => {
            const typeInfo = WALLET_TYPES.find(t => t.value === w.type)
            return (
              <div key={w.id} className="card-hover p-5 group cursor-pointer"
                   style={{ borderTopColor: w.color, borderTopWidth: '3px' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                         style={{ backgroundColor: `${w.color}20` }}>
                      {typeInfo?.icon ?? '💼'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{w.name}</p>
                      <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(w)}
                      className="p-1.5 rounded-lg hover:bg-brand-600/20 text-gray-500 hover:text-brand-400 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(w.id)}
                      className="p-1.5 rounded-lg hover:bg-expense/10 text-gray-500 hover:text-expense transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(w.balance, w.currency)}</p>
                  {w.description && <p className="text-xs text-gray-500 mt-1 truncate">{w.description}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-surface-border">
                  <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                         style={{ width: `${Math.min(100, (w.balance / totalBalance) * 100)}%`, backgroundColor: w.color }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {totalBalance > 0 ? ((w.balance / totalBalance) * 100).toFixed(1) : 0}% do patrimônio
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editWallet ? 'Editar Carteira' : 'Nova Carteira'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nome *</label>
            <input className="input" placeholder="Ex: Nubank, Bradesco, Caixa..."
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Tipo</label>
              <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as WalletType }))}>
                {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Saldo Inicial (R$)</label>
              <input className="input" type="number" step="0.01" placeholder="0,00"
                value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-lg transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descrição</label>
            <input className="input" placeholder="Opcional..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : editWallet ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir carteira" size="sm">
        <p className="text-sm text-gray-400 mb-6">Tem certeza? Todas as transações desta carteira serão mantidas.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger flex-1">Excluir</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
