# Sistema Interno — Leads + Financeiro

Sistema unificado com sidebar. Cloudflare Pages + Functions + D1. Sem dependências, sem build.

```
Leads
 ├─ Dashboard
 └─ Pipeline (kanban)

Financeiro
 ├─ Dashboard
 ├─ Lançamentos
 └─ A Pagar / Receber
```

## O que mudou nesta versão

O financeiro (antes em Supabase, arquivo `sistema-financeiro.html`) foi migrado para dentro deste
mesmo projeto, usando o **mesmo banco D1** que já era usado pelo pipeline de leads (binding `DB`).
Agora é um projeto só, um login só, um deploy só.

**Dados antigos do Supabase não foram migrados automaticamente.** As tabelas novas no D1
(`lancamentos`, `contas_pagar_receber`, `metas`) começam vazias. Se você quiser trazer o
histórico que já estava no Supabase, exporte as tabelas de lá (Table Editor → Export CSV) e me
manda os arquivos — eu preparo o script de importação pro D1.

## Estrutura

```
sistema-interno/
├── public/index.html          → app completo (sidebar, dashboards, kanban, financeiro)
├── functions/
│   ├── _shared.js             → ⚙️ CONFIGURAÇÃO (responsáveis, origens, contas PJ/PF, canais)
│   └── api/
│       ├── login.js, config.js
│       ├── leads.js, leads/[id].js, leads/[id]/notas.js, stats.js
│       └── lancamentos.js, lancamentos/[id].js, contas.js, contas/[id].js, metas.js, financeiro-stats.js
├── schema.sql                 → tabelas do D1 (leads + notas + lancamentos + contas + metas)
└── wrangler.toml
```

## Deploy (mesmo projeto que você já tem)

Como você já criou o banco D1 e configurou o binding `DB` e a secret `APP_PASSWORD` no projeto
`lead-pipeline` existente, o processo agora é só:

1. Substitua os arquivos do repositório pelos deste ZIP (mantém o mesmo `wrangler.toml`, já
   com o seu `database_id`).
2. Rode o `schema.sql` novo no banco — ele usa `CREATE TABLE IF NOT EXISTS`, então não apaga o
   que já existe, só adiciona as tabelas do financeiro:

```bash
npx wrangler d1 execute leads-pipeline --remote --file=schema.sql
```

   Ou pelo Console do D1 no painel: abre o banco → aba Console → cola o conteúdo do `schema.sql`.

3. Dá push. O binding `DB` e a secret `APP_PASSWORD` continuam valendo, não precisa recriar.

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

- **N** → abre o cadastro certo pra tela em que você está (novo lead, novo lançamento ou nova conta)
- **Enter** nos formulários → salva
- **Esc** → fecha modais
- Arrastar card no kanban → muda a etapa (soltar em "Perdido" pede o motivo)
