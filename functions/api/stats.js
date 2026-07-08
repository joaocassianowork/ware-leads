import { CONFIG, json } from "../_shared.js";

// GET /api/stats?dias=30
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const dias = Math.max(1, parseInt(url.searchParams.get("dias") || "30", 10));
  const corte = `datetime('now', '-${dias} days')`;

  // Funil atual (estado de agora, independente do período)
  const { results: funil } = await env.DB.prepare(
    "SELECT status, COUNT(*) as qtd, COALESCE(SUM(valor),0) as valor FROM leads GROUP BY status"
  ).all();

  // Novos criados no período
  const novos = await env.DB.prepare(
    `SELECT COUNT(*) as qtd FROM leads WHERE criado_em >= ${corte}`
  ).first();

  // Fechados no período (mudaram para fechado dentro do período)
  const fechados = await env.DB.prepare(
    `SELECT COUNT(*) as qtd, COALESCE(SUM(valor),0) as valor FROM leads
     WHERE status = 'fechado' AND status_alterado_em >= ${corte}`
  ).first();

  // Perdidos no período + motivos
  const perdidos = await env.DB.prepare(
    `SELECT COUNT(*) as qtd FROM leads
     WHERE status = 'perdido' AND status_alterado_em >= ${corte}`
  ).first();

  const { results: motivos } = await env.DB.prepare(
    `SELECT COALESCE(motivo_perda,'outro') as motivo, COUNT(*) as qtd FROM leads
     WHERE status = 'perdido' AND status_alterado_em >= ${corte}
     GROUP BY motivo_perda ORDER BY qtd DESC`
  ).all();

  // Origem dos leads criados no período
  const { results: origens } = await env.DB.prepare(
    `SELECT COALESCE(origem,'outro') as origem, COUNT(*) as qtd,
            SUM(CASE WHEN status='fechado' THEN 1 ELSE 0 END) as fechados
     FROM leads WHERE criado_em >= ${corte}
     GROUP BY origem ORDER BY qtd DESC`
  ).all();

  // Follow-ups pendentes (etapas ativas paradas além do prazo)
  const etapasAtivas = Object.keys(CONFIG.followUpDias);
  const { results: ativos } = await env.DB.prepare(
    `SELECT id, nome, empresa, telefone, status, responsavel, valor, status_alterado_em,
            CAST(julianday('now') - julianday(status_alterado_em) AS REAL) as dias_parado
     FROM leads WHERE status IN (${etapasAtivas.map(() => "?").join(",")})
     ORDER BY dias_parado DESC`
  )
    .bind(...etapasAtivas)
    .all();

  const followups = ativos
    .map((l) => ({ ...l, prazo: CONFIG.followUpDias[l.status] }))
    .filter((l) => l.dias_parado >= l.prazo);

  const fechadosQtd = fechados?.qtd || 0;
  const perdidosQtd = perdidos?.qtd || 0;
  const decididos = fechadosQtd + perdidosQtd;

  return json({
    dias,
    funil,
    novos: novos?.qtd || 0,
    fechados: { qtd: fechadosQtd, valor: fechados?.valor || 0 },
    perdidos: { qtd: perdidosQtd, motivos },
    conversao: decididos ? fechadosQtd / decididos : null,
    origens,
    followups,
  });
}
