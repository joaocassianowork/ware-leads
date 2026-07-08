# Pipeline de Leads

Sistema interno de gestão de leads. Cloudflare Pages + Functions + D1. Sem dependências, sem build.

## Estrutura

```
lead-pipeline/
├── public/index.html          → app completo (dashboard, kanban, cadastro)
├── functions/
│   ├── _shared.js             → ⚙️ CONFIGURAÇÃO (edite aqui)
│   └── api/                   → endpoints (login, leads, notas, stats)
├── schema.sql                 → tabelas do D1
└── wrangler.toml
```

## Configuração inicial (uma vez)

**1. Edite `functions/_shared.js`** — nomes dos responsáveis, origens, motivos de perda e prazos de follow-up estão todos lá, em um lugar só.

**2. Crie o banco D1:**

```bash
npx wrangler d1 create leads-pipeline
```

Copie o `database_id` que aparecer e cole no `wrangler.toml`.

**3. Crie as tabelas:**

```bash
npx wrangler d1 execute leads-pipeline --remote --file=schema.sql
```

**4. Suba o projeto** (via GitHub conectado ao Pages, ou direto):

```bash
npx wrangler pages deploy
```

**5. No painel da Cloudflare** (Pages > seu projeto > Settings):
- **Bindings**: adicione o banco D1 `leads-pipeline` com o nome de binding `DB` (se fez deploy via GitHub; com wrangler.toml no repo isso já vai automático)
- **Variables and Secrets**: crie `APP_PASSWORD` com a senha da equipe

Pronto. Acesse a URL do projeto e entre com a senha.

## Rodar local

```bash
echo "APP_PASSWORD=teste123" > .dev.vars
npx wrangler d1 execute leads-pipeline --local --file=schema.sql
npx wrangler pages dev
```

## Prazos de follow-up (padrão)

| Etapa | Alerta amarelo | Alerta vermelho |
|---|---|---|
| Novo | 1 dia parado | 2 dias |
| Contato feito | 2 dias | 4 dias |
| Reunião marcada | 2 dias | 4 dias |
| Proposta enviada | 3 dias | 6 dias |

Vermelho é sempre 2× o prazo. Ajuste em `followUpDias` no `_shared.js`.

## Atalhos

- **N** → abre o cadastro de novo lead de qualquer tela
- **Enter** no cadastro → salva
- **Esc** → fecha modais
- Arrastar card → muda a etapa (soltar em "Perdido" pede o motivo)
