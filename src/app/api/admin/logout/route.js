import { getAdminCookieOptions } from "@/lib/admin-session.mjs";
import { apiJson, sameOriginRequest } from "@/lib/admin-api";

export async function POST(request) {
  if (!sameOriginRequest(request)) return apiJson({ error: "Solicitud no válida." }, 403);
  const cookie = getAdminCookieOptions();
  const response = apiJson({ ok: true });
  response.headers.append("Set-Cookie", `${cookie.name}=; Path=${cookie.path}; Max-Age=0; HttpOnly; SameSite=Strict${cookie.secure ? "; Secure" : ""}`);
  return response;
}
