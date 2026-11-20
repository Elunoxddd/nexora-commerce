const SESSION_COOKIE = "nexora_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const encoder = new TextEncoder();

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptAdminSession() {
  const now = Math.floor(Date.now() / 1000);
  const session = { role: "admin", issuedAt: now, expiresAt: now + SESSION_TTL_SECONDS };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getSessionKey(), encoder.encode(JSON.stringify(session)));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(ciphertext))}`;
}

export async function verifyAdminSession(token) {
  if (typeof token !== "string" || token.length > 1024) return false;
  try {
    const [ivPart, ciphertextPart, extra] = token.split(".");
    if (!ivPart || !ciphertextPart || extra || ivPart.length > 32) return false;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64Url(ivPart) },
      await getSessionKey(),
      decodeBase64Url(ciphertextPart),
    );
    const session = JSON.parse(new TextDecoder().decode(plaintext));
    const now = Math.floor(Date.now() / 1000);
    return session?.role === "admin" && Number.isInteger(session.expiresAt) && session.expiresAt > now && session.issuedAt <= now;
  } catch {
    return false;
  }
}

export function getAdminCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export { SESSION_COOKIE };
