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
