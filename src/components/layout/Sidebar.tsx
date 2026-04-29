'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CreditCard, Wallet, CheckSquare,
  Heart, Bot, Receipt, Menu, X, Bell
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, emoji: '🏠' },
  { href: '/financeiro',  label: 'Financeiro',   icon: CreditCard,      emoji: '💰' },
  { href: '/carteiras',   label: 'Carteiras',    icon: Wallet,          emoji: '💳' },
  { href: '/contas',      label: 'Contas',       icon: Receipt,         emoji: '📋' },
  { href: '/tarefas',     label: 'Tarefas',      icon: CheckSquare,     emoji: '✅' },
  { href: '/saude',       label: 'Saúde',        icon: Heart,           emoji: '💪' },
  { href: '/assistente',  label: 'Assistente IA',icon: Bot,             emoji: '🤖' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    async function loadUnread() {
      const deviceId = getDeviceId()
      const supabase = createClient()
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('device_id', deviceId)
        .eq('is_read', false)
      setUnread(count ?? 0)
    }
    loadUnread()
  }, [pathname])

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-surface-card/95 backdrop-blur border-b border-surface-border safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-sm">
            🤝
          </div>
          <span className="font-bold text-white">Amigão 2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/notificacoes" className="relative p-2 rounded-xl hover:bg-surface-hover text-gray-400">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-expense text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen(v => !v)} className="p-2 rounded-xl hover:bg-surface-hover text-gray-400">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-40 w-64 bg-surface-card border-r border-surface-border flex flex-col',
        'transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow text-xl">
            🤝
          </div>
          <div>
            <span className="font-bold text-white text-base">Amigão 2.0</span>
            <p className="text-xs text-gray-500">Assistente Pessoal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-600/30'
                    : 'text-gray-400 hover:bg-surface-hover hover:text-white'
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-brand-400' : 'text-gray-500')} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 pb-6 pt-4 border-t border-surface-border">
          <Link href="/notificacoes" onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-surface-hover hover:text-white transition-all">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              Notificações
            </div>
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-expense text-white text-xs font-bold rounded-full">{unread}</span>
            )}
          </Link>
        </div>
      </aside>
    </>
  )
}
