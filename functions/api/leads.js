import { CONFIG, json, erro, normalizarTelefone } from "../_shared.js";

const ETAPAS_VALIDAS = CONFIG.etapas.map((e) => e.id);

// GET /api/leads?status=&origem=&responsavel=&q=&desde=&ate=
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const where = [];
  const binds = [];

  if (p.get("status")) {
    where.push("status = ?");
    binds.push(p.get("status"));
  }
  if (p.get("origem")) {
    where.push("origem = ?");
    binds.push(p.get("origem"));
  }
  if (p.get("responsavel")) {
    where.push("responsavel = ?");
    binds.push(p.get("responsavel"));
  }
  if (p.get("q")) {
    where.push("(nome LIKE ? OR empresa LIKE ? OR telefone_norm LIKE ?)");
    const q = `%${p.get("q")}%`;
    binds.push(q, q, `%${p.get("q").replace(/\D/g, "")}%`);
  }
  if (p.get("desde")) {
    where.push("criado_em >= ?");
    binds.push(p.get("desde"));
  }
  if (p.get("ate")) {
    where.push("criado_em <= ?");
    binds.push(p.get("ate"));
  }

  const sql =
    "SELECT * FROM leads" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY status_alterado_em ASC";

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json(results);
}

// POST /api/leads  { nome, empresa, telefone, email, origem, valor, responsavel, nota }
// ?force=1 ignora checagem de duplicado
export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!b.nome || !String(b.nome).trim()) return erro("Nome é obrigatório");

  const telNorm = normalizarTelefone(b.telefone);
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  // Duplicado: mesmo telefone em lead que não foi perdido
  if (telNorm && !force) {
    const dup = await env.DB.prepare(
      "SELECT id, nome, status FROM leads WHERE telefone_norm = ? AND status != 'perdido' LIMIT 1"
    )
      .bind(telNorm)
      .first();
    if (dup) {
      return json({ duplicado: true, lead: dup }, 409);
    }
  }

  const status = ETAPAS_VALIDAS.includes(b.status) ? b.status : "novo";

  const res = await env.DB.prepare(
    `INSERT INTO leads (nome, empresa, telefone, telefone_norm, email, origem, valor, responsavel, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      String(b.nome).trim(),
      b.empresa || null,
      b.telefone || null,
      telNorm,
      b.email || null,
      b.origem || "outro",
      Number(b.valor) || 0,
      b.responsavel || null,
      status
    )
    .run();

  const id = res.meta.last_row_id;

  if (b.nota && String(b.nota).trim()) {
    await env.DB.prepare("INSERT INTO notas (lead_id, texto, autor) VALUES (?, ?, ?)")
      .bind(id, String(b.nota).trim(), b.responsavel || null)
      .run();
  }

  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
  return json(lead, 201);
}
