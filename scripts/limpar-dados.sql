-- ============================================================
-- LIMPEZA DE DADOS — mantém apenas clientes e notas de clientes
-- Executar: wrangler d1 execute leads-pipeline --remote --file=scripts/limpar-dados.sql
-- ============================================================

-- Desativa checagem de chaves estrangeiras durante a limpeza
PRAGMA foreign_keys = OFF;

DELETE FROM notas;
DELETE FROM leads;
DELETE FROM lancamentos;
DELETE FROM contas_pagar_receber;
DELETE FROM metas;

-- Reativa
PRAGMA foreign_keys = ON;

-- Os dados abaixo NÃO são deletados:
--   clientes         — mantido integralmente
--   notas_cliente    — mantido integralmente
