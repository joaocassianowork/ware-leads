# Sistema Interno — Leads + Financeiro + Clientes

Sistema unificado com sidebar. Cloudflare Pages + Functions + D1. Sem dependências, sem build.

```
Visão geral (combina leads + financeiro + clientes)

Leads
 ├─ Dashboard
 └─ Pipeline (kanban)

Financeiro
 ├─ Dashboard
 ├─ Lançamentos
 └─ A Pagar / Receber

Clientes
 └─ Clientes (lista, MRR, indicações, aniversários)
```

## Categorias fixas e lançamentos/contas recorrentes

- **Categorias fixas** — o campo "Categoria" em lançamentos e contas agora é uma lista fechada (editável em `functions/_shared.js`, chave `categorias`), evitando fragmentação tipo "Fixo"/"fixo"/"Fixos" no dashboard. Se um lançamento antigo tinha uma categoria fora da lista nova, ela continua aparecendo normalmente (só não editável via clique — abre como opção extra "(antiga)" pra você não perder o dado).
- **Recorrência** — ao criar um lançamento ou conta, marque "Repetir todo mês" e diga por quantos meses. O sistema já cria todos de uma vez (ex: DAS-MEI dos próximos 12 meses num clique só). Excluir um item recorrente pergunta se quer apagar só aquele ou "este e os futuros da série" — o passado nunca é apagado.

### Migração do banco (rodar uma vez, se você já tinha o banco de antes)

Cole cada bloco separadamente no Console do D1:

```sql
ALTER TABLE lancamentos ADD COLUMN serie_id TEXT;
```
```sql
ALTER TABLE contas_pagar_receber ADD COLUMN serie_id TEXT;
```
```sql
CREATE INDEX IF NOT EXISTS idx_lanc_serie ON lancamentos(serie_id);
```
```sql
CREATE INDEX IF NOT EXISTS idx_contas_serie ON contas_pagar_receber(serie_id);
```

*(Instalação nova do zero: o `schema.sql` já vem com tudo incluso.)*

## Módulo de Clientes

Cadastro de clientes com:
- **Vínculo com lançamentos** — todo lançamento (opcional) pode apontar pra um cliente, permitindo ver receita total por cliente no drawer de detalhe.
- **Indicações** — o campo "indicado por" cria uma cadeia; o número de indicações de cada cliente é contado automaticamente (nunca precisa atualizar na mão).
- **Aniversário** — painel "Aniversários próximos (30 dias)" na tela de Clientes, e aniversariante do dia aparece na lista de ação da Visão Geral.
- **MRR (receita recorrente mensal)** — soma automática de clientes ativos, visível na tela de Clientes e na Visão Geral.
- **Ponte lead → cliente** — quando um lead está "Fechado", o drawer dele mostra um atalho pra já cadastrar como cliente com os dados pré-preenchidos.

## Deploy (mesmo projeto que você já tem)

1. Substitua os arquivos do repositório pelos deste ZIP.
2. Rode as migrações novas no banco (veja abaixo — só precisa rodar uma vez).
3. Dá push. Bindings e secrets continuam os mesmos, não precisa recriar nada.

### Migração do banco (rodar uma vez, no D1 Studio ou via wrangler)

Como você já tem o banco rodando, rode estes blocos **um de cada vez** no Console do D1 (cole, aperte Run, confirme que rodou, aí vai pro próximo — o Studio só executa um comando por vez de forma confiável):

```sql
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  empresa TEXT,
  telefone TEXT,
  telefone_norm TEXT,
  email TEXT,
  aniversario TEXT,
  mrr REAL DEFAULT 0,
  conta TEXT NOT NULL DEFAULT 'PJ',
  status TEXT NOT NULL DEFAULT 'ativo',
  origem TEXT,
  lead_id INTEGER REFERENCES leads(id),
  indicado_por_id INTEGER REFERENCES clientes(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
```

```sql
CREATE TABLE IF NOT EXISTS notas_cliente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  autor TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
```

```sql
ALTER TABLE lancamentos ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);
```

```sql
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
```
```sql
CREATE INDEX IF NOT EXISTS idx_clientes_indicado_por ON clientes(indicado_por_id);
```
```sql
CREATE INDEX IF NOT EXISTS idx_clientes_aniversario ON clientes(aniversario);
```
```sql
CREATE INDEX IF NOT EXISTS idx_notas_cliente ON notas_cliente(cliente_id);
```
```sql
CREATE INDEX IF NOT EXISTS idx_lanc_cliente ON lancamentos(cliente_id);
```

Depois disso a lista de tabelas no Studio deve mostrar: `leads`, `notas`, `lancamentos`, `contas_pagar_receber`, `metas`, `clientes`, `notas_cliente`.

*(Instalação nova do zero: o `schema.sql` já vem com tudo incluso, não precisa rodar os blocos acima separadamente.)*

## O que mudou nesta versão

O financeiro (antes em Supabase, arquivo `sistema-financeiro.html`) foi migrado para dentro deste
mesmo projeto, usando o **mesmo banco D1** que já era usado pelo pipeline de leads (binding `DB`).
Agora é um projeto só, um login só, um deploy só.

**Dados antigos do Supabase não foram migrados automaticamente.** Se quiser trazer o
histórico que já estava no Supabase, exporte as tabelas de lá (Table Editor → Export CSV) e me
manda os arquivos — eu preparo o script de importação pro D1.

## Estrutura

```
sistema-interno/
├── public/index.html          → app completo (sidebar, dashboards, kanban, financeiro, clientes)
├── functions/
│   ├── _shared.js             → ⚙️ CONFIGURAÇÃO (responsáveis, origens, contas PJ/PF, canais)
│   └── api/
│       ├── login.js, config.js
│       ├── leads.js, leads/[id].js, leads/[id]/notas.js, stats.js
│       ├── lancamentos.js, lancamentos/[id].js, contas.js, contas/[id].js, metas.js, financeiro-stats.js
│       └── clientes.js, clientes/[id].js, clientes/[id]/notas.js
├── schema.sql                 → tabelas do D1 (instalação nova, já com tudo incluso)
└── wrangler.toml
```

## Configuração

Tudo em `functions/_shared.js`: responsáveis, origens de lead, motivos de perda, prazos de
follow-up, contas (PJ/PF) e canais de receita do financeiro — um lugar só.

## Rodar local

```bash
echo "APP_PASSWORD=teste123" > .dev.vars
npx wrangler d1 execute leads-pipeline --local --file=schema.sql
npx wrangler pages dev
```

## Atalhos

- **N** → abre o cadastro certo pra tela em que você está (novo lead, novo lançamento, nova conta ou novo cliente)
- **Enter** nos formulários → salva
- **Esc** → fecha modais
- Arrastar card no kanban → muda a etapa (soltar em "Perdido" pede o motivo)

