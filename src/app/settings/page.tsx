'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Bell, BellOff, Smartphone, Info } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { permission, subscribed, subscribe } = usePushNotifications()
  const [billsAlert, setBillsAlert]           = useState(true)
  const [budgetAlert, setBudgetAlert]         = useState(true)
  const [weeklyReport, setWeeklyReport]       = useState(true)

  async function handleEnableNotifications() {
    await subscribe()
    toast.success('Notificações ativadas!')
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-sm text-gray-400">Personalize sua experiência no FinFlow</p>
        </div>

        {/* Notifications */}
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-1">Notificações</h2>
          <p className="text-sm text-gray-500 mb-5">Configure alertas e lembretes</p>

          {/* Push permission */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-hover border border-surface-border mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subscribed ? 'bg-brand-600/20' : 'bg-surface-border'}`}>
                {subscribed ? <Bell className="w-5 h-5 text-brand-400" /> : <BellOff className="w-5 h-5 text-gray-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">Notificações Push</p>
                <p className="text-xs text-gray-500">
                  {subscribed ? 'Ativas — receba alertas no celular' :
                   permission === 'denied' ? 'Bloqueado — habilite nas configurações do navegador' :
                   'Desativadas — clique para ativar'}
                </p>
              </div>
            </div>
            {!subscribed && permission !== 'denied' && (
              <button onClick={handleEnableNotifications} className="btn-primary text-xs px-3 py-2">
                Ativar
              </button>
            )}
          </div>

          {/* PWA Install */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-600/5 border border-brand-600/20">
            <Smartphone className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Instalar como App</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                No celular: abra o menu do navegador e toque em <strong>"Adicionar à tela inicial"</strong>.
                No desktop: clique no ícone de instalação na barra de endereço.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { label: 'Contas próximas do vencimento', sub: 'Aviso 3 dias antes', state: billsAlert, set: setBillsAlert },
              { label: 'Alerta de orçamento',           sub: 'Quando ultrapassar 80% do limite', state: budgetAlert, set: setBudgetAlert },
              { label: 'Relatório semanal',             sub: 'Todo domingo às 09h', state: weeklyReport, set: setWeeklyReport },
            ].map(({ label, sub, state, set }) => (
              <div key={label} className="flex items-center justify-between py-3 border-t border-surface-border">
                <div>
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
                <button onClick={() => set(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${state ? 'bg-brand-600' : 'bg-surface-border'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${state ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Info */}
        <section className="card p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Sobre o FinFlow</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                FinFlow v0.1.0 — Seu controle financeiro pessoal. Dados armazenados no Supabase com criptografia.
                Funciona offline como PWA instalável no celular e desktop.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
