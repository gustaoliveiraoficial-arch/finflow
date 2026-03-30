import type { ParsedVoice } from '@/types'

const INCOME_KEYWORDS  = ['recebi','ganhei','entrou','salário','freelance','pagamento recebido','depósito','renda','lucro','transferência recebida']
const EXPENSE_KEYWORDS = ['gastei','paguei','comprei','saiu','débito','conta','parcela','boleto','despesa','gastando','pagando']

// Matches: R$50, R$ 50, 50 reais, 50 BRL, 50,50, 50.50, or bare numbers like "50" or "50 no"
const AMOUNT_REGEX = /R\$\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(?:reais|real|conto|pila|brl)/i
const BARE_NUMBER  = /\b(\d+(?:[.,]\d{1,2})?)\b/

const DATE_REGEX = /\b(hoje|ontem|amanhã|segunda|terça|quarta|quinta|sexta)\b/i

const CATEGORY_MAP: Record<string, string> = {
  'mercado|supermercado|feira|hortifruti':            'Alimentação',
  'restaurante|lanche|ifood|delivery|pizza|hamburguer|sushi|comida': 'Alimentação',
  'uber|táxi|99|gasolina|combustível|posto|estacionamento|ônibus|metrô|passagem': 'Transporte',
  'farmácia|remédio|médico|consulta|plano de saúde|hospital': 'Saúde',
  'netflix|spotify|amazon|youtube|assinatura|streaming': 'Assinaturas',
  'aluguel|condomínio|conta de luz|água|internet|energia|iptu': 'Moradia',
  'faculdade|curso|livro|escola': 'Educação',
  'cinema|show|teatro|game|lazer|viagem|passeio': 'Lazer',
  'roupa|sapato|shopping|loja|vestuário': 'Vestuário',
  'salário|pagamento': 'Salário',
  'freelance|projeto|serviço': 'Freelance',
}

// Wallet creation detection
const WALLET_CREATE_REGEX = /(?:criar?|nova?|adicionar?|abrir?)\s+(?:uma?\s+)?carteira\s+(?:chamada?\s+)?["']?(.+?)["']?(?:\s+com\s+saldo|\s+de\s+R?\$?[\d,]+|$)/i

function detectCategory(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const [pattern, category] of Object.entries(CATEGORY_MAP)) {
    if (new RegExp(pattern, 'i').test(lower)) return category
  }
  return undefined
}

function parseAmount(text: string, hasKeyword: boolean): number | undefined {
  const match = AMOUNT_REGEX.exec(text)
  if (match) {
    const raw = (match[1] ?? match[2]).replace(',', '.')
    return parseFloat(raw)
  }
  // Fallback: any bare number when we have a clear income/expense keyword
  if (hasKeyword) {
    const fallback = BARE_NUMBER.exec(text)
    if (fallback) return parseFloat(fallback[1].replace(',', '.'))
  }
  return undefined
}

function parseDate(text: string): string {
  const today = new Date()
  const lower = text.toLowerCase()
  if (lower.includes('ontem')) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
  }
  return today.toISOString().slice(0, 10)
}

export interface WalletCreateIntent {
  name: string
  initialBalance?: number
}

export function detectWalletCreation(transcript: string): WalletCreateIntent | null {
  const match = WALLET_CREATE_REGEX.exec(transcript)
  if (!match) return null

  const name = match[1].trim()
  // Look for initial balance in the transcript
  const balanceMatch = /(?:saldo|com)\s+(?:de\s+)?R?\$?\s?(\d+(?:[.,]\d{1,2})?)/i.exec(transcript)
  const initialBalance = balanceMatch ? parseFloat(balanceMatch[1].replace(',', '.')) : undefined

  return { name, initialBalance }
}

export function parseVoiceTranscript(transcript: string): ParsedVoice {
  const lower      = transcript.toLowerCase()
  const isIncome   = INCOME_KEYWORDS.some(k => lower.includes(k))
  const isExpense  = EXPENSE_KEYWORDS.some(k => lower.includes(k))
  const hasKeyword = isIncome || isExpense

  const amount   = parseAmount(transcript, hasKeyword)
  const category = detectCategory(transcript)
  const date     = parseDate(transcript)

  // Build clean description
  let description = transcript
    .replace(AMOUNT_REGEX, '')
    .replace(BARE_NUMBER, (m) => (amount && m === String(Math.round(amount)) ? '' : m))
    .replace(DATE_REGEX, '')
    .replace(/\b(recebi|gastei|paguei|comprei|ganhei|entrou|saiu|pagar|gastar)\b/gi, '')
    .replace(/\bBRL\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!description || description.length < 3) description = transcript

  // Confidence: high when amount + keyword detected, medium when only keyword, low otherwise
  const confidence = amount && hasKeyword ? 0.9
    : amount || hasKeyword           ? 0.65
    : 0.4

  return {
    type:        isIncome ? 'income' : 'expense',
    amount,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    category,
    date,
    confidence,
  }
}

export function voiceConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.8) return { label: 'Alta confiança',   color: '#22d3a4' }
  if (confidence >= 0.5) return { label: 'Média confiança',  color: '#fbbf24' }
  return                        { label: 'Baixa confiança',  color: '#f87171' }
}
