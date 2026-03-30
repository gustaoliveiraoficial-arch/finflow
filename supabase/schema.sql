-- FinFlow — Schema Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- WALLETS (Carteiras / Contas)
-- ==========================================
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('checking','savings','investment','cash','business','credit')),
  color       TEXT NOT NULL DEFAULT '#35976b',
  icon        TEXT NOT NULL DEFAULT 'wallet',
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'BRL',
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- CATEGORIES (Categorias)
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = categoria padrão do sistema
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income','expense')),
  icon       TEXT NOT NULL DEFAULT 'tag',
  color      TEXT NOT NULL DEFAULT '#35976b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorias padrão do sistema
INSERT INTO categories (id, name, type, icon, color) VALUES
  (uuid_generate_v4(), 'Salário',       'income',  'briefcase',    '#22d3a4'),
  (uuid_generate_v4(), 'Freelance',     'income',  'laptop',       '#34d399'),
  (uuid_generate_v4(), 'Investimentos', 'income',  'trending-up',  '#6ee7b7'),
  (uuid_generate_v4(), 'Outros (entrada)', 'income','plus-circle', '#a7f3d0'),
  (uuid_generate_v4(), 'Alimentação',   'expense', 'utensils',     '#f87171'),
  (uuid_generate_v4(), 'Moradia',       'expense', 'home',         '#fb923c'),
  (uuid_generate_v4(), 'Transporte',    'expense', 'car',          '#fbbf24'),
  (uuid_generate_v4(), 'Saúde',         'expense', 'heart',        '#f472b6'),
  (uuid_generate_v4(), 'Educação',      'expense', 'book-open',    '#a78bfa'),
  (uuid_generate_v4(), 'Lazer',         'expense', 'gamepad-2',    '#60a5fa'),
  (uuid_generate_v4(), 'Vestuário',     'expense', 'shirt',        '#f9a8d4'),
  (uuid_generate_v4(), 'Assinaturas',   'expense', 'repeat',       '#818cf8'),
  (uuid_generate_v4(), 'Outros (saída)','expense', 'minus-circle', '#94a3b8')
ON CONFLICT DO NOTHING;

-- ==========================================
-- TRANSACTIONS (Transações)
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id      UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  type           TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount         NUMERIC(12,2) NOT NULL,
  description    TEXT NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring   BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence     TEXT CHECK (recurrence IN ('daily','weekly','monthly','yearly')),
  recurrence_end DATE,
  is_paid        BOOLEAN NOT NULL DEFAULT TRUE,
  notes          TEXT,
  source         TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','voice','import')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- BILLS (Próximas Contas a Pagar)
-- ==========================================
CREATE TABLE IF NOT EXISTS bills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  due_day     INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  color       TEXT NOT NULL DEFAULT '#f87171',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- NOTIFICATIONS (Notificações)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('bill_due','budget_alert','tip','system')),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- PUSH SUBSCRIPTIONS (Web Push)
-- ==========================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- VOICE LOGS (Entradas de Voz)
-- ==========================================
CREATE TABLE IF NOT EXISTS voice_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript     TEXT NOT NULL,
  parsed         JSONB,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE wallets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_logs        ENABLE ROW LEVEL SECURITY;

-- Wallets
CREATE POLICY "users_own_wallets" ON wallets FOR ALL USING (auth.uid() = user_id);

-- Categories: leitura de categorias do sistema + próprias
CREATE POLICY "users_read_categories" ON categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "users_manage_categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "users_own_transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- Bills
CREATE POLICY "users_own_bills" ON bills FOR ALL USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "users_own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Push subscriptions
CREATE POLICY "users_own_push" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Voice logs
CREATE POLICY "users_own_voice" ON voice_logs FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- UPDATED_AT trigger
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallets_updated      BEFORE UPDATE ON wallets      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bills_updated        BEFORE UPDATE ON bills         FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- INDEXES para performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date   ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet      ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_bills_user              ON bills(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read  ON notifications(user_id, is_read);
