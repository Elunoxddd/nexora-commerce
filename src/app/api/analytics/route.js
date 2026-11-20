import { apiJson, sameOriginRequest } from "@/lib/admin-api";
import { appendAnalyticsEvent, isKnownProductId } from "@/lib/product-repository";
import { isRateLimited } from "@/lib/rate-limit";

const EVENT_TYPES = new Set(["product_view", "add_to_cart", "whatsapp_click"]);

export async function POST(request) {
  if (!sameOriginRequest(request)) return apiJson({ ok: true }, 202);
  if (isRateLimited(request, { namespace: "analytics", limit: 90, windowMs: 60_000 })) return apiJson({ ok: true }, 202);
  if (Number(request.headers.get("content-length") || 0) > 1_024) return apiJson({ ok: true }, 202);

  try {
    const { type, productId } = await request.json();
    if (!EVENT_TYPES.has(type) || typeof productId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId)) return apiJson({ ok: true }, 202);
    if (productId !== "nexora-store" && !(await isKnownProductId(productId))) return apiJson({ ok: true }, 202);
    await appendAnalyticsEvent({ type, productId });
  } catch {
    // Analytics are best-effort and should never interrupt the storefront.
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
