import assert from "node:assert/strict";
import test from "node:test";
import { createOrderMessage, sanitizePlainText, validateCheckoutPayload } from "../src/lib/checkout.mjs";

const catalog = [
  { id: "lamp", name: "Lámpara", price: "$89.900", stock: 2 },
  { id: "mug", name: "Taza", price: "$19.500" },
];

const validPayload = {
  customer: {
    name: "Ana Pérez",
    phone: "300 123 4567",
    department: "Cundinamarca",
    city: "Bogotá",
    address: "Calle 10 # 20-30",
    notes: "Timbre azul",
  },
  items: [{ id: "lamp", quantity: 2 }],
};

test("refreshes stale client names and prices from the server catalog", () => {
  const result = validateCheckoutPayload({
    ...validPayload,
    total: 1,
    items: [{ id: "lamp", quantity: 2, name: "Precio alterado", price: 1 }],
  }, catalog);

  assert.equal(result.syncRequired, true);
  const refreshed = validateCheckoutPayload({
    ...validPayload,
    items: result.updatedCart.map(({ id, quantity, name, price }) => ({ id, quantity, name, price })),
  }, catalog);
  assert.equal(refreshed.value.total, 179_800);
  assert.equal(refreshed.value.items[0].name, "Lámpara");
  assert.equal(refreshed.value.items[0].unitPrice, 89_900);
});

test("returns a cart refresh when a product is no longer in the server catalog", () => {
  const result = validateCheckoutPayload({
    ...validPayload,
    items: [{ id: "hidden-item", quantity: 1, name: "Producto retirado", price: 2500 }],
  }, catalog);

  assert.equal(result.syncRequired, true);
  assert.deepEqual(result.removedItems, [{ id: "hidden-item", name: "Producto retirado" }]);
  assert.deepEqual(result.updatedCart, []);
});

test("rejects invalid quantities and duplicate product lines", () => {
  assert.ok(validateCheckoutPayload({ ...validPayload, items: [{ id: "lamp", quantity: 0 }] }, catalog).error);
  assert.ok(validateCheckoutPayload({ ...validPayload, items: [{ id: "lamp", quantity: 1 }, { id: "lamp", quantity: 2 }] }, catalog).error);
});

test("updates a cart quantity to the remaining stock", () => {
  const result = validateCheckoutPayload({ ...validPayload, items: [{ id: "lamp", quantity: 3 }] }, catalog);
  assert.equal(result.syncRequired, true);
  assert.deepEqual(result.updatedCart.map(({ id, quantity }) => ({ id, quantity })), [{ id: "lamp", quantity: 2 }]);
  assert.equal(result.changedItems[0].oldQuantity, 3);
  assert.equal(result.changedItems[0].quantity, 2);
});

test("returns a cart refresh for products marked unavailable", () => {
  const result = validateCheckoutPayload({ ...validPayload, items: [{ id: "lamp", quantity: 1 }] }, [{ ...catalog[0], availability: "Agotado" }]);
  assert.equal(result.syncRequired, true);
  assert.deepEqual(result.removedItems, [{ id: "lamp", name: "Lámpara" }]);
  assert.deepEqual(result.updatedCart, []);
});

test("treats deactivated products and zero stock as unavailable", () => {
  for (const product of [
    { ...catalog[0], availability: "Desactivado" },
    { ...catalog[0], stock: 0 },
  ]) {
    const result = validateCheckoutPayload({ ...validPayload, items: [{ id: "lamp", quantity: 1 }] }, [product]);
    assert.equal(result.syncRequired, true);
    assert.deepEqual(result.removedItems, [{ id: "lamp", name: "Lámpara" }]);
  }
});

test("returns current product data when the saved name or price has changed", () => {
  const result = validateCheckoutPayload({
    ...validPayload,
    items: [{ id: "lamp", quantity: 1, name: "Nombre anterior", price: 80_000 }],
  }, catalog);

  assert.equal(result.syncRequired, true);
  assert.equal(result.updatedCart[0].name, "Lámpara");
  assert.equal(result.updatedCart[0].price, 89_900);
  assert.deepEqual(result.changedItems[0], {
    id: "lamp",
    oldName: "Nombre anterior",
    name: "Lámpara",
    oldPrice: 80_000,
    price: 89_900,
  });
});

test("successful orders use fresh server prices and quantities only", () => {
  const result = validateCheckoutPayload({
    ...validPayload,
    items: [{ id: "lamp", quantity: 2, name: "Lámpara", price: 1 }],
  }, catalog);

  assert.equal(result.syncRequired, true);
  const refreshed = validateCheckoutPayload({
    ...validPayload,
    items: result.updatedCart.map(({ id, quantity, name, price }) => ({ id, quantity, name, price })),
  }, catalog);
  assert.equal(refreshed.value.total, 179_800);
});

test("sanitizes control characters, markup and multiline customer input", () => {
  const cleaned = sanitizePlainText("Ana\n<script>*hola*</script>\u202E", 80);
  assert.doesNotMatch(cleaned, /[<>\n\u202e*]/);
  assert.match(cleaned, /^Ana/);
});

test("formats only validated customer and server catalog values into the WhatsApp message", () => {
  const result = validateCheckoutPayload(validPayload, catalog);
  const message = createOrderMessage(result.value);

  assert.match(message, /Lámpara x2 — \$ 179\.800/);
  assert.match(message, /TOTAL DE PRODUCTOS: \$ 179\.800/);
  assert.match(message, /opciones de pago anticipado/);
  assert.doesNotMatch(message, /Sin verificar/);
});
