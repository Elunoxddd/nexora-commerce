import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPublicProducts } from "@/lib/product-repository";
import FAQ from "@/components/FAQ";

function ProductGrid({ products }) {
  return products.length
    ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    : <p className="catalog-empty">Estamos actualizando la selección. Escríbenos por WhatsApp y te contamos qué tenemos disponible.</p>;
}

async function StorefrontCatalog() {
  await connection();
  const products = await getPublicProducts();
  return <>
    <Hero products={products} />
    <section aria-label="Compra con confianza en Nexora" className="trust-strip">
      <article className="trust-item"><span className="trust-number">01</span><div><h2>Envíos a toda Colombia</h2><p>Seguimiento y entrega en tu ciudad.</p></div></article>
      <article className="trust-item"><span className="trust-number">02</span><div><h2>Compra con respaldo</h2><p>Te contamos lo que necesitas saber.</p></div></article>
      <article className="trust-item"><span className="trust-number">03</span><div><h2>Te atendemos por WhatsApp</h2><p>Resolvemos tus dudas antes de pagar.</p></div></article>
    </section>
    <section id="productos" aria-labelledby="catalog-title" className="catalog-section">
      <span id="catalogo" className="catalog-anchor" aria-hidden="true" />
      <div className="catalog-inner">
        <div className="catalog-heading"><div><p className="eyebrow">La selección Nexora</p><h2 id="catalog-title">Útiles, lindos y bien elegidos.</h2></div><p>Ideas para tu casa, tu rutina y tus ratos libres. Mira cada detalle y arma tu pedido con tranquilidad.</p></div>
        <ProductGrid products={products} />
      </div>
    </section>
  </>;
}

function StorefrontFallback() {
  return <>
    <Hero />
    <div className="catalog-section"><p className="catalog-empty" role="status">Cargando la selección Nexora…</p></div>
  </>;
}

async function CurrentYear() {
  await connection();
  return new Date().getFullYear();
}

export default function Home() {
  return <>
    <Navbar />
    <main id="inicio">
      <Suspense fallback={<StorefrontFallback />}><StorefrontCatalog /></Suspense>
      <section className="editorial-band" aria-label="Una compra acompañada">
        <div className="editorial-band-copy"><p className="eyebrow">Estamos para ayudarte</p><h2>¿Tienes una pregunta antes de comprar?</h2><p>Escríbenos por WhatsApp. Te confirmamos disponibilidad, cobertura y tiempos de entrega antes de cerrar tu pedido.</p></div>
        <div className="editorial-band-art" aria-hidden="true">N.</div>
      </section>
      <FAQ />
    </main>
    <footer className="footer"><div className="footer-inner"><div><div className="footer-brand">NEXORA</div><p>© <Suspense fallback=""><CurrentYear /></Suspense> Nexora. Una buena elección para cada día.</p></div><nav aria-label="Enlaces del pie de página"><Link href="/politica-de-envio">Envíos y políticas</Link><a href="#catalogo">Catálogo</a></nav></div></footer>
  </>;
}
