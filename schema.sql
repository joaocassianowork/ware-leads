-- Pipeline de Leads — schema D1
-- Executar: wrangler d1 execute leads-pipeline --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  empresa TEXT,
  telefone TEXT,
  telefone_norm TEXT,
  email TEXT,
  origem TEXT DEFAULT 'outro',
  valor REAL DEFAULT 0,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  motivo_perda TEXT,
  motivo_perda_obs TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  status_alterado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  autor TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_telefone_norm ON leads(telefone_norm);
CREATE INDEX IF NOT EXISTS idx_leads_criado_em ON leads(criado_em);
CREATE INDEX IF NOT EXISTS idx_notas_lead ON notas(lead_id);

-- ============================================================
-- FINANCEIRO (migrado do Supabase)
-- ============================================================

CREATE TABLE IF NOT EXISTS lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  canal TEXT,
  conta TEXT NOT NULL DEFAULT 'PJ',
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pago',
  valor REAL NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contas_pagar_receber (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  vencimento TEXT NOT NULL,
  tipo TEXT NOT NULL,
  conta TEXT NOT NULL DEFAULT 'PJ',
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS metas (
  chave TEXT PRIMARY KEY,
  conta TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  valor REAL NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lanc_data ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_lanc_conta ON lancamentos(conta);
CREATE INDEX IF NOT EXISTS idx_lanc_tipo ON lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_contas_venc ON contas_pagar_receber(vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_status ON contas_pagar_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_conta ON contas_pagar_receber(conta);
