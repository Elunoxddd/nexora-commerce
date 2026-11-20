export function trackStoreEvent(type, productId) {
  if (!productId) return;
  if (type === "product_view") {
    try {
      const key = `nexora-viewed:${productId}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch { /* analytics are optional when storage is blocked */ }
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, productId }),
    keepalive: true,
  }).catch(() => {});
}
