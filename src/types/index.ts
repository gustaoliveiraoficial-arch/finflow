// Amigão 2.0 — Tipos globais

export type WalletType = 'checking' | 'savings' | 'investment' | 'cash' | 'business' | 'credit'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense'
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskCategory = 'pessoal' | 'trabalho' | 'saude' | 'financeiro' | 'outro'
export type HealthLogType = 'water' | 'gym' | 'sleep'
export type NotificationType = 'bill_due' | 'receivable_due' | 'task_reminder' | 'health' | 'system'

export interface Wallet {
  id: string
  device_id: string
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
  device_id?: string
  name: string
  type: CategoryType
  icon: string
  color: string
  created_at: string
}

export interface Transaction {
  id: string
  device_id: string
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
  source: 'manual' | 'ai' | 'import'
  created_at: string
  updated_at: string
  wallet?: Wallet
  category?: Category
}

export interface Bill {
  id: string
  device_id: string
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

export interface Receivable {
  id: string
  device_id: string
  name: string
  amount: number
  due_date: string
  is_received: boolean
  notes?: string
  color: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  device_id: string
  title: string
  description?: string
  due_date?: string
  due_time?: string
  priority: TaskPriority
  category: TaskCategory
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface HealthLog {
  id: string
  device_id: string
  type: HealthLogType
  value: number
  logged_at: string
  note?: string
}

export interface Notification {
  id: string
  device_id: string
  title: string
  body: string
  type: NotificationType
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
}

export interface DashboardSummary {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  savingsRate: number
  upcomingBills: Bill[]
  upcomingReceivables: Receivable[]
  recentTransactions: Transaction[]
  expenseByCategory: { category: string; amount: number; color: string }[]
  pendingTasks: Task[]
  todayWater: number
  weekGym: number
}
