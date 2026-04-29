-- Amigão 2.0 — Schema Supabase
-- App pessoal, sem autenticação — use device_id como identificador

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- WALLETS (Carteiras)
-- ==========================================
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   TEXT NOT NULL,
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
  device_id  TEXT,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income','expense')),
  icon       TEXT NOT NULL DEFAULT 'tag',
  color      TEXT NOT NULL DEFAULT '#35976b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (id, name, type, icon, color) VALUES
  (uuid_generate_v4(), 'Salário',           'income',  'briefcase',    '#22d3a4'),
  (uuid_generate_v4(), 'Freelance',         'income',  'laptop',       '#34d399'),
  (uuid_generate_v4(), 'Investimentos',     'income',  'trending-up',  '#6ee7b7'),
  (uuid_generate_v4(), 'Outros (entrada)',  'income',  'plus-circle',  '#a7f3d0'),
  (uuid_generate_v4(), 'Alimentação',       'expense', 'utensils',     '#f87171'),
  (uuid_generate_v4(), 'Moradia',           'expense', 'home',         '#fb923c'),
  (uuid_generate_v4(), 'Transporte',        'expense', 'car',          '#fbbf24'),
  (uuid_generate_v4(), 'Saúde',             'expense', 'heart',        '#f472b6'),
  (uuid_generate_v4(), 'Educação',          'expense', 'book-open',    '#a78bfa'),
  (uuid_generate_v4(), 'Lazer',             'expense', 'gamepad-2',    '#60a5fa'),
  (uuid_generate_v4(), 'Vestuário',         'expense', 'shirt',        '#f9a8d4'),
  (uuid_generate_v4(), 'Assinaturas',       'expense', 'repeat',       '#818cf8'),
  (uuid_generate_v4(), 'Outros (saída)',    'expense', 'minus-circle', '#94a3b8')
ON CONFLICT DO NOTHING;

-- ==========================================
-- TRANSACTIONS (Transações)
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      TEXT NOT NULL,
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
  source         TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','import')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- BILLS (Contas a Pagar — recorrentes)
-- ==========================================
CREATE TABLE IF NOT EXISTS bills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   TEXT NOT NULL,
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
-- RECEIVABLES (Contas a Receber)
-- ==========================================
CREATE TABLE IF NOT EXISTS receivables (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  due_date     DATE NOT NULL,
  is_received  BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  color        TEXT NOT NULL DEFAULT '#22d3a4',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- TASKS (Tarefas)
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  due_time    TIME,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  category    TEXT NOT NULL DEFAULT 'pessoal' CHECK (category IN ('pessoal','trabalho','saude','financeiro','outro')),
  is_done     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- HEALTH LOGS (Registro de Saúde)
-- ==========================================
CREATE TABLE IF NOT EXISTS health_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id  TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('water','gym','sleep')),
  value      NUMERIC(5,2) NOT NULL DEFAULT 1,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note       TEXT
);

-- ==========================================
-- NOTIFICATIONS (Notificações)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id  TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('bill_due','receivable_due','task_reminder','health','system')),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- Sem RLS — app pessoal, filtro por device_id na aplicação
-- ==========================================

-- ==========================================
-- UPDATED_AT trigger
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallets_updated      ON wallets;
DROP TRIGGER IF EXISTS trg_transactions_updated ON transactions;
DROP TRIGGER IF EXISTS trg_bills_updated        ON bills;
DROP TRIGGER IF EXISTS trg_receivables_updated  ON receivables;
DROP TRIGGER IF EXISTS trg_tasks_updated        ON tasks;

CREATE TRIGGER trg_wallets_updated      BEFORE UPDATE ON wallets      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bills_updated        BEFORE UPDATE ON bills         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_receivables_updated  BEFORE UPDATE ON receivables   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated        BEFORE UPDATE ON tasks         FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_transactions_device_date  ON transactions(device_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_device              ON bills(device_id, is_active);
CREATE INDEX IF NOT EXISTS idx_receivables_device_date   ON receivables(device_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_device_due          ON tasks(device_id, due_date);
CREATE INDEX IF NOT EXISTS idx_health_logs_device_type   ON health_logs(device_id, type, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_device      ON notifications(device_id, is_read);
