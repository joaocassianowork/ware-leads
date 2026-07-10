import { json, erro, somarMeses } from "../_shared.js";

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

// POST /api/lancamentos { data, descricao, categoria, canal, conta, tipo, status, valor, repetir_meses? }
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!["receita", "despesa"].includes(b.tipo)) return erro("Tipo inválido");

  const descricao = (b.descricao && String(b.descricao).trim()) || "Sem descrição";
  const dataBase = b.data || new Date().toISOString().slice(0, 10);
  const valor = Number(b.valor) || 0;
  const categoria = b.categoria || null;
  const canal = b.tipo === "receita" ? b.canal || "direto" : null;
  const conta = b.conta || "PJ";
  const status = b.status || "pago";
  const clienteId = b.cliente_id || null;

  const repetirMeses = Math.min(Math.max(parseInt(b.repetir_meses, 10) || 1, 1), 36);
  const serieId = repetirMeses > 1 ? `s${Date.now()}${Math.floor(Math.random() * 1000)}` : null;

  let primeiroId = null;
  for (let i = 0; i < repetirMeses; i++) {
    const data = i === 0 ? dataBase : somarMeses(dataBase, i);
    const res = await env.DB.prepare(
      `INSERT INTO lancamentos (data, descricao, categoria, canal, conta, tipo, status, valor, cliente_id, serie_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(data, descricao, categoria, canal, conta, b.tipo, status, valor, clienteId, serieId)
      .run();
    if (i === 0) primeiroId = res.meta.last_row_id;
  }

  if (repetirMeses > 1) {
    return json({ recorrente: true, criados: repetirMeses, primeiroId }, 201);
  }
  const lanc = await env.DB.prepare("SELECT * FROM lancamentos WHERE id = ?").bind(primeiroId).first();
  return json(lanc, 201);
}
