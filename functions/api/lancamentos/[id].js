import { json, erro } from "../../_shared.js";

export async function onRequestPatch({ params, request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }

  const atual = await env.DB.prepare("SELECT * FROM lancamentos WHERE id = ?").bind(params.id).first();
  if (!atual) return erro("Lançamento não encontrado", 404);

  const campos = ["data", "descricao", "categoria", "canal", "conta", "tipo", "status"];
  const sets = [];
  const binds = [];
  for (const c of campos) {
    if (c in b) {
      sets.push(`${c} = ?`);
      binds.push(b[c] === "" ? null : b[c]);
    }
  }
  if ("valor" in b) {
    sets.push("valor = ?");
    binds.push(Number(b.valor));
  }
  if ("cliente_id" in b) {
    sets.push("cliente_id = ?");
    binds.push(b.cliente_id || null);
  }
  if (!sets.length) return json(atual);

  sets.push("atualizado_em = datetime('now')");
  await env.DB.prepare(`UPDATE lancamentos SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds, params.id)
    .run();

  const lanc = await env.DB.prepare("SELECT * FROM lancamentos WHERE id = ?").bind(params.id).first();
  return json(lanc);
}

export async function onRequestDelete({ params, env }) {
  await env.DB.prepare("DELETE FROM lancamentos WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
