'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import type { HealthLog, HealthLogType } from '@/types'
import { Droplets, Dumbbell, Moon, Plus, Trash2, Bell, BellOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const WATER_GOAL = 8
const GYM_GOAL  = 3
const SLEEP_GOAL = 8

function startOfDay() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}
function startOfWeek() {
  const d = new Date()
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function SaudePage() {
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [sleepHours, setSleepHours] = useState('')
  const [showSleepInput, setShowSleepInput] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const deviceId = getDeviceId()
    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('device_id', deviceId)
      .gte('logged_at', startOfWeek())
      .order('logged_at', { ascending: false })
    setLogs((data ?? []) as HealthLog[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    setNotifEnabled('Notification' in window && Notification.permission === 'granted')
  }, [load])

  async function logHealth(type: HealthLogType, value = 1) {
    const supabase = createClient()
    const deviceId = getDeviceId()
    const { error } = await supabase.from('health_logs').insert({
      device_id: deviceId,
      type,
      value,
      logged_at: new Date().toISOString(),
    })
    if (error) { toast.error('Erro ao registrar'); return }
    const messages = { water: '💧 Copo de água registrado!', gym: '💪 Academia registrada!', sleep: `😴 ${value}h de sono registradas!` }
    toast.success(messages[type])
    load()
  }

  async function removeLog(id: string) {
    const supabase = createClient()
    await supabase.from('health_logs').delete().eq('id', id)
    load()
  }

  async function requestNotifications() {
    if (!('Notification' in window)) { toast.error('Seu browser não suporta notificações'); return }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      toast.success('Notificações ativadas!')
      scheduleWaterReminders()
    } else {
      toast.error('Permissão negada para notificações')
    }
  }

  function scheduleWaterReminders() {
    const now = new Date()
    const end = new Date(); end.setHours(21, 0, 0, 0)
    let next = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    if (next > end) return
    setTimeout(() => {
      new Notification('💧 Amigão 2.0 — Hora da água!', {
        body: 'Já bebeu água hoje? Beba um copo agora!',
        icon: '/icons/icon-192.png',
      })
    }, next.getTime() - now.getTime())
  }

  const todayWater  = logs.filter(l => l.type === 'water'  && l.logged_at >= startOfDay()).reduce((s, l) => s + l.value, 0)
  const todaySleep  = logs.filter(l => l.type === 'sleep'  && l.logged_at >= startOfDay()).reduce((s, l) => s + l.value, 0)
  const weekGym     = logs.filter(l => l.type === 'gym'    && l.logged_at >= startOfWeek()).length
  const recentLogs  = logs.slice(0, 20)

  const typeConfig = {
    water: { icon: Droplets, label: 'Água',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   emoji: '💧' },
    gym:   { icon: Dumbbell, label: 'Academia', color: 'text-brand-400', bg: 'bg-brand-600/10 border-brand-600/20', emoji: '💪' },
    sleep: { icon: Moon,     label: 'Sono',     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', emoji: '😴' },
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💪 Saúde</h1>
          <p className="text-sm text-gray-400">Cuide-se — você merece!</p>
        </div>
        <button onClick={notifEnabled ? undefined : requestNotifications}
          className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border',
            notifEnabled ? 'bg-brand-600/10 border-brand-600/30 text-brand-400' : 'btn-secondary')}>
          {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          {notifEnabled ? 'Notificações ativas' : 'Ativar lembretes'}
        </button>
      </div>

      {/* Cards de progresso */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Água */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Água hoje</p>
              <p className="text-xs text-gray-500">Meta: {WATER_GOAL} copos</p>
            </div>
          </div>
          {/* Progress ring */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1c2333" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#60a5fa" strokeWidth="12"
                  strokeDasharray={`${Math.min(100, (todayWater / WATER_GOAL) * 100) * 2.51} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{todayWater}</p>
                  <p className="text-xs text-gray-500">/{WATER_GOAL}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[1].map(n => (
              <button key={n} onClick={() => logHealth('water', n)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-all">
                <Plus className="w-3.5 h-3.5" /> 1 copo
              </button>
            ))}
            <button onClick={() => logHealth('water', 2)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-all">
              <Plus className="w-3.5 h-3.5" /> 2 copos
            </button>
          </div>
          {todayWater >= WATER_GOAL && (
            <p className="text-center text-xs text-blue-400 font-semibold mt-3">🎉 Meta atingida!</p>
          )}
        </div>

        {/* Academia */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Academia</p>
              <p className="text-xs text-gray-500">Meta: {GYM_GOAL}x/semana</p>
            </div>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1c2333" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#35976b" strokeWidth="12"
                  strokeDasharray={`${Math.min(100, (weekGym / GYM_GOAL) * 100) * 2.51} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{weekGym}</p>
                  <p className="text-xs text-gray-500">/{GYM_GOAL}x</p>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => logHealth('gym')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600/10 border border-brand-600/20 text-brand-400 text-sm font-semibold hover:bg-brand-600/20 transition-all">
            <Plus className="w-3.5 h-3.5" /> Registrar treino
          </button>
          {weekGym >= GYM_GOAL && (
            <p className="text-center text-xs text-brand-400 font-semibold mt-3">💪 Meta da semana atingida!</p>
          )}
        </div>

        {/* Sono */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sono hoje</p>
              <p className="text-xs text-gray-500">Meta: {SLEEP_GOAL}h</p>
            </div>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1c2333" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#a78bfa" strokeWidth="12"
                  strokeDasharray={`${Math.min(100, (todaySleep / SLEEP_GOAL) * 100) * 2.51} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{todaySleep}h</p>
                  <p className="text-xs text-gray-500">/{SLEEP_GOAL}h</p>
                </div>
              </div>
            </div>
          </div>
          {showSleepInput ? (
            <div className="flex gap-2">
              <input className="input text-center" type="number" min="1" max="24" step="0.5"
                placeholder="horas" value={sleepHours} onChange={e => setSleepHours(e.target.value)} />
              <button onClick={() => { if (sleepHours) { logHealth('sleep', parseFloat(sleepHours)); setShowSleepInput(false); setSleepHours('') } }}
                className="btn-primary px-3">OK</button>
            </div>
          ) : (
            <button onClick={() => setShowSleepInput(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold hover:bg-purple-500/20 transition-all">
              <Plus className="w-3.5 h-3.5" /> Registrar sono
            </button>
          )}
        </div>
      </div>

      {/* Dicas de saúde */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">💡 Dicas do Amigão</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { emoji: '💧', tip: 'Beba 1 copo de água assim que acordar. Hidratação matinal acelera o metabolismo.' },
            { emoji: '🏃', tip: 'Academia pela manhã aumenta a energia para o dia todo. Tente às 7h!' },
            { emoji: '😴', tip: '7-9h de sono por noite é essencial para foco, humor e saúde geral.' },
            { emoji: '🥗', tip: 'Que tal preparar refeições saudáveis no domingo para a semana toda?' },
          ].map((d, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-hover border border-surface-border">
              <span className="text-xl">{d.emoji}</span>
              <p className="text-xs text-gray-400 leading-relaxed">{d.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico recente */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-white">Histórico da Semana</h3>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
        ) : recentLogs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">Nenhum registro esta semana. Comece agora!</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentLogs.map(l => {
              const cfg = typeConfig[l.type]
              const Icon = cfg.icon
              return (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border', cfg.bg)}>
                    <Icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      {cfg.emoji} {cfg.label}
                      {l.type === 'water' ? ` — ${l.value} ${l.value === 1 ? 'copo' : 'copos'}` : ''}
                      {l.type === 'sleep' ? ` — ${l.value}h` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(l.logged_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      {' às '}
                      {new Date(l.logged_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => removeLog(l.id)} className="p-1.5 rounded-lg hover:bg-expense/10 text-gray-600 hover:text-expense transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
