import { json, erro } from "../_shared.js";

// GET /api/contas?conta=&tipo=&status=
export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const where = [];
  const binds = [];

  if (p.get("conta") && p.get("conta") !== "ALL") {
    where.push("conta = ?");
    binds.push(p.get("conta"));
  }
  if (p.get("tipo")) {
    where.push("tipo = ?");
    binds.push(p.get("tipo"));
  }
  if (p.get("status")) {
    where.push("status = ?");
    binds.push(p.get("status"));
  }

  const sql =
    "SELECT * FROM contas_pagar_receber" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY vencimento ASC";

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json(results);
}

// POST /api/contas { descricao, valor, vencimento, tipo, conta, categoria }
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!b.descricao || !b.valor || !b.vencimento) return erro("Descrição, valor e vencimento são obrigatórios");
  if (!["pagar", "receber"].includes(b.tipo)) return erro("Tipo inválido");

  const res = await env.DB.prepare(
    `INSERT INTO contas_pagar_receber (descricao, valor, vencimento, tipo, conta, categoria, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pendente')`
  )
    .bind(
      String(b.descricao).trim(),
      Number(b.valor),
      b.vencimento,
      b.tipo,
      b.conta || "PJ",
      b.categoria || null
    )
    .run();

  const conta = await env.DB.prepare("SELECT * FROM contas_pagar_receber WHERE id = ?")
    .bind(res.meta.last_row_id)
    .first();
  return json(conta, 201);
}
