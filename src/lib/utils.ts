import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'month' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  if (format === 'month') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  if (format === 'long')  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
  return daysInMonth - currentDay + dueDay
}

export function getMonthRange(offset = 0): { start: string; end: string } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

const TIPS: { title: string; body: string; icon: string; color: string }[] = [
  { title: 'Regra 50/30/20', body: 'Destine 50% para necessidades, 30% para desejos e 20% para poupança.', icon: 'pie-chart', color: '#35976b' },
  { title: 'Fundo de emergência', body: 'Mantenha pelo menos 6 meses de despesas guardados para imprevistos.', icon: 'shield', color: '#22d3a4' },
  { title: 'Automatize poupança', body: 'Configure transferências automáticas no dia do pagamento. O que não vê, não gasta.', icon: 'repeat', color: '#818cf8' },
  { title: 'Revise assinaturas', body: 'Cheque suas assinaturas mensais. Cancele as que não usa há mais de 30 dias.', icon: 'scissors', color: '#fbbf24' },
  { title: 'Compras à vista', body: 'Prefira pagar à vista e negociar desconto. Evite parcelamentos longos.', icon: 'credit-card', color: '#f87171' },
  { title: 'Meta de gastos', body: 'Defina um teto mensal para cada categoria e acompanhe semanalmente.', icon: 'target', color: '#60a5fa' },
]

export function getDailyTip(): typeof TIPS[0] {
  const day = new Date().getDate()
  return TIPS[day % TIPS.length]
}

export function getAllTips() { return TIPS }
