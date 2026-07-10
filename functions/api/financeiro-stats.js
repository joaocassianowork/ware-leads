import { json } from "../_shared.js";

// GET /api/financeiro-stats?conta=PJ&ano=2026&mes=7
export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const conta = p.get("conta") || "PJ";
  const ano = parseInt(p.get("ano"), 10);
  const mes = parseInt(p.get("mes"), 10); // 1-12

  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  let sql = "SELECT * FROM lancamentos WHERE data >= ? AND data <= ?";
  const binds = [inicio, fim];
  if (conta !== "ALL") {
    sql += " AND conta = ?";
    binds.push(conta);
  }
  const { results: lancamentos } = await env.DB.prepare(sql).bind(...binds).all();

  const receitas = lancamentos.filter((l) => l.tipo === "receita");
  const despesas = lancamentos.filter((l) => l.tipo === "despesa");
  const totalReceita = receitas.reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesa = despesas.reduce((s, l) => s + Number(l.valor), 0);
  const lucro = totalReceita - totalDespesa;
  const margem = totalReceita > 0 ? Math.round((lucro / totalReceita) * 100) : 0;

  // meta
  const chave = `${conta}_${ano}_${mes}`;
  const metaRow = await env.DB.prepare("SELECT valor FROM metas WHERE chave = ?").bind(chave).first();
  const meta = metaRow ? Number(metaRow.valor) : 0;

  // canais (só receita)
  const canaisMap = {};
  receitas.forEach((r) => {
    const c = r.canal || "direto";
    canaisMap[c] = (canaisMap[c] || 0) + Number(r.valor);
  });
  const canais = Object.entries(canaisMap)
    .map(([canal, valor]) => ({ canal, valor }))
    .sort((a, b) => b.valor - a.valor);

  // categorias de despesa
  const catMap = {};
  despesas.forEach((d) => {
    const c = d.categoria || "Outros";
    catMap[c] = (catMap[c] || 0) + Number(d.valor);
  });
  const categorias = Object.entries(catMap)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  // alertas: contas pendentes vencendo nos próximos 7 dias (ou já vencidas)
  const hoje = new Date().toISOString().slice(0, 10);
  const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  let sqlContas = "SELECT * FROM contas_pagar_receber WHERE status = 'pendente' AND vencimento <= ?";
  const bindsContas = [em7];
  if (conta !== "ALL") {
    sqlContas += " AND conta = ?";
    bindsContas.push(conta);
  }
  const { results: contasPendentes } = await env.DB.prepare(sqlContas).bind(...bindsContas).all();

  const aReceber = contasPendentes.filter((c) => c.tipo === "receber").reduce((s, c) => s + Number(c.valor), 0);
  const vencendo = contasPendentes.filter((c) => c.tipo === "pagar" && c.vencimento >= hoje).length;
  const vencido = contasPendentes.filter((c) => c.tipo === "pagar" && c.vencimento < hoje).length;

  return json({
    totalReceita,
    totalDespesa,
    lucro,
    margem,
    qtdReceitas: receitas.length,
    qtdDespesas: despesas.length,
    meta,
    canais,
    categorias,
    alertas: { aReceber, vencendo, vencido },
  });
}
