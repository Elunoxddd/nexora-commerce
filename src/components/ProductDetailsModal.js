"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatCOP } from "@/context/CartContext";

export default function ProductDetailsModal({ product, isOpen, onClose, onAddToCart }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusableElements = document.querySelectorAll(
          '[role="dialog"]:not([aria-hidden="true"]) button:not([tabindex="-1"]), [role="dialog"]:not([aria-hidden="true"]) a[href], [role="dialog"]:not([aria-hidden="true"]) [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const numericPrice = Number(String(product.price).replace(/[^\d]/g, ""));

  return (
    <div className={`fixed inset-0 z-[60] flex items-end justify-center transition-[opacity,visibility] duration-200 sm:items-center sm:p-5 ${isOpen ? "visible bg-slate-950/55 opacity-100" : "invisible bg-slate-950/0 opacity-0 delay-200"}`}>
      <button type="button" onClick={onClose} tabIndex={isOpen ? 0 : -1} aria-label="Cerrar detalles del producto" className="absolute inset-0 cursor-default" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`product-title-${product.id}`}
        aria-hidden={!isOpen}
        className={`product-modal-shell relative z-[1] flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden bg-white transition-transform duration-200 sm:max-h-[90dvh] ${isOpen ? "translate-y-0 sm:scale-100" : "translate-y-8 sm:scale-[0.98]"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#18845d]">Detalles del producto</p>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar detalles" className="product-modal-close flex h-10 w-10 items-center justify-center text-2xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">×</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2">
            <div className="product-modal-media relative min-h-60 sm:min-h-80">
              <Image src={product.image} alt={product.name} fill loading={isOpen ? "eager" : "lazy"} sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              <span className="product-modal-badge absolute left-4 top-4 px-3 py-1.5 text-xs font-bold text-white">{product.badge}</span>
            </div>

            <div className="p-5 sm:p-7">
              <h2 id={`product-title-${product.id}`} className="text-2xl font-bold leading-tight tracking-tight text-gray-950 sm:text-3xl">{product.name}</h2>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#004B36]">{formatCOP(numericPrice)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-[#075d42]"><span className="h-2 w-2 rounded-full bg-emerald-500" />{product.availability}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{product.description}</p>

              <section className="mt-6" aria-labelledby={`specs-title-${product.id}`}>
                <h3 id={`specs-title-${product.id}`} className="font-bold text-gray-900">Ficha técnica</h3>
                <dl className="product-specs mt-3 divide-y divide-gray-100 border border-gray-100 px-3">
                  {product.specifications.map((specification) => (
                    <div key={specification.label} className="grid grid-cols-[minmax(7rem,0.8fr)_1.2fr] gap-3 py-2.5 text-sm">
                      <dt className="font-medium text-gray-600">{specification.label}</dt>
                      <dd className="text-gray-800">{specification.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <div className="product-info-panel mt-5 space-y-3 bg-gray-50 p-4 text-sm leading-6">
                <div><h3 className="font-semibold text-gray-900">Envío</h3><p className="text-gray-600">{product.shipping}</p></div>
                <div><h3 className="font-semibold text-gray-900">Garantía</h3><p className="text-gray-600">{product.warranty}</p></div>
                <Link href="/politica-de-envio" onClick={onClose} className="inline-flex font-semibold text-[#08704e] underline decoration-emerald-300 underline-offset-4 hover:text-[#004B36]">Consultar política de envío</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-4 sm:px-7">
          <button type="button" onClick={onAddToCart} className="modal-add-button inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3 font-bold text-[#073b28] transition hover:bg-[#45df7b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004B36]">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
            Agregar al Carrito
          </button>
        </div>
      </section>
    </div>
  );
}
