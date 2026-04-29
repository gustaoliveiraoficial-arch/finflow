import { createClient } from '@/lib/supabase/client'

interface CreateNotificationParams {
  device_id: string
  title: string
  body?: string
  type?: 'bill_due' | 'receivable_due' | 'task_reminder' | 'health' | 'system'
  data?: Record<string, unknown>
}

/**
 * Salva uma notificação diretamente no Supabase (client-side).
 * Falha silenciosamente — nunca deve quebrar o fluxo principal.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from('notifications').insert({
      device_id: params.device_id,
      title:     params.title,
      body:      params.body ?? null,
      type:      params.type ?? 'system',
      data:      params.data ?? null,
      is_read:   false,
    })
  } catch {
    // Notificação é melhor esforço — não interrompe a aplicação
  }
}
