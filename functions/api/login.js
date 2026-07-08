import { json, erro, tokenSessao } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  if (!env.APP_PASSWORD) {
    return erro("APP_PASSWORD não configurada no projeto (Settings > Variables)", 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return erro("Corpo inválido");
  }
  if (!body.senha || body.senha !== env.APP_PASSWORD) {
    return erro("Senha incorreta", 401);
  }
  const token = await tokenSessao(env.APP_PASSWORD);
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": `sessao=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 60}`,
    }
  );
}
