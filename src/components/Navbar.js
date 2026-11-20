"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { trackStoreEvent } from "@/lib/analytics-client";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { totalItems, openCart } = useCart();
  const whatsappUrl = getWhatsAppUrl("Hola Nexora, quisiera recibir asesoría.");

  return (
    <>
      <header className="site-header sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <nav aria-label="Navegación principal" className="site-nav">
          <div className="nav-brand-group">
            <button
              type="button"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              aria-controls="site-drawer"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#004B36] transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-[#004B36]"
            >
              <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
                <span className="h-0.5 w-full rounded bg-current" />
                <span className="h-0.5 w-full rounded bg-current" />
                <span className="h-0.5 w-full rounded bg-current" />
              </span>
            </button>
            <a href="#inicio" aria-label="Nexora, inicio" className="flex items-center">
              <Image src="/logo-nexora.svg" alt="Nexora" width={132} height={29} loading="eager" className="h-auto w-[112px] sm:w-[132px]" />
            </a>
          </div>
          <div className="nav-actions">
            <button type="button" onClick={openCart} aria-label={`Abrir carrito, ${totalItems} ${totalItems === 1 ? "producto" : "productos"}`} className="nav-cart-button" aria-haspopup="dialog">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h2l2 11h10l2-8H7"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>
              <span className="hidden sm:inline">Carrito</span>
              <span key={totalItems} className="nav-cart-count" aria-live="polite" aria-atomic="true">{totalItems}</span>
            </button>
            <a href={whatsappUrl} onClick={() => trackStoreEvent("whatsapp_click", "nexora-store")} target="_blank" rel="noreferrer" className="nav-contact-button">
              <span className="hidden sm:inline">Hablemos</span>
              <span className="sm:hidden">Contacto</span>
            </a>
          </div>
        </nav>
      </header>

      <div className={`fixed inset-0 z-50 ${isMenuOpen ? "visible" : "invisible pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Cerrar menú"
          tabIndex={isMenuOpen ? 0 : -1}
          onClick={() => setIsMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/40 transition-opacity ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          id="site-drawer"
          className={`site-drawer absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-white p-6 shadow-2xl transition-transform duration-300 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          aria-label="Menú del sitio"
          aria-hidden={!isMenuOpen}
        >
          <div className="mb-10 flex items-center justify-between">
            <span className="font-bold tracking-[0.14em] text-[#004B36]">NEXORA</span>
            <button type="button" onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">✕</button>
          </div>
          <nav className="flex flex-col gap-2 text-base font-medium text-gray-800">
            <Link href="/#catalogo" onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-emerald-50 hover:text-[#004B36]">Catálogo</Link>
            <Link href="/politica-de-envio" onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-emerald-50 hover:text-[#004B36]">Envíos y políticas</Link>
          </nav>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-auto rounded-xl bg-[#25D366] px-4 py-3 text-center font-semibold text-[#073b28]">Atención por WhatsApp</a>
        </aside>
      </div>
    </>
  );
}
