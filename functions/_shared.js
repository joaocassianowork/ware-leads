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
