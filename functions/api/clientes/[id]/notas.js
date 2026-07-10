import { json, erro } from "../../../_shared.js";

// POST /api/clientes/:id/notas { texto, autor? }
export async function onRequestPost({ params, request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!b.texto || !String(b.texto).trim()) return erro("Texto é obrigatório");

  const cliente = await env.DB.prepare("SELECT id FROM clientes WHERE id = ?").bind(params.id).first();
  if (!cliente) return erro("Cliente não encontrado", 404);

  await env.DB.prepare("INSERT INTO notas_cliente (cliente_id, texto, autor) VALUES (?, ?, ?)")
    .bind(params.id, String(b.texto).trim(), b.autor || null)
    .run();

  const { results } = await env.DB.prepare(
    "SELECT * FROM notas_cliente WHERE cliente_id = ? ORDER BY criado_em DESC"
  ).bind(params.id).all();
  return json(results, 201);
}

// DELETE /api/clientes/:id/notas?nota=ID
export async function onRequestDelete({ params, request, env }) {
  const notaId = new URL(request.url).searchParams.get("nota");
  if (!notaId) return erro("Informe ?nota=ID");
  await env.DB.prepare("DELETE FROM notas_cliente WHERE id = ? AND cliente_id = ?")
    .bind(notaId, params.id)
    .run();
  return json({ ok: true });
}
