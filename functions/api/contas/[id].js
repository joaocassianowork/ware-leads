import { json, erro } from "../../_shared.js";

export async function onRequestPatch({ params, request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }

  const atual = await env.DB.prepare("SELECT * FROM contas_pagar_receber WHERE id = ?").bind(params.id).first();
  if (!atual) return erro("Conta não encontrada", 404);

  const campos = ["descricao", "vencimento", "tipo", "conta", "categoria", "status"];
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
  if (!sets.length) return json(atual);

  sets.push("atualizado_em = datetime('now')");
  await env.DB.prepare(`UPDATE contas_pagar_receber SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds, params.id)
    .run();

  const conta = await env.DB.prepare("SELECT * FROM contas_pagar_receber WHERE id = ?").bind(params.id).first();
  return json(conta);
}

// DELETE /api/contas/:id       -> exclui só esta
// DELETE /api/contas/:id?serie=1 -> exclui esta e as futuras da mesma série recorrente
export async function onRequestDelete({ params, request, env }) {
  const serie = new URL(request.url).searchParams.get("serie") === "1";

  if (serie) {
    const atual = await env.DB.prepare("SELECT * FROM contas_pagar_receber WHERE id = ?").bind(params.id).first();
    if (atual && atual.serie_id) {
      const res = await env.DB.prepare(
        "DELETE FROM contas_pagar_receber WHERE serie_id = ? AND vencimento >= ?"
      ).bind(atual.serie_id, atual.vencimento).run();
      return json({ ok: true, excluidos: res.meta.changes });
    }
  }

  await env.DB.prepare("DELETE FROM contas_pagar_receber WHERE id = ?").bind(params.id).run();
  return json({ ok: true, excluidos: 1 });
}
