import { json, erro } from "../../../_shared.js";

// POST /api/leads/:id/notas  { texto, autor? }
export async function onRequestPost({ params, request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!b.texto || !String(b.texto).trim()) return erro("Texto é obrigatório");

  const lead = await env.DB.prepare("SELECT id FROM leads WHERE id = ?").bind(params.id).first();
  if (!lead) return erro("Lead não encontrado", 404);

  await env.DB.prepare("INSERT INTO notas (lead_id, texto, autor) VALUES (?, ?, ?)")
    .bind(params.id, String(b.texto).trim(), b.autor || null)
    .run();

  const { results } = await env.DB.prepare(
    "SELECT * FROM notas WHERE lead_id = ? ORDER BY criado_em DESC"
  )
    .bind(params.id)
    .all();
  return json(results, 201);
}

// DELETE /api/leads/:id/notas?nota=ID
export async function onRequestDelete({ params, request, env }) {
  const url = new URL(request.url);
  const notaId = url.searchParams.get("nota");
  if (!notaId) return erro("Informe ?nota=ID");
  await env.DB.prepare("DELETE FROM notas WHERE id = ? AND lead_id = ?")
    .bind(notaId, params.id)
    .run();
  return json({ ok: true });
}
