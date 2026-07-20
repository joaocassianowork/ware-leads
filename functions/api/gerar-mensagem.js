import { erro, json } from "../_shared.js";

// POST /api/gerar-mensagem  { nome, cidade, area }
// Requer secret ANTHROPIC_API_KEY configurada no projeto (Settings > Variables).
export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return erro("ANTHROPIC_API_KEY não configurada no projeto (Settings > Variables)", 500);
  }

  let b;
  try {
    b = await request.json();
  } catch {
    return erro("Corpo inválido");
  }

  const nome = (b.nome || "").trim();
  const cidade = (b.cidade || "").trim();
  const area = (b.area || "").trim();

  const prompt = `Você está ajudando a escrever UMA mensagem curta de WhatsApp (2-3 frases, no máximo 400 caracteres) para prospecção fria de um escritório de advocacia, enviada pela Ware Jurídico (agência que cria sites e presença digital para advogados).

Dados do contato:
- Nome/escritório: ${nome || "(desconhecido, trate de forma neutra e cordial)"}
- Cidade: ${cidade || "(não informado)"}
- Área de atuação: ${area || "(não informado)"}

Regras:
- Tom humano, direto, sem parecer copiado e colado, sem parecer robô ou automação
- Mencione algo específico e plausível sobre o site ou presença digital do escritório que pode ser melhorado (varie o gancho: às vezes fale de velocidade, às vezes de não aparecer no Google, às vezes de não ter site, às vezes de credibilidade)
- Nunca use a mesma frase de abertura duas vezes — seja criativo e varie a estrutura da frase
- Não use emojis
- Não assine com nome de empresa no final, isso já foi mencionado no meio do texto naturalmente
- Retorne APENAS o texto da mensagem, sem aspas, sem explicação, sem markdown`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detalhe = await res.text();
      return erro("Falha ao gerar mensagem: " + detalhe, 502);
    }

    const data = await res.json();
    const texto = (data.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();

    return json({ mensagem: texto || null });
  } catch (e) {
    return erro("Erro ao chamar a API: " + e.message, 502);
  }
}
