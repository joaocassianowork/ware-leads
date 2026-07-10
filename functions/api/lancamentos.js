import { json, erro } from "../_shared.js";

// GET /api/lancamentos?conta=&inicio=&fim=&tipo=&status=&canal=&q=
export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const where = [];
  const binds = [];

  if (p.get("conta") && p.get("conta") !== "ALL") {
    where.push("conta = ?");
    binds.push(p.get("conta"));
  }
  if (p.get("inicio")) {
    where.push("data >= ?");
    binds.push(p.get("inicio"));
  }
  if (p.get("fim")) {
    where.push("data <= ?");
    binds.push(p.get("fim"));
  }
  if (p.get("tipo")) {
    where.push("tipo = ?");
    binds.push(p.get("tipo"));
  }
  if (p.get("status")) {
    where.push("status = ?");
    binds.push(p.get("status"));
  }
  if (p.get("canal")) {
    where.push("canal = ?");
    binds.push(p.get("canal"));
  }
  if (p.get("cliente")) {
    where.push("cliente_id = ?");
    binds.push(p.get("cliente"));
  }
  if (p.get("q")) {
    where.push("descricao LIKE ?");
    binds.push(`%${p.get("q")}%`);
  }

  const sql =
    "SELECT * FROM lancamentos" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY data DESC, id DESC";

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json(results);
}

// POST /api/lancamentos { data, descricao, categoria, canal, conta, tipo, status, valor }
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!["receita", "despesa"].includes(b.tipo)) return erro("Tipo inválido");

  const descricao = (b.descricao && String(b.descricao).trim()) || "Sem descrição";
  const data = b.data || new Date().toISOString().slice(0, 10);
  const valor = Number(b.valor) || 0;

  const res = await env.DB.prepare(
    `INSERT INTO lancamentos (data, descricao, categoria, canal, conta, tipo, status, valor, cliente_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      data,
      descricao,
      b.categoria || null,
      b.tipo === "receita" ? b.canal || "direto" : null,
      b.conta || "PJ",
      b.tipo,
      b.status || "pago",
      valor,
      b.cliente_id || null
    )
    .run();

  const lanc = await env.DB.prepare("SELECT * FROM lancamentos WHERE id = ?")
    .bind(res.meta.last_row_id)
    .first();
  return json(lanc, 201);
}
