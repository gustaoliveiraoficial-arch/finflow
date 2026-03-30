# FinFlow — Controle Financeiro Pessoal

> SaaS de controle financeiro pessoal com PWA, chat de voz, notificações e Supabase.

## Funcionalidades

- **Dashboard Hero** — Saldo total, entradas/saídas do mês, gráficos, próximas contas, dica do dia
- **Gastos & Entradas** — CRUD completo com filtro por mês, busca, categorias, recorrência
- **Carteiras** — Contas corrente, poupança, investimentos, empresarial — com distribuição de patrimônio
- **Chat de Voz** — Fale e o app reconhece tipo, valor e categoria automaticamente (Web Speech API, pt-BR)
- **Notificações** — Push notifications para contas próximas do vencimento + notificações in-app em tempo real
- **PWA** — Instalável no celular e desktop como app nativo, funciona offline

## Setup em 5 minutos

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra o **SQL Editor** e cole o conteúdo de `supabase/schema.sql`
3. Execute — isso cria todas as tabelas, RLS e categorias padrão

### 2. Variáveis de ambiente

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

Encontre essas chaves em: Supabase Dashboard → Settings → API

### 3. Ícones PWA (opcional)

```bash
node public/icons/generate-icons.js
# ou use https://realfavicongenerator.net/ com o arquivo public/icons/icon.svg
```

### 4. Rodar

```bash
npm run dev
# Acesse: http://localhost:3000
```

### 5. Instalar no celular

1. Abra `http://seu-ip:3000` no celular
2. Menu do navegador → **"Adicionar à tela inicial"**
3. Pronto — FinFlow aparece como app nativo!

## Notificações Push (opcional)

1. Gere as chaves VAPID em [web-push-codelab.glitch.me](https://web-push-codelab.glitch.me/)
2. Adicione ao `.env.local`:
   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   ```
3. Nas Configurações do app → ativar notificações

## Estrutura

```
src/
├── app/
│   ├── dashboard/     # Hero dashboard
│   ├── expenses/      # Gastos & entradas
│   ├── wallets/       # Carteiras
│   ├── voice/         # Chat de voz
│   ├── settings/      # Configurações + PWA
│   └── auth/          # Login / Signup
├── components/
│   ├── dashboard/     # StatCard, Charts, Bills, Tips
│   ├── expenses/      # TransactionForm
│   ├── layout/        # Sidebar, AppLayout
│   └── ui/            # Modal, EmptyState
├── hooks/             # useSpeechRecognition, usePushNotifications
├── lib/               # Supabase client/server, utils, voiceParser
└── types/             # Tipos TypeScript
supabase/
└── schema.sql         # Schema completo + RLS
```

## Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** (PostgreSQL, Auth, Real-time)
- **Tailwind CSS** com tema escuro customizado
- **Recharts** para gráficos
- **next-pwa** para PWA
- **Web Speech API** para reconhecimento de voz
- **Web Push API** para notificações push
