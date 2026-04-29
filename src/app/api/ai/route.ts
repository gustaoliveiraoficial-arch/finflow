import { getGroq, AMIGAO_SYSTEM_PROMPT, GROQ_MODEL } from '@/lib/groq'
import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

// ── Definição das ferramentas disponíveis para o Amigão ──────────────────────

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'criar_tarefa',
      description: 'Cria uma nova tarefa, compromisso, evento, reunião ou lembrete na agenda do usuário. Use quando o usuário mencionar que tem algo para fazer, uma visita, reunião, ou pedir para lembrar de algo.',
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string', description: 'Título claro da tarefa ou compromisso' },
          description: { type: 'string', description: 'Detalhes adicionais (opcional)' },
          due_date:    { type: 'string', description: 'Data no formato YYYY-MM-DD. Use a data atual para "hoje", amanhã +1 dia, etc.' },
          due_time:    { type: 'string', description: 'Horário no formato HH:MM (ex: 12:00, 14:30) se mencionado' },
          priority:    { type: 'string', enum: ['low', 'medium', 'high'], description: 'low=baixa, medium=média, high=alta/urgente' },
          category:    { type: 'string', enum: ['pessoal', 'trabalho', 'saude', 'financeiro', 'outro'] },
        },
        required: ['title', 'priority', 'category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'registrar_transacao',
      description: 'Registra um gasto, despesa, compra, pagamento ou receita/entrada financeira. Use quando o usuário disser que gastou, pagou, comprou ou recebeu algum valor.',
      parameters: {
        type: 'object',
        properties: {
          tipo:          { type: 'string', enum: ['income', 'expense'], description: 'income=entrada/receita, expense=saída/gasto/despesa' },
          valor:         { type: 'number', description: 'Valor em reais (número positivo, sem R$)' },
          descricao:     { type: 'string', description: 'O que foi gasto ou recebido (ex: café, uber, almoço, salário)' },
          categoria:     { type: 'string', description: 'Categoria do gasto: Alimentação, Transporte, Lazer, Saúde, Moradia, Educação, Vestuário, Tecnologia, Salário, Freelance, Outros' },
          data:          { type: 'string', description: 'Data no formato YYYY-MM-DD. Usa hoje se não especificado.' },
        },
        required: ['tipo', 'valor', 'descricao', 'categoria'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'registrar_saude',
      description: 'Registra dados de saúde: copos de água bebidos, treino de academia feito, ou horas de sono. Use quando o usuário mencionar que bebeu água, foi à academia/treinou, ou dormiu X horas.',
      parameters: {
        type: 'object',
        properties: {
          tipo:  { type: 'string', enum: ['water', 'gym', 'sleep'], description: 'water=água, gym=academia/treino/exercício, sleep=sono/dormiu' },
          valor: { type: 'number', description: 'Água: número de copos. Academia: sempre 1. Sono: horas dormidas.' },
        },
        required: ['tipo', 'valor'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'criar_conta_pagar',
      description: 'Cadastra uma conta fixa a pagar que se repete mensalmente (ex: aluguel, internet, academia, streaming, plano de celular). Use quando o usuário quiser cadastrar uma despesa recorrente.',
      parameters: {
        type: 'object',
        properties: {
          nome:       { type: 'string', description: 'Nome da conta (ex: Netflix, Internet, Aluguel)' },
          valor:      { type: 'number', description: 'Valor mensal em reais' },
          dia_vencimento: { type: 'number', description: 'Dia do mês em que vence (1 a 31)' },
        },
        required: ['nome', 'valor', 'dia_vencimento'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'criar_conta_receber',
      description: 'Cadastra um valor que o usuário vai receber futuramente (ex: pagamento de cliente, devolução, freelance pendente). Use quando o usuário mencionar que vai receber algo.',
      parameters: {
        type: 'object',
        properties: {
          descricao:     { type: 'string', description: 'Descrição do recebimento (ex: Pagamento cliente ABC, Freelance XYZ)' },
          valor:         { type: 'number', description: 'Valor esperado em reais' },
          data_prevista: { type: 'string', description: 'Data prevista de recebimento no formato YYYY-MM-DD' },
        },
        required: ['descricao', 'valor', 'data_prevista'],
      },
    },
  },
]

// ── Execução das ferramentas no Supabase ──────────────────────────────────────

interface ToolResult {
  success: boolean
  description: string
  tool: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, args: Record<string, any>, deviceId: string): Promise<ToolResult> {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  switch (name) {

    case 'criar_tarefa': {
      const { data, error } = await supabase.from('tasks').insert({
        device_id:   deviceId,
        title:       args.title,
        description: args.description ?? null,
        due_date:    args.due_date ?? null,
        due_time:    args.due_time ?? null,
        priority:    args.priority ?? 'medium',
        category:    args.category ?? 'outro',
        is_done:     false,
      }).select().single()

      if (error) return { success: false, tool: name, description: `Erro ao criar tarefa: ${error.message}` }
      return {
        success: true,
        tool: name,
        data,
        description: `Tarefa criada: "${args.title}"${args.due_date ? ` para ${formatDateBR(args.due_date)}` : ''}${args.due_time ? ` às ${args.due_time}` : ''}`,
      }
    }

    case 'registrar_transacao': {
      // Busca categoria mais próxima
      const catType = args.tipo === 'income' ? 'income' : 'expense'
      const { data: cats } = await supabase.from('categories')
        .select('id, name')
        .eq('type', catType)
        .ilike('name', `%${(args.categoria as string).split(' ')[0]}%`)
        .limit(1)

      // Pega carteira principal
      const { data: wallets } = await supabase.from('wallets')
        .select('id, balance')
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)

      if (!wallets?.length) return { success: false, tool: name, description: 'Nenhuma carteira cadastrada. Crie uma carteira primeiro.' }

      const wallet = wallets[0]
      const { data, error } = await supabase.from('transactions').insert({
        device_id:   deviceId,
        wallet_id:   wallet.id,
        category_id: cats?.[0]?.id ?? null,
        type:        args.tipo,
        amount:      args.valor,
        description: args.descricao,
        date:        args.data ?? today,
        is_paid:     true,
        is_recurring: false,
        source:      'ai',
      }).select().single()

      if (error) return { success: false, tool: name, description: `Erro ao registrar transação: ${error.message}` }

      // Atualiza saldo da carteira
      const delta = args.tipo === 'income' ? Number(args.valor) : -Number(args.valor)
      await supabase.from('wallets').update({ balance: wallet.balance + delta }).eq('id', wallet.id)

      const label = args.tipo === 'income' ? '💰 Entrada' : '💸 Gasto'
      return {
        success: true,
        tool: name,
        data,
        description: `${label}: R$ ${Number(args.valor).toFixed(2)} — "${args.descricao}" (${args.categoria})`,
      }
    }

    case 'registrar_saude': {
      const { data, error } = await supabase.from('health_logs').insert({
        device_id: deviceId,
        type:      args.tipo,
        value:     args.valor,
        logged_at: new Date().toISOString(),
      }).select().single()

      if (error) return { success: false, tool: name, description: `Erro ao registrar saúde: ${error.message}` }

      const labels: Record<string, string> = {
        water: `💧 ${args.valor} copo(s) de água registrado(s)`,
        gym:   '🏋️ Treino de academia registrado',
        sleep: `😴 ${args.valor}h de sono registradas`,
      }
      return { success: true, tool: name, data, description: labels[args.tipo] ?? 'Saúde registrada' }
    }

    case 'criar_conta_pagar': {
      const { data, error } = await supabase.from('bills').insert({
        device_id:    deviceId,
        name:         args.nome,
        amount:       args.valor,
        due_day:      args.dia_vencimento,
        is_recurring: true,
        is_active:    true,
        color:        '#6366f1',
      }).select().single()

      if (error) return { success: false, tool: name, description: `Erro ao criar conta: ${error.message}` }
      return {
        success: true,
        tool: name,
        data,
        description: `📋 Conta cadastrada: "${args.nome}" — R$ ${Number(args.valor).toFixed(2)} todo dia ${args.dia_vencimento}`,
      }
    }

    case 'criar_conta_receber': {
      const { data, error } = await supabase.from('receivables').insert({
        device_id:   deviceId,
        name:        args.descricao,
        amount:      args.valor,
        due_date:    args.data_prevista,
        is_received: false,
        color:       '#22c55e',
      }).select().single()

      if (error) return { success: false, tool: name, description: `Erro ao criar recebível: ${error.message}` }
      return {
        success: true,
        tool: name,
        data,
        description: `💰 A receber: "${args.descricao}" — R$ ${Number(args.valor).toFixed(2)} em ${formatDateBR(args.data_prevista)}`,
      }
    }

    default:
      return { success: false, tool: name, description: `Ferramenta desconhecida: ${name}` }
  }
}

function formatDateBR(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { messages, context, device_id } = await request.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY não configurada. Adicione no arquivo .env.local' },
        { status: 500 },
      )
    }

    if (!device_id) {
      return NextResponse.json({ error: 'device_id não informado' }, { status: 400 })
    }

    const systemContent = `${AMIGAO_SYSTEM_PROMPT}

IMPORTANTE — AUTONOMIA DE AÇÃO:
Você tem ferramentas disponíveis para agir diretamente no app do Gustavo. Quando ele mencionar:
- Uma visita, reunião, compromisso ou tarefa → use criar_tarefa automaticamente
- Um gasto, compra, despesa ou receita/entrada → use registrar_transacao automaticamente
- Que bebeu água, foi à academia ou dormiu → use registrar_saude automaticamente
- Uma conta fixa/recorrente → use criar_conta_pagar automaticamente
- Algo que vai receber → use criar_conta_receber automaticamente

Não pergunte confirmação para ações simples — execute e informe o que foi feito.
Para ações com valores altos ou datas ambíguas, confirme brevemente antes.

${context ? `--- CONTEXTO ATUAL DO GUSTAVO ---\n${context}` : ''}`

    const groqMessages = [
      { role: 'system' as const, content: systemContent },
      ...messages.slice(-20),
    ]

    // 1ª chamada — com ferramentas disponíveis
    const firstCall = await getGroq().chat.completions.create({
      model:       GROQ_MODEL,
      messages:    groqMessages,
      tools:       TOOLS,
      tool_choice: 'auto',
      max_tokens:  1024,
      temperature: 0.7,
    })

    const firstChoice = firstCall.choices[0]
    const actions: ToolResult[] = []

    // Se o modelo decidiu usar ferramentas
    if (firstChoice.finish_reason === 'tool_calls' && firstChoice.message.tool_calls?.length) {
      const toolCallMessages = [...groqMessages, firstChoice.message]

      // Executa cada ferramenta
      for (const toolCall of firstChoice.message.tool_calls) {
        let parsedArgs: Record<string, unknown> = {}
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments)
        } catch {
          parsedArgs = {}
        }

        const result = await executeTool(toolCall.function.name, parsedArgs, device_id)
        actions.push(result)

        toolCallMessages.push({
          role:         'tool' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_call_id: (toolCall as any).id,
          content:      JSON.stringify({ success: result.success, description: result.description }),
        })
      }

      // 2ª chamada — resposta final do Amigão após executar as ações
      const secondCall = await getGroq().chat.completions.create({
        model:      GROQ_MODEL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages:   toolCallMessages as any,
        max_tokens: 512,
        temperature: 0.7,
      })

      return NextResponse.json({
        message: secondCall.choices[0]?.message?.content ?? 'Feito!',
        actions,
      })
    }

    // Resposta normal sem ação
    return NextResponse.json({
      message: firstChoice.message.content ?? 'Desculpe, não entendi.',
      actions: [],
    })
  } catch (error) {
    console.error('[AI Route] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao chamar a IA. Verifique sua chave do Groq.' },
      { status: 500 },
    )
  }
}
