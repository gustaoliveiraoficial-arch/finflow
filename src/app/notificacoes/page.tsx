'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import type { Notification } from '@/types'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const typeIcon: Record<string, string> = {
  bill_due: '📅',
  receivable_due: '💰',
  task_reminder: '✅',
  health: '💪',
  system: '🔔',
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const deviceId = getDeviceId()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data ?? []) as Notification[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markAllRead() {
    const supabase = createClient()
    const deviceId = getDeviceId()
    await supabase.from('notifications').update({ is_read: true }).eq('device_id', deviceId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('Todas marcadas como lidas')
  }

  async function deleteNotification(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function clearAll() {
    const supabase = createClient()
    const deviceId = getDeviceId()
    await supabase.from('notifications').delete().eq('device_id', deviceId)
    setNotifications([])
    toast.success('Notificações limpas')
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🔔 Notificações</h1>
          <p className="text-sm text-gray-400">{unread > 0 ? `${unread} não lida(s)` : 'Tudo em dia!'}</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary gap-2">
              <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="btn-danger gap-2">
              <Trash2 className="w-4 h-4" /> Limpar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-1">Nenhuma notificação</p>
          <p className="text-gray-500 text-sm">Quando houver alertas de contas ou lembretes, eles aparecerão aqui.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-surface-border">
            {notifications.map(n => (
              <div key={n.id} className={cn('flex items-start gap-4 px-5 py-4 transition-colors', !n.is_read && 'bg-brand-600/5')}>
                <span className="text-2xl flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-semibold text-sm', n.is_read ? 'text-gray-400' : 'text-white')}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(n.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {' às '}
                    {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-2 flex-shrink-0" />}
                <button onClick={() => deleteNotification(n.id)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-expense hover:bg-expense/10 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
