// ============================================================
// CONFIGURAÇÃO DO PIPELINE — edite apenas este arquivo
// ============================================================

export const CONFIG = {
  // Quem usa o sistema (aparece no cadastro e nos filtros)
  responsaveis: ["João", "Rebeca"],

  // De onde os leads chegam
  origens: [
    { id: "prospeccao", label: "Prospecção fria" },
    { id: "indicacao", label: "Indicação" },
    { id: "instagram", label: "Instagram" },
    { id: "parceiro", label: "Parceiro" },
    { id: "site", label: "Site" },
    { id: "outro", label: "Outro" },
  ],

  // Etapas do funil (ordem = ordem no kanban)
  etapas: [
    { id: "novo", label: "Novo", cor: "#4C7DF0" },
    { id: "contato", label: "Contato feito", cor: "#2FA8A0" },
    { id: "reuniao", label: "Reunião marcada", cor: "#8B5CF6" },
    { id: "proposta", label: "Proposta enviada", cor: "#E8A020" },
    { id: "fechado", label: "Fechado", cor: "#2E9E5B" },
    { id: "perdido", label: "Perdido", cor: "#C4534A" },
  ],

  // Motivos de perda padronizados
  motivosPerda: [
    { id: "preco", label: "Preço" },
    { id: "sumiu", label: "Parou de responder" },
    { id: "concorrente", label: "Fechou com outro" },
    { id: "sem_interesse", label: "Sem interesse agora" },
    { id: "sem_perfil", label: "Não tem perfil" },
    { id: "outro", label: "Outro" },
  ],

  // Follow-up: dias parado na etapa até alertar.
  // Amarelo = atingiu o prazo | Vermelho = 2x o prazo
  followUpDias: {
    novo: 1,
    contato: 2,
    reuniao: 2,
    proposta: 3,
  },

  // ---------- Financeiro ----------
  contas: [
    { id: "PJ", label: "PJ" },
    { id: "PF", label: "PF" },
  ],
  canais: [
    { id: "site", label: "Site" },
    { id: "marketing", label: "Marketing" },
    { id: "parceria", label: "Parceria" },
    { id: "indicacao", label: "Indicação" },
    { id: "direto", label: "Direto" },
    { id: "outro", label: "Outro" },
  ],

  // Categorias fixas de lançamento/conta (evita "Fixo" vs "fixo" vs "Fixos" bagunçando o dashboard)
  categorias: [
    "Fixo",
    "Variável",
    "Marketing",
    "Ferramentas/SaaS",
    "Impostos",
    "Folha/Pró-labore",
    "Comissão parceiro",
    "Serviços",
    "Outro",
  ],
};

// ---------- helpers ----------

export function normalizarTelefone(tel) {
  if (!tel) return null;
  const d = String(tel).replace(/\D/g, "");
  return d.length ? d : null;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export function erro(msg, status = 400) {
  return json({ erro: msg }, status);
}

// Cookie de sessão = HMAC-SHA256 da senha (não expõe a senha em si)
export async function tokenSessao(senha) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode("pipeline-v1::" + senha),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("sessao"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function lerCookie(request, nome) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp("(?:^|;\\s*)" + nome + "=([^;]+)"));
  return m ? m[1] : null;
}

export async function sessaoValida(request, env) {
  const senha = env.APP_PASSWORD;
  if (!senha) return false;
  const cookie = lerCookie(request, "sessao");
  if (!cookie) return false;
  return cookie === (await tokenSessao(senha));
}

// Soma N meses a uma data YYYY-MM-DD, ajustando pro último dia do mês quando necessário
// (ex: 31/01 + 1 mês = 28/02, não 03/03)
export function somarMeses(dataStr, n) {
  const [y, m, d] = dataStr.split("-").map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const dia = Math.min(d, ultimoDia);
  const mm = String(alvo.getMonth() + 1).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${alvo.getFullYear()}-${mm}-${dd}`;
}
