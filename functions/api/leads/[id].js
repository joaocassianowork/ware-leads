import { CONFIG, json, erro, normalizarTelefone } from "../../_shared.js";

const ETAPAS_VALIDAS = CONFIG.etapas.map((e) => e.id);

// GET /api/leads/:id  -> lead + notas
export async function onRequestGet({ params, env }) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(params.id).first();
  if (!lead) return erro("Lead não encontrado", 404);
  const { results: notas } = await env.DB.prepare(
    "SELECT * FROM notas WHERE lead_id = ? ORDER BY criado_em DESC"
  )
    .bind(params.id)
    .all();
  return json({ ...lead, notas });
}

// PATCH /api/leads/:id  { status?, nome?, empresa?, telefone?, email?, origem?, valor?, responsavel?, motivo_perda?, motivo_perda_obs? }
export async function onRequestPatch({ params, request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }

  const atual = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(params.id).first();
  if (!atual) return erro("Lead não encontrado", 404);

  const sets = [];
  const binds = [];

  const campos = ["nome", "empresa", "telefone", "email", "origem", "responsavel", "motivo_perda", "motivo_perda_obs"];
  for (const c of campos) {
    if (c in b) {
      sets.push(`${c} = ?`);
      binds.push(b[c] === "" ? null : b[c]);
    }
  }
  if ("telefone" in b) {
    sets.push("telefone_norm = ?");
    binds.push(normalizarTelefone(b.telefone));
  }
  if ("valor" in b) {
    sets.push("valor = ?");
    binds.push(Number(b.valor) || 0);
  }
  if ("status" in b) {
    if (!ETAPAS_VALIDAS.includes(b.status)) return erro("Etapa inválida");
    if (b.status !== atual.status) {
      sets.push("status = ?", "status_alterado_em = datetime('now')");
      binds.push(b.status);
      // Saiu de "perdido"? limpa o motivo
      if (atual.status === "perdido" && b.status !== "perdido") {
        sets.push("motivo_perda = NULL", "motivo_perda_obs = NULL");
      }
    }
  }

  if (!sets.length) return json(atual);

  sets.push("atualizado_em = datetime('now')");
  await env.DB.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds, params.id)
    .run();

  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(params.id).first();
  return json(lead);
}

// DELETE /api/leads/:id
export async function onRequestDelete({ params, env }) {
  await env.DB.prepare("DELETE FROM notas WHERE lead_id = ?").bind(params.id).run();
  await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
