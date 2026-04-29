'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import type { Task, TaskPriority, TaskCategory } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, Pencil, CheckSquare, Square, Clock, Filter } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high',   label: '🔴 Alta',  color: 'text-expense' },
  { value: 'medium', label: '🟡 Média', color: 'text-warning' },
  { value: 'low',    label: '🟢 Baixa', color: 'text-income' },
]

const CATEGORIES: { value: TaskCategory; label: string; emoji: string }[] = [
  { value: 'pessoal',    label: 'Pessoal',    emoji: '👤' },
  { value: 'trabalho',   label: 'Trabalho',   emoji: '💼' },
  { value: 'saude',      label: 'Saúde',      emoji: '💪' },
  { value: 'financeiro', label: 'Financeiro', emoji: '💰' },
  { value: 'outro',      label: 'Outro',      emoji: '📌' },
]

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  due_time: '',
  priority: 'medium' as TaskPriority,
  category: 'pessoal' as TaskCategory,
}

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('pending')
  const [filterCat, setFilterCat] = useState<TaskCategory | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const deviceId = getDeviceId()
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('device_id', deviceId)
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
    setTasks((data ?? []) as Task[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditTask(undefined)
    setForm(emptyForm)
    setShowModal(true)
  }
  function openEdit(t: Task) {
    setEditTask(t)
    setForm({
      title: t.title,
      description: t.description ?? '',
      due_date: t.due_date ?? '',
      due_time: t.due_time ? t.due_time.slice(0, 5) : '',
      priority: t.priority,
      category: t.category,
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Informe o título da tarefa'); return }
    const supabase = createClient()
    const deviceId = getDeviceId()
    const payload = {
      device_id: deviceId,
      title: form.title.trim(),
      description: form.description || null,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      priority: form.priority,
      category: form.category,
    }
    if (editTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editTask.id)
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Tarefa atualizada!')
    } else {
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Tarefa criada!')
    }
    setShowModal(false); load()
  }

  async function toggleDone(t: Task) {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ is_done: !t.is_done }).eq('id', t.id)
    if (error) { toast.error('Erro'); return }
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', deleteId)
    toast.success('Tarefa removida')
    setDeleteId(null); load()
  }

  const filtered = tasks.filter(t => {
    const matchStatus = filterStatus === 'all' || (filterStatus === 'pending' ? !t.is_done : t.is_done)
    const matchCat    = filterCat === 'all' || t.category === filterCat
    return matchStatus && matchCat
  })

  const pending = tasks.filter(t => !t.is_done).length
  const done    = tasks.filter(t => t.is_done).length

  const catEmoji = (cat: TaskCategory) => CATEGORIES.find(c => c.value === cat)?.emoji ?? '📌'

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">✅ Tarefas</h1>
          <p className="text-sm text-gray-400">{pending} pendentes · {done} concluídas</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-surface-hover rounded-xl border border-surface-border">
          {(['pending', 'all', 'done'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {s === 'all' ? 'Todas' : s === 'pending' ? 'Pendentes' : 'Feitas'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-surface-hover rounded-xl border border-surface-border">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterCat === 'all' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Filter className="w-3 h-3 inline mr-1" />Todas
          </button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilterCat(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterCat === c.value ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">Nenhuma tarefa aqui</p>
          <p className="text-gray-500 text-sm mb-4">Que tal criar uma nova tarefa?</p>
          <button onClick={openNew} className="btn-primary mx-auto"><Plus className="w-4 h-4" /> Criar tarefa</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const isOverdue = t.due_date && !t.is_done && new Date(t.due_date) < new Date()
            return (
              <div key={t.id} className={cn(
                'card p-4 flex items-start gap-3 transition-all',
                t.is_done && 'opacity-50',
                isOverdue && 'border-expense/40'
              )}>
                <button onClick={() => toggleDone(t)} className="mt-0.5 flex-shrink-0 transition-colors">
                  {t.is_done
                    ? <CheckSquare className="w-5 h-5 text-brand-400" />
                    : <Square className="w-5 h-5 text-gray-500 hover:text-brand-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{catEmoji(t.category)}</span>
                    <p className={cn('font-medium text-sm', t.is_done ? 'line-through text-gray-500' : 'text-white')}>
                      {t.title}
                    </p>
                    <span className={cn('text-xs font-semibold',
                      t.priority === 'high' ? 'text-expense' : t.priority === 'medium' ? 'text-warning' : 'text-gray-500'
                    )}>
                      {t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'}
                    </span>
                    {isOverdue && <span className="text-xs text-expense font-semibold">Atrasada</span>}
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  {(t.due_date || t.due_time) && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <p className={cn('text-xs', isOverdue ? 'text-expense' : 'text-gray-500')}>
                        {t.due_date && formatDate(t.due_date)}{t.due_time ? ` às ${t.due_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-brand-600/20 text-gray-500 hover:text-brand-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded-lg hover:bg-expense/10 text-gray-500 hover:text-expense transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTask ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Título *</label>
            <input className="input" placeholder="O que precisa ser feito?"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descrição</label>
            <textarea className="input resize-none" rows={2} placeholder="Detalhes opcionais..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Data</label>
              <input className="input" type="date"
                value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Horário</label>
              <input className="input" type="time"
                value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Prioridade</label>
              <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Categoria</label>
              <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TaskCategory }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={save} className="btn-primary flex-1">Salvar</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir tarefa" size="sm">
        <p className="text-sm text-gray-400 mb-6">Deseja realmente excluir esta tarefa?</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Excluir</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
