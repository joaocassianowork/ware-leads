import { json, erro, normalizarTelefone } from "../../_shared.js";

// GET /api/clientes/:id -> cliente + notas + quem ele indicou + resumo financeiro
export async function onRequestGet({ params, env }) {
  const cliente = await env.DB.prepare("SELECT * FROM clientes WHERE id = ?").bind(params.id).first();
  if (!cliente) return erro("Cliente não encontrado", 404);

  const { results: notas } = await env.DB.prepare(
    "SELECT * FROM notas_cliente WHERE cliente_id = ? ORDER BY criado_em DESC"
  ).bind(params.id).all();

  const { results: indicados } = await env.DB.prepare(
    "SELECT id, nome, status, criado_em FROM clientes WHERE indicado_por_id = ? ORDER BY criado_em DESC"
  ).bind(params.id).all();

  const resumoFin = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0) as totalReceita,
       COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0) as totalDespesa,
       COUNT(*) as qtd
     FROM lancamentos WHERE cliente_id = ?`
  ).bind(params.id).first();

  return json({ ...cliente, notas, indicados, resumoFinanceiro: resumoFin });
}

// PATCH /api/clientes/:id
export async function onRequestPatch({ params, request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }

  const atual = await env.DB.prepare("SELECT * FROM clientes WHERE id = ?").bind(params.id).first();
  if (!atual) return erro("Cliente não encontrado", 404);

  const campos = ["nome", "empresa", "telefone", "email", "aniversario", "conta", "status", "origem", "indicado_por_id"];
  const sets = [];
  const binds = [];
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
  if ("mrr" in b) {
    sets.push("mrr = ?");
    binds.push(Number(b.mrr) || 0);
  }
  if (!sets.length) return json(atual);

  sets.push("atualizado_em = datetime('now')");
  await env.DB.prepare(`UPDATE clientes SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds, params.id)
    .run();

  const cliente = await env.DB.prepare("SELECT * FROM clientes WHERE id = ?").bind(params.id).first();
  return json(cliente);
}

// DELETE /api/clientes/:id
export async function onRequestDelete({ params, env }) {
  // desvincula lançamentos e indicados antes de excluir, pra não deixar referência quebrada
  await env.DB.prepare("UPDATE lancamentos SET cliente_id = NULL WHERE cliente_id = ?").bind(params.id).run();
  await env.DB.prepare("UPDATE clientes SET indicado_por_id = NULL WHERE indicado_por_id = ?").bind(params.id).run();
  await env.DB.prepare("DELETE FROM notas_cliente WHERE cliente_id = ?").bind(params.id).run();
  await env.DB.prepare("DELETE FROM clientes WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
