const MAX_LINES = 10;
const MAX_QUANTITY = 15;

export function sanitizePlainText(value, maxLength) {
  if (typeof value !== "string") return "";

  return value
    .slice(0, maxLength * 2)
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[<>*_~`]/g, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);
}

function toPrice(product) {
  const rawPrice = product?.price;
  const price = typeof rawPrice === "number"
    ? rawPrice
    : typeof rawPrice === "string" && /^\$?\s*\d+(?:\.\d{3})*$/.test(rawPrice.trim())
      ? Number(rawPrice.replace(/\D/g, ""))
      : Number.NaN;
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export function isProductAvailable(product) {
  const availability = String(product?.availability || "").toLowerCase();
  return product?.active !== false &&
    product?.isActive !== false &&
    (product?.stock == null || (Number.isInteger(product.stock) && product.stock > 0)) &&
    !/(agotad|no disponible|desactivad|inactiv|retirad)/.test(availability);
}

export function validateCheckoutPayload(payload, products) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Revisa los datos del pedido e inténtalo de nuevo." };
  }

  if (!Array.isArray(products)) return { error: "No pudimos validar el catálogo." };
  const catalogById = new Map(products.map((product) => [product.id, product]));

  const customer = {
    name: sanitizePlainText(payload.customer?.name, 80),
    phone: sanitizePlainText(payload.customer?.phone, 24),
    department: sanitizePlainText(payload.customer?.department, 60),
    city: sanitizePlainText(payload.customer?.city, 60),
    address: sanitizePlainText(payload.customer?.address, 180),
    notes: sanitizePlainText(payload.customer?.notes, 240),
  };

  if (!customer.name || !customer.department || !customer.city || !customer.address) {
    return { error: "Completa los datos de envío obligatorios." };
  }
  if (!/^\+?[\d ()-]{7,24}$/.test(customer.phone) || customer.phone.replace(/\D/g, "").length < 7) {
    return { error: "Escribe un número de celular válido." };
  }

  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > MAX_LINES) {
    return { error: "El carrito no es válido. Actualízalo e inténtalo de nuevo." };
  }

  const seenIds = new Set();
  const items = [];
  const updatedCart = [];
  const removedItems = [];
  const changedItems = [];
  for (const entry of payload.items) {
    if (!entry || typeof entry.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || seenIds.has(entry.id)) {
      return { error: "El carrito contiene productos repetidos o inválidos." };
    }

    const product = catalogById.get(entry.id);
    const quantity = entry.quantity;
    const price = product && toPrice(product);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { error: "Un producto o su cantidad ya no son válidos. Actualiza el carrito." };
    }
    seenIds.add(entry.id);

    const clientName = sanitizePlainText(entry.name, 120);
    if (!product || !price || !isProductAvailable(product)) {
      removedItems.push({
        id: entry.id,
        name: clientName || (product ? sanitizePlainText(product.name, 120) : entry.id),
      });
      continue;
    }

    const availableQuantity = Number.isInteger(product.stock) ? Math.min(quantity, product.stock) : quantity;
    if (availableQuantity < 1) {
      removedItems.push({ id: entry.id, name: clientName || sanitizePlainText(product.name, 120) });
      continue;
    }

    const rawClientPrice = entry.price;
    const clientPrice = Number.isSafeInteger(rawClientPrice)
      ? rawClientPrice
      : typeof rawClientPrice === "string" && /^\$?\s*\d+(?:\.\d{3})*$/.test(rawClientPrice.trim())
        ? Number(rawClientPrice.replace(/\D/g, ""))
        : Number.NaN;
    const nameChanged = Boolean(clientName && clientName !== product.name);
    const priceChanged = Number.isSafeInteger(clientPrice) && clientPrice > 0 && clientPrice !== price;
    if (nameChanged || priceChanged || availableQuantity !== quantity) {
      changedItems.push({
        id: product.id,
        oldName: clientName || sanitizePlainText(product.name, 120),
        name: sanitizePlainText(product.name, 120),
        oldPrice: Number.isSafeInteger(clientPrice) && clientPrice > 0 ? clientPrice : price,
        price,
        ...(availableQuantity !== quantity ? { oldQuantity: quantity, quantity: availableQuantity } : {}),
      });
    }

    updatedCart.push({
      id: product.id,
      name: sanitizePlainText(product.name, 120),
      price,
      quantity: availableQuantity,
      image: typeof product.image === "string" ? product.image : "",
      category: sanitizePlainText(String(product.category || ""), 60),
      badge: sanitizePlainText(String(product.badge || ""), 50),
      stock: Number.isInteger(product.stock) ? product.stock : null,
      availability: sanitizePlainText(String(product.availability || ""), 80),
    });
    items.push({ id: product.id, name: product.name, quantity: availableQuantity, unitPrice: price });
  }

  if (removedItems.length || changedItems.length) {
    return {
      syncRequired: true,
      removedItems,
      updatedCart,
      changedItems,
    };
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(total) || total <= 0) {
    return { error: "No pudimos calcular el total. Escríbenos por WhatsApp." };
  }

  return { value: { customer, items, total } };
}

export function createOrderMessage({ customer, items, total }) {
  const formatCOP = (amount) => `$ ${amount.toLocaleString("es-CO")}`;
  return [
    "PEDIDO NUEVO — NEXORA",
    "",
    `Nombre: ${customer.name}`,
    `Celular: ${customer.phone}`,
    `Ciudad: ${customer.city}, ${customer.department}`,
    `Dirección: ${customer.address}`,
    `Notas: ${customer.notes || "Sin notas"}`,
    "",
    "PRODUCTOS:",
    ...items.map((item) => `• ${item.name} x${item.quantity} — ${formatCOP(item.unitPrice * item.quantity)}`),
    "",
    `TOTAL DE PRODUCTOS: ${formatCOP(total)}`,
    "Confirmen por favor disponibilidad, costo de envío y opciones de pago anticipado.",
  ].join("\n");
}
