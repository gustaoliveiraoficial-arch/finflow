'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function NotificationBell() {
  const [open, setOpen]                     = useState(false)
  const [notifications, setNotifications]   = useState<Notification[]>([])
  const unread = notifications.filter(n => !n.is_read).length
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
    // Real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const typeIcon: Record<string, string> = {
    bill_due: '📅', budget_alert: '⚠️', tip: '💡', system: '🔔'
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl hover:bg-surface-hover text-gray-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-600 text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 card z-40 animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <span className="text-sm font-semibold text-white">Notificações</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-surface-border">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">Nenhuma notificação</div>
              ) : notifications.map(n => (
                <div key={n.id} className={cn('px-4 py-3 text-sm transition-colors hover:bg-surface-hover', !n.is_read && 'bg-brand-600/5')}>
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-medium truncate', n.is_read ? 'text-gray-400' : 'text-white')}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-600 mt-1">{formatDate(n.created_at, 'long')}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
