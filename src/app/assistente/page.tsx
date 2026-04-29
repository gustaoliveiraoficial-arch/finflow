'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { getDeviceId } from '@/hooks/useDeviceId'
import { useVoice } from '@/hooks/useVoice'
import { formatCurrency, getMonthRange } from '@/lib/utils'
import {
  Send, Bot, User, Loader2, Sparkles,
  Mic, MicOff, Volume2, VolumeX, Square,
  CheckCircle2, XCircle, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction, Bill, Task } from '@/types'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ActionResult {
  tool: string
  success: boolean
  description: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: ActionResult[]
}

// ── Ações rápidas ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: '💰 Como estão meus gastos?',       prompt: 'Como estão meus gastos esse mês? Me dá uma análise.' },
  { label: '📋 Tarefas mais urgentes',         prompt: 'Quais são minhas tarefas pendentes mais urgentes hoje?' },
  { label: '💪 Dica de saúde pra hoje',        prompt: 'Me dá uma dica de saúde prática para hoje.' },
  { label: '📅 Organiza meu dia',              prompt: 'Me ajuda a organizar meu dia de hoje com base nas minhas tarefas.' },
  { label: '💡 Como economizar mais?',         prompt: 'Analisando meus gastos, onde eu poderia economizar?' },
  { label: '⚠️ Contas próximas',              prompt: 'Quais contas estão próximas do vencimento?' },
]

// ── Nomes amigáveis das ferramentas ──────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  criar_tarefa:         'Tarefa criada',
  registrar_transacao:  'Transação registrada',
  registrar_saude:      'Saúde registrada',
  criar_conta_pagar:    'Conta a pagar cadastrada',
  criar_conta_receber:  'A receber cadastrado',
}

// ── Componente de card de ação ────────────────────────────────────────────────

