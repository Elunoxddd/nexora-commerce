import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-session.mjs";

const blockedPath = /(?:^|\/)\.(?:env(?:\.[^/]*)?|git|next|aws|codex|agents)(?:\/|$)|^\/(?:src|node_modules|next\.config(?:\.[^/]*)?|package(?:-lock)?\.json|tsconfig\.json|AGENTS\.md)(?:\/|$)/i;

function createCsp(nonce) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://res.cloudinary.com",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://wa.me",
    "frame-ancestors 'none'",
  ];

  if (!isDevelopment) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export async function proxy(request) {
  if (blockedPath.test(request.nextUrl.pathname)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const pathname = request.nextUrl.pathname;
  const isAdminLogin = pathname === "/admin/login" || pathname === "/api/admin/login";
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!(await verifyAdminSession(token))) return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (pathname.startsWith("/api/admin/") && !isAdminLogin) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!(await verifyAdminSession(token))) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = createCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
