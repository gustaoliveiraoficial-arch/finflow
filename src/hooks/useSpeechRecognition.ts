'use client'

import { useState, useRef, useCallback } from 'react'

// Minimal types for cross-browser Speech Recognition API
interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor
    webkitSpeechRecognition?: ISpeechRecognitionConstructor
  }
}

export interface SpeechResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript]   = useState('')
  const [error, setError]             = useState<string | null>(null)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const start = useCallback((onResult: (r: SpeechResult) => void) => {
    if (typeof window === 'undefined') return
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) { setError('Reconhecimento de voz não suportado neste navegador'); return }

    const recognition = new Ctor()
    recognition.lang            = 'pt-BR'
    recognition.continuous      = false
    recognition.interimResults  = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => { setIsListening(true); setError(null); setTranscript('') }
    recognition.onend   = () => setIsListening(false)
    recognition.onerror = (e) => { setError(`Erro: ${e.error}`); setIsListening(false) }
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      const alt    = result[0]
      setTranscript(alt.transcript)
      onResult({ transcript: alt.transcript, confidence: alt.confidence, isFinal: result.isFinal })
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, transcript, error, start, stop }
}
