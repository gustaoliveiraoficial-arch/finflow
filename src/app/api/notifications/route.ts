import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

// POST /api/notifications — cria uma notificação no banco
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, title, body: msgBody, type, data } = body

    if (!device_id || !title) {
      return NextResponse.json({ error: 'device_id e title são obrigatórios' }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.from('notifications').insert({
      device_id,
      title,
      body: msgBody ?? null,
      type: type ?? 'system',
      data: data ?? null,
      is_read: false,
    })

    if (error) {
      console.error('[Notifications] Erro ao inserir:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Notifications] Erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/notifications?device_id=xxx — lista notificações
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id')

    if (!device_id) {
      return NextResponse.json({ error: 'device_id obrigatório' }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('device_id', device_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ notifications: data })
  } catch (err) {
    console.error('[Notifications] Erro GET:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
