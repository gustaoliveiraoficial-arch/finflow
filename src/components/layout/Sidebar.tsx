'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CreditCard, Wallet, MessageCircle,
  Bell, Settings, TrendingUp, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/dashboard/NotificationBell'

const nav = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/expenses',  label: 'Gastos',      icon: CreditCard },
  { href: '/wallets',   label: 'Carteiras',   icon: Wallet },
  { href: '/voice',     label: 'Chat de Voz', icon: MessageCircle },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen]     = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-surface-card/90 backdrop-blur border-b border-surface-border safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">FinFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-surface-hover text-gray-400">
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg">FinFlow</span>
            <p className="text-xs text-gray-500">Controle Financeiro</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
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
        <div className="px-3 pb-6 space-y-1 border-t border-surface-border pt-3">
          <Link href="/settings" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-surface-hover hover:text-white transition-all">
            <Settings className="w-5 h-5 text-gray-500" /> Configurações
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-expense/10 hover:text-expense transition-all">
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>
    </>
  )
}