function ActionCard({ action }: { action: ActionResult }) {
  return (
    <div className={cn(
      'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs mt-1',
      action.success
        ? 'bg-income/8 border-income/25 text-income'
        : 'bg-expense/8 border-expense/25 text-expense',
    )}>
      {action.success
        ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        : <XCircle     className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
      <div>
        <span className="font-semibold">{TOOL_LABELS[action.tool] ?? action.tool}:</span>{' '}
        <span className={action.success ? 'text-gray-300' : 'text-gray-400'}>{action.description}</span>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AssistentePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Oi, Gustavo! Sou o Amigão 2.0. Posso conversar, organizar sua agenda, registrar gastos e saúde — tudo direto da nossa conversa. Por texto ou por voz. O que você quer resolver hoje?',
    },
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [context, setContext]     = useState('')
  const [autoSpeak, setAutoSpeak] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const deviceId   = getDeviceId()

  // Quando transcrição chega, envia automaticamente
  const handleTranscript = useCallback((text: string) => {
    sendMessage(text)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    isListening, isSpeaking, supported: voiceSupported,
    startListening, stopListening, speak, stopSpeaking,
  } = useVoice({ onTranscript: handleTranscript })

  // ── Contexto ──────────────────────────────────────────────────────────────

  const buildContext = useCallback(async () => {
    const supabase = createClient()
    const { start, end } = getMonthRange()

    const [txRes, billsRes, tasksRes, walletsRes, healthRes, receivablesRes] = await Promise.all([
      supabase.from('transactions')
        .select('type, amount, description, date, category:categories(name)')
        .eq('device_id', deviceId)
        .gte('date', start).lte('date', end)
        .order('date', { ascending: false }).limit(30),
      supabase.from('bills').select('name, amount, due_day')
        .eq('device_id', deviceId).eq('is_active', true),
      supabase.from('tasks').select('title, priority, due_date, due_time, category, is_done')
        .eq('device_id', deviceId).eq('is_done', false)
        .order('due_date', { ascending: true }).limit(15),
      supabase.from('wallets').select('name, type, balance')
        .eq('device_id', deviceId).eq('is_active', true),
      supabase.from('health_logs').select('type, value, logged_at')
        .eq('device_id', deviceId)
        .gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('logged_at', { ascending: false }),
      supabase.from('receivables').select('name, amount, due_date')
        .eq('device_id', deviceId).eq('is_received', false)
        .gte('due_date', new Date().toISOString().slice(0, 10))
        .order('due_date', { ascending: true }).limit(5),
    ])

    const txList      = (txRes.data ?? []) as unknown as Transaction[]
    const bills       = (billsRes.data ?? []) as unknown as Bill[]
    const tasks       = (tasksRes.data ?? []) as unknown as Task[]
    const wallets     = walletsRes.data ?? []
    const health      = healthRes.data ?? []
    const receivables = receivablesRes.data ?? []

    const totalBalance   = wallets.reduce((s, w) => s + (w.balance ?? 0), 0)
    const monthlyIncome  = txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const monthlyExpense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const catMap = new Map<string, number>()
    txList.filter(t => t.type === 'expense').forEach(t => {
      const cat = (t.category as unknown as { name?: string })?.name ?? 'Outros'
      catMap.set(cat, (catMap.get(cat) ?? 0) + t.amount)
    })
    const topExpenses = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)

    const today     = new Date()
    const todayStr  = today.toISOString().slice(0, 10)
    const todayNum  = today.getDate()
    const urgentBills = bills.filter(b => {
      const days = b.due_day >= todayNum ? b.due_day - todayNum : 30 - todayNum + b.due_day
      return days <= 7
    })

    const todayWater = health.filter(h => h.type === 'water' && h.logged_at >= todayStr).reduce((s, h) => s + (h.value ?? 0), 0)
    const weekGym    = health.filter(h => h.type === 'gym').length
    const lastSleep  = health.find(h => h.type === 'sleep')
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < todayStr)
    const todayTasks   = tasks.filter(t => t.due_date === todayStr)

    setContext(`
DATA E HORA: ${today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} às ${today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

CARTEIRAS:
${wallets.map(w => `- ${w.name} (${w.type}): ${formatCurrency(w.balance ?? 0)}`).join('\n') || '- Nenhuma'}
SALDO TOTAL: ${formatCurrency(totalBalance)}

FINANÇAS DO MÊS:
- Entradas: ${formatCurrency(monthlyIncome)} | Gastos: ${formatCurrency(monthlyExpense)} | Sobra: ${formatCurrency(monthlyIncome - monthlyExpense)}

MAIORES GASTOS:
${topExpenses.map(([cat, val]) => `- ${cat}: ${formatCurrency(val)}`).join('\n') || '- Sem dados'}

ÚLTIMAS TRANSAÇÕES:
${txList.slice(0, 5).map(t => `- ${t.description} (${(t.category as unknown as { name?: string })?.name ?? '?'}): ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)} em ${t.date}`).join('\n') || '- Nenhuma'}

CONTAS A PAGAR (urgentes em 7 dias):
${urgentBills.length > 0 ? urgentBills.map(b => `- ${b.name}: ${formatCurrency(b.amount)} dia ${b.due_day}`).join('\n') : '- Nenhuma urgente'}

A RECEBER:
${receivables.length > 0 ? receivables.map(r => `- ${r.name}: ${formatCurrency(r.amount)} (${r.due_date})`).join('\n') : '- Nenhum'}

TAREFAS ATRASADAS (${overdueTasks.length}):
${overdueTasks.slice(0, 5).map(t => `- [${t.priority}] ${t.title}`).join('\n') || '- Nenhuma'}

TAREFAS DE HOJE (${todayTasks.length}):
${todayTasks.map(t => `- [${t.priority}] ${t.title}${t.due_time ? ` às ${t.due_time}` : ''}`).join('\n') || '- Nenhuma'}

PRÓXIMAS TAREFAS:
${tasks.filter(t => !t.due_date || t.due_date > todayStr).slice(0, 5).map(t => `- [${t.priority}] ${t.title}${t.due_date ? ` (${t.due_date})` : ''}`).join('\n') || '- Nenhuma'}

SAÚDE:
- Água hoje: ${todayWater} copos (meta: 8) | Academia esta semana: ${weekGym}x (meta: 3x) | Último sono: ${lastSleep ? `${lastSleep.value}h` : 'não registrado'}
`.trim())
  }, [deviceId])

  useEffect(() => { buildContext() }, [buildContext])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Enviar mensagem ───────────────────────────────────────────────────────

  async function sendMessage(userMessage?: string) {
    const text = (userMessage ?? input).trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:  newMessages.map(m => ({ role: m.role, content: m.content })),
          context,
          device_id: deviceId,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const reply   = data.message as string
      const actions = (data.actions ?? []) as ActionResult[]

      setMessages(prev => [...prev, { role: 'assistant', content: reply, actions }])

      // Após ações, atualiza contexto automaticamente
      if (actions.some(a => a.success)) {
        setTimeout(() => buildContext(), 800)
      }

      if (autoSpeak) speak(reply)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😕 Ops! Tive um problema. Verifique se a chave do Groq está no .env.local',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function toggleMic() {
    if (isListening) stopListening()
    else { if (isSpeaking) stopSpeaking(); startListening() }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-surface-border mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow text-lg">
            🤝
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Amigão 2.0</h1>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isListening ? 'bg-red-400 animate-ping' : isSpeaking ? 'bg-yellow-400 animate-pulse' : 'bg-income animate-pulse-slow',
              )} />
              <p className="text-xs text-gray-400">
                {isListening ? 'Ouvindo...' : isSpeaking ? 'Falando...' : 'Online — age no app por você'}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Indicador de autonomia */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-600/10 border border-brand-600/20">
              <Zap className="w-3 h-3 text-brand-400" />
              <span className="text-xs text-brand-400 font-medium">Autônomo</span>
            </div>

            {voiceSupported && (
              <button
                onClick={() => setAutoSpeak(v => !v)}
                title={autoSpeak ? 'Desativar voz' : 'Ativar resposta em voz'}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  autoSpeak
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                    : 'hover:bg-surface-hover text-gray-500 hover:text-gray-300',
                )}
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={buildContext}
              className="p-2 rounded-xl hover:bg-surface-hover text-gray-500 hover:text-brand-400 transition-colors"
              title="Atualizar contexto"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ações rápidas — só na primeira mensagem */}
        {messages.length <= 1 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-brand-400" />
              Posso agir diretamente: fale um gasto, tarefa, treino... e eu registro pra você.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((a, i) => (
                <button key={i} onClick={() => sendMessage(a.prompt)}
                  className="text-left px-3 py-2.5 rounded-xl border border-surface-border bg-surface-hover hover:border-brand-600/50 hover:bg-brand-600/5 transition-all text-xs text-gray-400 hover:text-white">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                m.role === 'assistant' ? 'bg-brand-600/20 text-brand-400' : 'bg-surface-hover text-gray-400',
              )}>
                {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className="max-w-[80%] group relative">
                {/* Bolha de mensagem */}
                <div className={cn(
                  'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'assistant'
                    ? 'bg-surface-card border border-surface-border text-white rounded-tl-sm'
                    : 'bg-brand-600 text-white rounded-tr-sm',
                )}>
                  {m.content}
                </div>

                {/* Cards de ações executadas */}
                {m.actions && m.actions.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {m.actions.map((action, j) => (
                      <ActionCard key={j} action={action} />
                    ))}
                  </div>
                )}

                {/* Botão de ouvir */}
                {m.role === 'assistant' && voiceSupported && (
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : speak(m.content)}
                    className="absolute -bottom-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-surface-hover text-gray-500 hover:text-brand-400 transition-all"
                    title={isSpeaking ? 'Parar' : 'Ouvir'}
                  >
                    {isSpeaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-brand-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-card border border-surface-border flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                <span className="text-xs text-gray-500">Processando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="pt-4 border-t border-surface-border mt-4">
          {isListening && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span className="text-xs text-red-400">Ouvindo...</span>
              <button onClick={stopListening} className="ml-auto text-red-400 hover:text-red-300 text-xs">cancelar</button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              className="input flex-1 resize-none min-h-[44px] max-h-32"
              placeholder='Ex: "gastei 15 reais no café" ou "tenho reunião amanhã às 10h"'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isListening}
              style={{ height: 'auto' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`
              }}
            />

            {voiceSupported && (
              <button
                onClick={toggleMic}
                disabled={loading}
                title={isListening ? 'Parar' : 'Falar'}
                className={cn(
                  'px-3 py-3 rounded-xl flex-shrink-0 transition-all',
                  isListening
                    ? 'bg-red-500 text-white shadow-lg scale-105'
                    : 'bg-surface-hover text-gray-400 hover:text-white hover:bg-surface-border disabled:opacity-40',
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading || isListening}
              className="btn-primary px-4 py-3 rounded-xl flex-shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600 mt-2 text-center">
            Fale naturalmente — o Amigão age no app por você
            {voiceSupported && ' · Microfone disponível'}
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
