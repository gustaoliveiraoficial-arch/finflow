'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseVoiceOptions {
  onTranscript?: (text: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = Window & Record<string, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  const w = window as AnyWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useVoice({ onTranscript }: UseVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking,  setIsSpeaking]  = useState(false)
  const [supported,   setSupported]   = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef  = useRef<any>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])

  useEffect(() => {
    const SR = getSpeechRecognition()
    setSupported(!!(SR && typeof window !== 'undefined' && 'speechSynthesis' in window))
  }, [])

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) return

    const rec = new SR()
    rec.lang           = 'pt-BR'
    rec.continuous     = false
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onstart  = () => setIsListening(true)
    rec.onend    = () => setIsListening(false)
    rec.onerror  = () => setIsListening(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = (e.results[0]?.[0]?.transcript as string | undefined)?.trim()
      if (text) onTranscriptRef.current?.(text)
    }

    recognitionRef.current = rec
    rec.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    // Limpa markdown e emojis para fala mais natural
    const clean = text
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      // Remove emojis (range unicode)
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/[\u2600-\u27BF]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim()

    const utter = new SpeechSynthesisUtterance(clean)
    utter.lang   = 'pt-BR'
    utter.rate   = 1.05
    utter.pitch  = 1.0
    utter.volume = 1.0

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const ptVoice = voices.find(v => v.lang.startsWith('pt-BR') && !v.name.includes('Google'))
                   ?? voices.find(v => v.lang.startsWith('pt'))
      if (ptVoice) utter.voice = ptVoice
    }
    applyVoice()
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true })
    }

    utter.onstart = () => setIsSpeaking(true)
    utter.onend   = () => setIsSpeaking(false)
    utter.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utter)
  }, [])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { isListening, isSpeaking, supported, startListening, stopListening, speak, stopSpeaking }
}
