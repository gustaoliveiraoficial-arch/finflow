'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { parseVoiceTranscript, voiceConfidenceLabel, detectWalletCreation } from '@/lib/voiceParser'
import { createClient } from '@/lib/supabase/client'
import type { ParsedVoice, Wallet, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Mic, MicOff, Send, RotateCcw, CheckCircle2, AlertCircle, Wallet as WalletIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'system'
  text: string
  parsed?: ParsedVoice
  saved?: boolean
  isWalletCreation?: boolean
  timestamp: Date
}

const EXAMPLES = [
  'Gastei 50 reais no mercado hoje',
  'Recebi 3000 de salário',
  'Paguei 120 de conta de luz',
  'Nova carteira Negócios',
  'Entrou 500 de freelance',
]

export default function VoicePage() {
  const [messages, setMessages]             = useState<Message[]>([])
  const [wallets, setWallets]               = useState<Wallet[]>([])
  const [categories, setCategories]         = useState<Category[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [inputText, setInputText]           = useState('')
  const [saving, setSaving]                 = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  const { isListening, transcript, error: speechError, start, stop } = useSpeechRecognition()

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: c }] = await Promise.all([
        supabase.from('wallets').select('*').eq('is_active', true),
        supabase.from('categories').select('*'),
      ])
      setWallets(w ?? [])
      setCategories(c ?? [])
      if (w?.length) setSelectedWallet(w[0].id)
    }
    load()

    setMessages([{
      id: '0', role: 'system',
      text: 'Olá! Diga ou escreva uma transação.\nExemplo: "Gastei 50 no mercado" ou "Nova carteira Negócios"',
      timestamp: new Date(),
    }])
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleVoiceResult(t: string) {
    if (!t.trim()) return
    processInput(t)
  }

  async function processInput(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    const msgId = Date.now().toString()

    // 1. Check for wallet creation intent first
    const walletIntent = detectWalletCreation(trimmed)
    if (walletIntent) {
      setMessages(prev => [
        ...prev,
        { id: msgId + '-u', role: 'user', text: trimmed, timestamp: new Date() },
        {
          id: msgId + '-s', role: 'system',
          text: `Criar carteira **"${walletIntent.name}"**${walletIntent.initialBalance ? ` com saldo inicial de ${formatCurrency(walletIntent.initialBalance)}` : ''}`,
          isWalletCreation: true,
          saved: false,
          timestamp: new Date(),
          parsed: { type: 'expense', amount: walletIntent.initialBalance, description: walletIntent.name, confidence: 0.95 },
        },
      ])
      setInputText('')

      // Auto-create wallet
      await createWallet(msgId + '-s', walletIntent.name, walletIntent.initialBalance ?? 0)
      return
    }

    // 2. Parse as transaction
    const parsed = parseVoiceTranscript(trimmed)

    // Ensure we have a wallet — create default if none
    let walletId = selectedWallet
    if (!walletId && wallets.length === 0) {
      walletId = await ensureDefaultWallet()
    }

    setMessages(prev => [
      ...prev,
      { id: msgId + '-u', role: 'user', text: trimmed, timestamp: new Date() },
      {
        id: msgId + '-s', role: 'system',
        text: buildResponseText(parsed),
        parsed,
        saved: false,
        timestamp: new Date(),
      },
    ])
    setInputText('')

    // Auto-save when confidence is high (amount + type detected)
    if (parsed.confidence >= 0.9 && parsed.amount && walletId) {
      await saveTransaction(msgId + '-s', parsed, walletId, true)
    }
  }

  async function ensureDefaultWallet(): Promise<string> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return ''

    const { data, error } = await supabase.from('wallets').insert({
      name: 'Carteira Principal',
      type: 'checking',
      balance: 0,
      color: '#35976b',
      currency: 'BRL',
      is_active: true,
    }).select().single()

    if (error || !data) return ''
    setWallets(prev => [...prev, data])
    setSelectedWallet(data.id)
    toast('Carteira Principal criada automaticamente', { icon: '💳' })
    return data.id
  }

  async function createWallet(msgId: string, name: string, initialBalance: number) {
    setSaving(msgId)
    try {
      const { data, error } = await supabase.from('wallets').insert({
        name,
        type: 'checking',
        balance: initialBalance,
        color: '#35976b',
        currency: 'BRL',
        is_active: true,
      }).select().single()

      if (error) throw error

      setWallets(prev => [...prev, data])
      if (!selectedWallet) setSelectedWallet(data.id)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saved: true } : m))
      toast.success(`Carteira "${name}" criada!`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar carteira')
    } finally {
      setSaving(null)
    }
  }

  function buildResponseText(p: ParsedVoice): string {
    const { label } = voiceConfidenceLabel(p.confidence)
    const parts = [
      `Entendi: **${p.type === 'income' ? 'Entrada' : 'Saída'}** de **${p.amount ? formatCurrency(p.amount) : 'valor não identificado'}**`,
      p.description && `Descrição: ${p.description}`,
      p.category    && `Categoria: ${p.category}`,
      `Confiança: ${label}`,
    ].filter(Boolean)
    return parts.join('\n')
  }

  async function saveTransaction(msgId: string, parsed: ParsedVoice, walletId?: string, auto = false) {
    const wid = walletId ?? selectedWallet

    if (!parsed.amount) {
      toast.error('Valor não identificado. Tente: "Gastei 50 no mercado"')
      return
    }
    if (!wid) {
      toast.error('Nenhuma carteira disponível. Crie uma primeiro.')
      return
    }

    setSaving(msgId)
    try {
      const category = categories.find(c => c.name === parsed.category)
      const wallet   = wallets.find(w => w.id === wid)

      const { error } = await supabase.from('transactions').insert({
        type:        parsed.type ?? 'expense',
        amount:      parsed.amount,
        description: parsed.description ?? 'Transação por voz',
        date:        parsed.date ?? new Date().toISOString().slice(0, 10),
        wallet_id:   wid,
        category_id: category?.id ?? null,
        source:      'voice',
        is_paid:     true,
      })
      if (error) throw error

      if (wallet) {
        const delta = parsed.type === 'income' ? parsed.amount : -parsed.amount
        await supabase.from('wallets').update({ balance: wallet.balance + delta }).eq('id', wallet.id)
        setWallets(prev => prev.map(w => w.id === wid ? { ...w, balance: w.balance + delta } : w))
      }

      await supabase.from('voice_logs').insert({
        transcript: messages.find(m => m.id === msgId.replace('-s', '-u'))?.text ?? '',
        parsed,
        status: 'processed',
      })

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saved: true } : m))
      toast.success(auto ? '✅ Registrado automaticamente!' : 'Transação salva!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Chat de Voz</h1>
          <p className="text-sm text-gray-400">Dite ou escreva — o FinFlow registra automaticamente</p>
        </div>

        {/* Wallet selector */}
        <div className="card p-4 mb-4 flex items-center gap-3">
          <WalletIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="text-sm text-gray-400 flex-shrink-0">Carteira:</label>
          {wallets.length === 0 ? (
            <span className="text-sm text-gray-500 italic flex-1">Nenhuma carteira — será criada automaticamente</span>
          ) : (
            <select className="select flex-1 py-2" value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)}>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} — {formatCurrency(w.balance)}</option>)}
            </select>
          )}
        </div>

        {/* Messages */}
        <div className="card overflow-hidden mb-4">
          <div className="h-96 overflow-y-auto p-4 space-y-3 flex flex-col">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-xs rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-surface-hover text-gray-300 rounded-tl-sm'
                )}>
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{
                      __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    }} />
                  ))}

                  {/* Manual save button — only shown when not auto-saved */}
                  {msg.parsed && !msg.saved && !msg.isWalletCreation && (
                    <button
                      onClick={() => saveTransaction(msg.id, msg.parsed!)}
                      disabled={saving === msg.id}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 text-xs font-semibold transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {saving === msg.id ? 'Salvando...' : 'Confirmar e Salvar'}
                    </button>
                  )}

                  {msg.saved && (
                    <div className="mt-2 flex items-center gap-1.5 text-income text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Salvo!
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isListening && transcript && (
              <div className="flex justify-end">
                <div className="max-w-xs rounded-2xl px-4 py-3 bg-brand-600/50 text-white text-sm italic">
                  {transcript}...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {speechError && (
          <div className="flex items-center gap-2 text-sm text-expense mb-3 px-2">
            <AlertCircle className="w-4 h-4" /> {speechError}
          </div>
        )}

        {/* Examples */}
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => processInput(ex)}
              className="text-xs px-3 py-1.5 rounded-lg bg-surface-hover border border-surface-border text-gray-400 hover:text-white hover:border-brand-600/30 transition-all">
              {ex}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              className="input pr-12"
              placeholder="Digite uma transação ou use o microfone..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && inputText.trim()) processInput(inputText) }}
            />
            {inputText && (
              <button onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {inputText ? (
            <button onClick={() => processInput(inputText)} className="btn-primary px-5">
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => isListening ? stop() : start(r => r.isFinal && handleVoiceResult(r.transcript))}
              className={cn(
                'px-5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2',
                isListening
                  ? 'bg-expense text-white animate-pulse-slow'
                  : 'btn-primary'
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isListening ? 'Parar' : 'Falar'}
            </button>
          )}
        </div>

        <p className="text-xs text-center text-gray-600 mt-3">
          Alta confiança = registro automático · Baixa confiança = confirmação manual
        </p>
      </div>
    </AppLayout>
  )
}
