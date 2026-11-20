import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-session.mjs";
import { verifyAdminPasswordHash } from "@/lib/admin-password.mjs";

export async function verifyAdminPassword(password) {
  return verifyAdminPasswordHash(password, process.env.ADMIN_PASSWORD_HASH || "");
}

export async function isAuthenticatedAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
}
