import { json, erro } from "../_shared.js";

// GET /api/metas?conta=PJ&ano=2026&mes=7
export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const chave = `${p.get("conta")}_${p.get("ano")}_${p.get("mes")}`;
  const meta = await env.DB.prepare("SELECT * FROM metas WHERE chave = ?").bind(chave).first();
  return json(meta || { valor: 0 });
}

// POST /api/metas { conta, ano, mes, valor }
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!b.conta || !b.ano || !b.mes || !b.valor) return erro("Campos obrigatórios ausentes");

  const chave = `${b.conta}_${b.ano}_${b.mes}`;
  await env.DB.prepare(
    `INSERT INTO metas (chave, conta, ano, mes, valor) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = datetime('now')`
  )
    .bind(chave, b.conta, b.ano, b.mes, Number(b.valor))
    .run();

  const meta = await env.DB.prepare("SELECT * FROM metas WHERE chave = ?").bind(chave).first();
  return json(meta);
}
