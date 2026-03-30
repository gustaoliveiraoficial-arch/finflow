'use client'

import { getDaysUntilDue, formatCurrency } from '@/lib/utils'
import type { Bill } from '@/types'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface UpcomingBillsProps {
  bills: Bill[]
}

export default function UpcomingBills({ bills }: UpcomingBillsProps) {
  const sorted = [...bills]
    .filter(b => b.is_active)
    .map(b => ({ ...b, daysLeft: getDaysUntilDue(b.due_day) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Próximas Contas</h3>
        <span className="text-xs text-gray-500">{sorted.length} pendentes</span>
      </div>

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-income opacity-60" />
          Nenhuma conta próxima
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(bill => {
            const urgent = bill.daysLeft <= 3
            const soon   = bill.daysLeft <= 7
            return (
              <div key={bill.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover hover:bg-surface-border/50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bill.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{bill.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {urgent ? <AlertCircle className="w-3 h-3 text-expense" /> :
                     soon   ? <Clock className="w-3 h-3 text-warning" /> :
                              <Clock className="w-3 h-3 text-gray-500" />}
                    <span className={cn(
                      'text-xs',
                      urgent ? 'text-expense font-medium' :
                      soon   ? 'text-warning' : 'text-gray-500'
                    )}>
                      {bill.daysLeft === 0 ? 'Vence hoje!' :
                       bill.daysLeft === 1 ? 'Vence amanhã' :
                       `Vence em ${bill.daysLeft} dias`}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white tabular-nums flex-shrink-0">
                  {formatCurrency(bill.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
