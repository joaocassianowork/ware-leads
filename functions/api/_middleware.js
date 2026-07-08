import { sessaoValida, erro } from "../_shared.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Login é a única rota aberta
  if (url.pathname === "/api/login") return next();

  if (!(await sessaoValida(request, env))) {
    return erro("Não autenticado", 401);
  }
  return next();
}
