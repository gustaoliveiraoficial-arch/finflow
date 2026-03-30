import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  change?: number
  icon: LucideIcon
  variant?: 'default' | 'income' | 'expense' | 'neutral'
  subtitle?: string
}

export default function StatCard({ label, value, change, icon: Icon, variant = 'default', subtitle }: StatCardProps) {
  const colors = {
    default: { bg: 'bg-brand-600/10', border: 'border-brand-600/20', icon: 'text-brand-400' },
    income:  { bg: 'bg-income/10',    border: 'border-income/20',    icon: 'text-income' },
    expense: { bg: 'bg-expense/10',   border: 'border-expense/20',   icon: 'text-expense' },
    neutral: { bg: 'bg-surface-hover', border: 'border-surface-border', icon: 'text-gray-400' },
  }[variant]

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 font-medium">{label}</span>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colors.bg, 'border', colors.border)}>
          <Icon className={cn('w-4.5 h-4.5', colors.icon)} style={{ width: '18px', height: '18px' }} />
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-white tabular-nums">
          {formatCurrency(value)}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          change >= 0 ? 'text-income' : 'text-expense'
        )}>
          {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% vs mês anterior</span>
        </div>
      )}
    </div>
  )
}
