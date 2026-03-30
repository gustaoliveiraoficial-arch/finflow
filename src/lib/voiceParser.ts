import type { ParsedVoice } from '@/types'

// Keywords for parsing natural language into transactions
const INCOME_KEYWORDS   = ['recebi','ganhei','entrou','salário','freelance','pagamento recebido','depósito']
const EXPENSE_KEYWORDS  = ['gastei','paguei','comprei','saiu','débito','conta','parcela','boleto']
const AMOUNT_REGEX      = /R\$?\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(?:reais|real|conto|pila)/i
const DATE_REGEX        = /\b(hoje|ontem|amanhã|segunda|terça|quarta|quinta|sexta)\b/i

const CATEGORY_MAP: Record<string, string> = {
  'mercado|supermercado|feira|hortifruti': 'Alimentação',
  'restaurante|lanche|ifood|delivery|pizza|hamburguer': 'Alimentação',
  'uber|táxi|99|gasolina|combustível|estacionamento|ônibus|metrô': 'Transporte',
  'farmácia|remédio|médico|consulta|plano de saúde': 'Saúde',
  'netflix|spotify|amazon|youtube|assinatura': 'Assinaturas',
  'aluguel|condomínio|conta de luz|água|internet': 'Moradia',
  'faculdade|curso|livro': 'Educação',
  'cinema|show|teatro|game|lazer': 'Lazer',
  'roupa|sapato|shopping|loja': 'Vestuário',
  'salário|pagamento': 'Salário',
  'freelance|projeto': 'Freelance',
}

function detectCategory(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const [pattern, category] of Object.entries(CATEGORY_MAP)) {
    if (new RegExp(pattern, 'i').test(lower)) return category
  }
  return undefined
}

function parseAmount(text: string): number | undefined {
  const match = AMOUNT_REGEX.exec(text)
  if (!match) return undefined
  const raw = (match[1] ?? match[2]).replace(',', '.')
  return parseFloat(raw)
}

function parseDate(text: string): string {
  const today = new Date()
  const lower = text.toLowerCase()
  if (lower.includes('ontem')) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
  }
  return today.toISOString().slice(0, 10)
}

export function parseVoiceTranscript(transcript: string): ParsedVoice {
  const lower    = transcript.toLowerCase()
  const amount   = parseAmount(transcript)
  const category = detectCategory(transcript)
  const date     = parseDate(transcript)

  const isIncome  = INCOME_KEYWORDS.some(k => lower.includes(k))
  const isExpense = EXPENSE_KEYWORDS.some(k => lower.includes(k))

  // Extract description: remove amount mentions, keep meaningful words
  let description = transcript
    .replace(AMOUNT_REGEX, '')
    .replace(DATE_REGEX, '')
    .replace(/\b(recebi|gastei|paguei|comprei|ganhei|entrou|saiu)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!description) description = transcript

  const confidence = amount ? (isIncome || isExpense ? 0.9 : 0.7) : 0.4

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
