import { encryptAdminSession, getAdminCookieOptions } from "@/lib/admin-session.mjs";
import { sameOriginRequest, apiJson } from "@/lib/admin-api";
import { verifyAdminPassword } from "@/lib/admin-auth";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request) {
  if (!sameOriginRequest(request)) return apiJson({ error: "Solicitud no válida." }, 403);
  if (isRateLimited(request, { namespace: "admin-login", limit: 6, windowMs: 15 * 60 * 1000 })) {
    return apiJson({ error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." }, 429, { "Retry-After": "900" });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) return apiJson({ error: "La solicitud supera el tamaño permitido." }, 413);

  let password;
  try { password = (await request.json()).password; } catch { return apiJson({ error: "No pudimos leer la clave." }, 400); }
  if (!process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_SESSION_SECRET) {
    return apiJson({ error: "El acceso al panel aún no está configurado." }, 503);
  }
  if (!(await verifyAdminPassword(password))) return apiJson({ error: "La clave no coincide." }, 401);

  let token;
  try { token = await encryptAdminSession(); } catch { return apiJson({ error: "No pudimos iniciar la sesión." }, 503); }
  const cookie = getAdminCookieOptions();
  const response = apiJson({ ok: true });
  response.headers.append("Set-Cookie", `${cookie.name}=${token}; Path=${cookie.path}; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Strict${cookie.secure ? "; Secure" : ""}`);
  return response;
}
