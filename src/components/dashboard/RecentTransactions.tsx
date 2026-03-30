import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'
import { ArrowRight } from 'lucide-react'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Transações Recentes</h3>
        <Link href="/expenses" className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">Nenhuma transação neste mês</div>
      ) : (
        <div className="space-y-1">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                   style={{ backgroundColor: `${t.category?.color ?? '#94a3b8'}20` }}>
                {t.source === 'voice' ? '🎙️' : t.type === 'income' ? '💰' : '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{t.description}</p>
                <p className="text-xs text-gray-500">
                  {t.category?.name ?? 'Sem categoria'} · {formatDate(t.date)}
                </p>
              </div>
              <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
