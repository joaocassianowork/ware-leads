import { json, erro, normalizarTelefone } from "../_shared.js";

// GET /api/clientes?status=ativo&conta=PJ&q=busca
export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const where = [];
  const binds = [];

  if (p.get("status")) {
    where.push("status = ?");
    binds.push(p.get("status"));
  }
  if (p.get("conta") && p.get("conta") !== "ALL") {
    where.push("conta = ?");
    binds.push(p.get("conta"));
  }
  if (p.get("q")) {
    where.push("(nome LIKE ? OR empresa LIKE ? OR telefone_norm LIKE ?)");
    const q = `%${p.get("q")}%`;
    binds.push(q, q, `%${p.get("q").replace(/\D/g, "")}%`);
  }

  const sql =
    "SELECT * FROM clientes" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY nome ASC";

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json(results);
}

// POST /api/clientes { nome, empresa, telefone, email, aniversario, mrr, conta, origem, lead_id, indicado_por_id }
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  const nome = (b.nome && String(b.nome).trim()) || "";
  if (!nome) return erro("Nome é obrigatório");

  const telNorm = normalizarTelefone(b.telefone);

  const res = await env.DB.prepare(
    `INSERT INTO clientes (nome, empresa, telefone, telefone_norm, email, aniversario, mrr, conta, status, origem, lead_id, indicado_por_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?)`
  )
    .bind(
      nome,
      b.empresa || null,
      b.telefone || null,
      telNorm,
      b.email || null,
      b.aniversario || null,
      Number(b.mrr) || 0,
      b.conta || "PJ",
      b.origem || null,
      b.lead_id || null,
      b.indicado_por_id || null
    )
    .run();

  const cliente = await env.DB.prepare("SELECT * FROM clientes WHERE id = ?")
    .bind(res.meta.last_row_id)
    .first();
  return json(cliente, 201);
}
