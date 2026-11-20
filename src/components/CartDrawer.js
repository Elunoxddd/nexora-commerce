"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatCOP, useCart } from "@/context/CartContext";
import { trackStoreEvent } from "@/lib/analytics-client";

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  department: "",
  city: "",
  address: "",
  notes: "",
};

export default function CartDrawer() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalPrice,
    totalItems,
    isCartOpen,
    closeCart,
    isCatalogSyncing,
    isCatalogReady,
    catalogSyncError,
    refreshCatalog,
    syncNotices,
    clearSyncNotices,
    applyCheckoutCartUpdate,
  } = useCart();
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (isCartOpen) closeButtonRef.current?.focus();
  }, [isCartOpen]);

  function updateCustomer(event) {
    setCustomer((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFormError("");
  }

  async function handleCheckout(event) {
    event.preventDefault();
    if (isSubmitting) return;
    if (isCatalogSyncing || !isCatalogReady || catalogSyncError) {
      setFormError("Espera a que confirmemos el catálogo actual antes de enviar el pedido.");
      return;
    }
    const requiredFields = ["name", "phone", "department", "city", "address"];
    const isComplete = requiredFields.every((field) => customer[field].trim());

    if (!cart.length) {
      setFormError("Agrega al menos un producto antes de continuar.");
      return;
    }

    if (!isComplete) {
      setFormError("Completa los datos de envío marcados como obligatorios.");
      return;
    }

    const checkoutTab = window.open("about:blank", "_blank");
    if (checkoutTab) checkoutTab.opener = null;
    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            name: item.name,
            price: Number(String(item.price).replace(/[^\d]/g, "")),
          })),
        }),
      });
      const result = await response.json();
      if (response.status === 409 && result.code === "cart_outdated") {
        checkoutTab?.close();
        applyCheckoutCartUpdate(result);
        setFormError("");
        return;
      }
      if (!response.ok || typeof result.checkoutUrl !== "string" || !result.checkoutUrl.startsWith("https://wa.me/")) {
        throw new Error(result.error || "No pudimos preparar el pedido. Inténtalo de nuevo.");
      }

      clearCart();
      trackStoreEvent("whatsapp_click", "nexora-store");
      setCustomer(EMPTY_CUSTOMER);
      closeCart();
      if (checkoutTab) checkoutTab.location.replace(result.checkoutUrl);
      else window.location.assign(result.checkoutUrl);
    } catch (error) {
      checkoutTab?.close();
      setFormError(error instanceof Error ? error.message : "No pudimos preparar el pedido. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className={`fixed inset-0 z-50 ${isCartOpen ? "visible" : "invisible pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Cerrar carrito"
          tabIndex={isCartOpen ? 0 : -1}
          onClick={closeCart}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ${isCartOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`cart-panel absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300 ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
          aria-hidden={!isCartOpen}
        >
          <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#18845d]">Nexora</p>
              <h2 id="cart-title" className="mt-1 text-xl font-bold text-gray-950">Tu carrito <span className="text-gray-400">({totalItems})</span></h2>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeCart} aria-label="Cerrar carrito" className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">×</button>
          </header>

          {(syncNotices.removedItems.length > 0 || syncNotices.changedItems.length > 0) && (
            <section className="cart-sync-notice" role="status" aria-live="polite">
              <div className="cart-sync-notice-heading">
                <strong>Tu carrito está actualizado</strong>
                <button type="button" onClick={clearSyncNotices} aria-label="Cerrar aviso del carrito">×</button>
              </div>
              {syncNotices.removedItems.length > 0 && (
                <p>Retiramos productos que ya no están disponibles: {syncNotices.removedItems.map((item) => item.name).join(", ")}.</p>
              )}
              {syncNotices.changedItems.map((item, index) => (
                <p key={`${item.id}-${item.oldQuantity || ""}-${index}`}>
                  {item.oldPrice > 0 && item.oldPrice !== item.price
                    ? `El precio de ${item.name} cambió de ${formatCOP(item.oldPrice)} a ${formatCOP(item.price)}.`
                    : item.oldName !== item.name
                      ? `Actualizamos el nombre del producto ${item.oldName} a ${item.name}.`
                      : `Ajustamos la cantidad de ${item.name} a ${item.quantity} por disponibilidad.`}
                </p>
              ))}
            </section>
          )}
          {catalogSyncError && (
            <div className="cart-sync-error" role="alert">
              <p>{catalogSyncError} No podrás enviar el pedido hasta validar los productos.</p>
              <button type="button" onClick={() => void refreshCatalog()} disabled={isCatalogSyncing}>
                {isCatalogSyncing ? "Verificando…" : "Intentar de nuevo"}
              </button>
            </div>
          )}
          {isCartOpen && isCatalogSyncing && <p className="cart-sync-loading" role="status">Confirmando disponibilidad y precios…</p>}

          {cart.length === 0 ? (
            totalItems > 0 && (isCatalogSyncing || catalogSyncError) ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <h3 className="text-lg font-bold text-gray-900">{isCatalogSyncing ? "Revisando tu carrito" : "No pudimos cargar tus productos"}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-gray-600">
                  {isCatalogSyncing ? "Estamos confirmando sus nombres, precios y disponibilidad actual." : "Intenta validar el catálogo de nuevo para recuperar tu carrito guardado."}
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#004B36]" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
                </span>
                <h3 className="mt-5 text-lg font-bold text-gray-900">Tu carrito está esperando</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-gray-600">Explora el catálogo y agrega los productos que te interesan. Te ayudaremos a coordinar el envío por WhatsApp.</p>
                <Link href="/#catalogo" onClick={closeCart} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#004B36] px-5 font-semibold text-white transition hover:bg-[#006148]">Ir al catálogo</Link>
              </div>
            )
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-5 py-5 sm:px-7">
                {cart.map((item) => (
                  <article key={item.id} className="flex gap-4 border-b border-gray-100 pb-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-5 text-gray-900">{item.name}</h3>
                        <button type="button" onClick={() => removeFromCart(item.id)} aria-label={`Eliminar ${item.name} del carrito`} className="rounded-md px-2 text-lg leading-6 text-gray-400 transition hover:bg-red-50 hover:text-red-600">×</button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{formatCOP(Number(String(item.price).replace(/[^\d]/g, "")))} c/u</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-gray-200">
                          <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Restar una unidad de ${item.name}`} className="h-8 w-9 text-lg text-gray-600 transition hover:bg-gray-50">−</button>
                          <span aria-label={`Cantidad: ${item.quantity}`} className="min-w-8 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Agregar una unidad de ${item.name}`} className="h-8 w-9 text-lg text-gray-600 transition hover:bg-gray-50">+</button>
                        </div>
                        <p className="text-sm font-bold text-[#004B36]">{formatCOP(Number(String(item.price).replace(/[^\d]/g, "")) * item.quantity)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <form onSubmit={handleCheckout} className="space-y-5 px-5 pb-8 sm:px-7">
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <span className="font-semibold text-gray-700">Total del pedido</span>
                  <span className="text-xl font-extrabold text-[#004B36]">{formatCOP(totalPrice)} COP</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-950">Datos para el envío</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Completa tus datos y coordinaremos el pedido por WhatsApp.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700 sm:col-span-2">Nombre y apellidos
                    <input required maxLength={80} autoComplete="name" name="name" value={customer.name} onChange={updateCustomer} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base font-normal outline-none transition placeholder:text-gray-400 focus:border-[#18845d] focus:ring-2 focus:ring-emerald-100" placeholder="Como aparece en tu documento" />
                  </label>
                  <label className="text-sm font-medium text-gray-700 sm:col-span-2">Celular / WhatsApp
                    <input required maxLength={24} autoComplete="tel" inputMode="tel" name="phone" value={customer.phone} onChange={updateCustomer} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base font-normal outline-none transition placeholder:text-gray-400 focus:border-[#18845d] focus:ring-2 focus:ring-emerald-100" placeholder="300 123 4567" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Departamento
                    <input required maxLength={60} autoComplete="address-level1" name="department" value={customer.department} onChange={updateCustomer} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base font-normal outline-none transition placeholder:text-gray-400 focus:border-[#18845d] focus:ring-2 focus:ring-emerald-100" placeholder="Ej. Antioquia" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Ciudad / municipio
                    <input required maxLength={60} autoComplete="address-level2" name="city" value={customer.city} onChange={updateCustomer} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base font-normal outline-none transition placeholder:text-gray-400 focus:border-[#18845d] focus:ring-2 focus:ring-emerald-100" placeholder="Ej. Medellín" />
                  </label>
                  <label className="text-sm font-medium text-gray-700 sm:col-span-2">Dirección completa
                    <input required maxLength={180} autoComplete="street-address" name="address" value={customer.address} onChange={updateCustomer} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base font-normal outline-none transition placeholder:text-gray-400 focus:border-[#18845d] focus:ring-2 focus:ring-emerald-100" placeholder="Barrio, calle/carrera, casa o apartamento" />
                  </label>
                  <label className="text-sm font-medium text-gray-700 sm:col-span-2">Notas de entrega <span className="font-normal text-gray-400">(opcional)</span>
                    <textarea name="notes" maxLength={240} value={customer.notes} onChange={updateCustomer} rows={2} className="mt-1.5 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-base font-normal outline-none transition placeholder:text-gray-400 focus:border-[#18845d] focus:ring-2 focus:ring-emerald-100" placeholder="Punto de referencia u horario preferido" />
                  </label>
                </div>

                {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                <button type="submit" disabled={isSubmitting || isCatalogSyncing || !isCatalogReady || Boolean(catalogSyncError)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-bold text-[#073b28] shadow-sm transition hover:bg-[#45df7b] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004B36]">
                  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className="h-5 w-5"><path d="M16.04 3C8.87 3 3.04 8.78 3.04 15.9c0 2.27.6 4.48 1.74 6.43L3 29l6.85-1.78a13.1 13.1 0 0 0 6.18 1.55h.01c7.16 0 13-5.78 13-12.9 0-3.45-1.35-6.69-3.8-9.12A12.93 12.93 0 0 0 16.04 3Zm0 23.57h-.01a10.9 10.9 0 0 1-5.56-1.52l-.4-.24-4.07 1.06 1.09-3.96-.26-.41a10.68 10.68 0 0 1-1.66-5.6c0-5.97 4.88-10.83 10.87-10.83 2.9 0 5.63 1.13 7.68 3.18a10.76 10.76 0 0 1 3.18 7.66c0 5.98-4.87 10.84-10.86 10.84Zm5.97-8.12c-.33-.16-1.94-.95-2.24-1.06-.3-.11-.52-.16-.74.16-.22.33-.84 1.06-1.03 1.28-.19.22-.38.24-.71.08-.33-.16-1.39-.51-2.65-1.63-.98-.87-1.64-1.95-1.84-2.28-.19-.33-.02-.51.15-.67.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.06-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56-.19-.01-.41-.01-.63-.01s-.57.08-.87.41c-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.22 2.3 3.5 5.57 4.91.78.34 1.39.54 1.87.69.79.25 1.51.22 2.08.13.64-.1 1.94-.79 2.22-1.55.27-.76.27-1.41.19-1.55-.08-.14-.3-.22-.63-.38Z"/></svg>
                  {isSubmitting ? "Preparando tu pedido…" : "Enviar pedido por WhatsApp"}
                </button>
                <p className="text-center text-xs leading-5 text-gray-500">Al enviar, te confirmamos disponibilidad, envío y opciones de pago anticipado por WhatsApp.</p>
              </form>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
