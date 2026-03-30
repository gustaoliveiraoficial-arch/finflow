// FinFlow — Tipos globais

export type WalletType = 'checking' | 'savings' | 'investment' | 'cash' | 'business' | 'credit'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense'
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type NotificationType = 'bill_due' | 'budget_alert' | 'tip' | 'system'
export type VoiceLogStatus = 'pending' | 'processed' | 'failed'

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: WalletType
  color: string
  icon: string
  balance: number
  currency: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id?: string
  name: string
  type: CategoryType
  icon: string
  color: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  category_id?: string
  type: TransactionType
  amount: number
  description: string
  date: string
  is_recurring: boolean
  recurrence?: RecurrenceType
  recurrence_end?: string
  is_paid: boolean
  notes?: string
  source: 'manual' | 'voice' | 'import'
  created_at: string
  updated_at: string
  // joins
  wallet?: Wallet
  category?: Category
}

export interface Bill {
  id: string
  user_id: string
  category_id?: string
  name: string
  amount: number
  due_day: number
  is_recurring: boolean
  is_active: boolean
  color: string
  created_at: string
  updated_at: string
  category?: Category
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
}

export interface VoiceLog {
  id: string
  user_id: string
  transcript: string
  parsed?: ParsedVoice
  transaction_id?: string
  status: VoiceLogStatus
  created_at: string
}

export interface ParsedVoice {
  type?: TransactionType
  amount?: number
  description?: string
  category?: string
  wallet?: string
  date?: string
  confidence: number
}

// Dashboard summary
export interface DashboardSummary {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  savingsRate: number
  upcomingBills: Bill[]
  recentTransactions: Transaction[]
  expenseByCategory: { category: string; amount: number; color: string }[]
  balanceTrend: { date: string; balance: number }[]
}

export interface FinancialTip {
  id: string
  title: string
  body: string
  icon: string
  color: string
}
