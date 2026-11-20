import { createOrderMessage, validateCheckoutPayload } from "@/lib/checkout.mjs";
import { isRateLimited } from "@/lib/rate-limit";
import { getProductsForCheckout } from "@/lib/product-repository";

const MAX_BODY_BYTES = 8_192;

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || request.headers.get("sec-fetch-site") === "cross-site") return false;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (!isSameOrigin(request)) return json({ error: "No pudimos validar esta solicitud." }, 403);
  if (isRateLimited(request, { namespace: "checkout", limit: 8, windowMs: 15 * 60 * 1000 })) {
    return json({ error: "Recibimos varias solicitudes. Espera un momento y vuelve a intentarlo." }, 429, { "Retry-After": "900" });
  }
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    return json({ error: "Formato de solicitud no válido." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "La solicitud supera el tamaño permitido." }, 413);

  let payload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: "La solicitud supera el tamaño permitido." }, 413);
    }
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "No pudimos leer los datos del pedido." }, 400);
  }

  let catalog;
  try { catalog = await getProductsForCheckout(); }
  catch { return json({ error: "No pudimos confirmar el catálogo. Inténtalo en un momento." }, 503); }
  const result = validateCheckoutPayload(payload, catalog);
  if (result.error) return json({ error: result.error }, 400);
  if (result.syncRequired) {
    return json({
      ok: false,
      code: "cart_outdated",
      message: "Actualizamos tu carrito con la disponibilidad y los precios vigentes. Revísalo antes de enviar el pedido.",
      removedItems: result.removedItems,
      updatedCart: result.updatedCart,
      changedItems: result.changedItems,
    }, 409);
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "573503728766";
  if (!/^\d{8,15}$/.test(whatsappNumber)) {
    return json({ error: "El canal de WhatsApp no está disponible. Escríbenos más tarde." }, 503);
  }

  const message = createOrderMessage(result.value);
  const checkoutUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  return json({ ok: true, checkoutUrl });
}
