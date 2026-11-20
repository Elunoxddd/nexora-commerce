import assert from "node:assert/strict";
import test from "node:test";
import { verifyAdminSession, encryptAdminSession } from "../src/lib/admin-session.mjs";
import { hashAdminPassword, verifyAdminPasswordHash } from "../src/lib/admin-password.mjs";
import { validateProductInput } from "../src/lib/product-validation.mjs";

process.env.ADMIN_SESSION_SECRET = "a-test-only-session-secret-with-more-than-thirty-two-characters";

const validProduct = {
  name: "Lámpara de mesa",
  description: "Ilumina tu espacio de lectura.",
  price: 89900,
  compareAtPrice: 99900,
  costPrice: 50000,
  category: "Hogar",
  stock: 4,
  badge: "Nuevo",
  image: "/plancha.webp",
  imagePublicId: "",
  sortOrder: 1,
  availability: "Disponible",
  shipping: "Envío nacional.",
  warranty: "Garantía de fábrica.",
  benefits: ["Luz cálida"],
  specifications: [{ label: "Color", value: "Negro" }],
};

test("admin password hash round trips and accepts the legacy format and pasted env line", async () => {
  const password = "Prueba-segura-123!";
  const hash = hashAdminPassword(password);
  assert.match(hash, /^scrypt:/);
  assert.equal(await verifyAdminPasswordHash(password, hash), true);
  assert.equal(await verifyAdminPasswordHash("otra-clave", hash), false);
  assert.equal(await verifyAdminPasswordHash(password, `ADMIN_PASSWORD_HASH="${hash}"`), true);
  assert.equal(await verifyAdminPasswordHash(password, hash.replaceAll(":", "$")), true);
});

test("admin session is encrypted and rejects tampering", async () => {
  const token = await encryptAdminSession();
  assert.equal(await verifyAdminSession(token), true);
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(await verifyAdminSession(tampered), false);
  assert.equal(await verifyAdminSession("invalid"), false);
});

test("admin product validation rejects price and stock manipulation", () => {
  assert.equal(validateProductInput(validProduct).value.price, 89900);
  assert.ok(validateProductInput({ ...validProduct, price: "89hack900" }).error);
  assert.ok(validateProductInput({ ...validProduct, stock: -1 }).error);
  assert.ok(validateProductInput({ ...validProduct, id: "new-item", stock: null }).error);
  assert.ok(validateProductInput({ ...validProduct, compareAtPrice: 80000 }).error);
});

test("admin product validation only accepts local assets or Cloudinary HTTPS images", () => {
  assert.ok(validateProductInput({ ...validProduct, image: "javascript:alert(1)" }).error);
  assert.ok(validateProductInput({ ...validProduct, image: "https://untrusted.example/payload.svg" }).error);
  assert.equal(validateProductInput({ ...validProduct, image: "https://res.cloudinary.com/demo/image/upload/f_webp,q_auto/a.webp" }).value.image.startsWith("https://"), true);
});
