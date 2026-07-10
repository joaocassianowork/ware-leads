import { json, erro, somarMeses } from "../_shared.js";

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

// POST /api/contas { descricao, valor, vencimento, tipo, conta, categoria, repetir_meses? }
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!["pagar", "receber"].includes(b.tipo)) return erro("Tipo inválido");

  const descricao = (b.descricao && String(b.descricao).trim()) || "Sem descrição";
  const vencimentoBase = b.vencimento || new Date().toISOString().slice(0, 10);
  const valor = Number(b.valor) || 0;
  const conta = b.conta || "PJ";
  const categoria = b.categoria || null;

  const repetirMeses = Math.min(Math.max(parseInt(b.repetir_meses, 10) || 1, 1), 36);
  const serieId = repetirMeses > 1 ? `s${Date.now()}${Math.floor(Math.random() * 1000)}` : null;

  let primeiroId = null;
  for (let i = 0; i < repetirMeses; i++) {
    const vencimento = i === 0 ? vencimentoBase : somarMeses(vencimentoBase, i);
    const res = await env.DB.prepare(
      `INSERT INTO contas_pagar_receber (descricao, valor, vencimento, tipo, conta, categoria, status, serie_id)
       VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)`
    )
      .bind(descricao, valor, vencimento, b.tipo, conta, categoria, serieId)
      .run();
    if (i === 0) primeiroId = res.meta.last_row_id;
  }

  if (repetirMeses > 1) {
    return json({ recorrente: true, criados: repetirMeses, primeiroId }, 201);
  }
  const conta_ = await env.DB.prepare("SELECT * FROM contas_pagar_receber WHERE id = ?").bind(primeiroId).first();
  return json(conta_, 201);
}
