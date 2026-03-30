'use client'

import { useState } from 'react'
import { Lightbulb, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getAllTips } from '@/lib/utils'

export default function FinancialTipCard() {
  const tips = getAllTips()
  const [index, setIndex]     = useState(0)
  const [hidden, setHidden]   = useState(false)
  const tip = tips[index]

  if (hidden) return null

  return (
    <div className="card p-5 border-l-4" style={{ borderLeftColor: tip.color }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: `${tip.color}20` }}>
            <Lightbulb className="w-4.5 h-4.5" style={{ color: tip.color, width: '18px', height: '18px' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Dica do Dia</p>
            <h4 className="text-sm font-semibold text-white mb-1">{tip.title}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{tip.body}</p>
          </div>
        </div>
        <button onClick={() => setHidden(true)} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        <span className="text-xs text-gray-600">{index + 1} / {tips.length}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setIndex(i => (i - 1 + tips.length) % tips.length)}
            className="p-1 rounded-lg hover:bg-surface-hover text-gray-500 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setIndex(i => (i + 1) % tips.length)}
            className="p-1 rounded-lg hover:bg-surface-hover text-gray-500 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
