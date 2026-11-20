"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCOP } from "@/context/CartContext";

function ProductImage({ product, failedImages, onImageError, sizes, className = "" }) {
  const image = typeof product.image === "string" ? product.image.trim() : "";
  const hasImage = image && !failedImages.has(product.id);

  return (
    <div className={`hero-product-media ${className}`}>
      <div className="hero-product-placeholder" aria-hidden="true">
        <span>{product.category || "Selección Nexora"}</span>
      </div>
      {hasImage && (
        <Image
          src={image}
          alt={product.name}
          fill
          sizes={sizes}
          onError={onImageError}
          className="hero-product-image"
        />
      )}
    </div>
  );
}

export default function Hero({ products = [] }) {
  const featuredProducts = products
    .filter((product) => product && typeof product.id === "string" && product.id && typeof product.name === "string" && product.name)
    .slice(0, 3);
  const [activeId, setActiveId] = useState(featuredProducts[0]?.id ?? "");
  const [failedImages, setFailedImages] = useState(() => new Set());
  const activeProduct = featuredProducts.find((product) => product.id === activeId) ?? featuredProducts[0];

  function markImageAsFailed(productId) {
    setFailedImages((current) => {
      if (current.has(productId)) return current;
      return new Set(current).add(productId);
    });
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-mark" />Selección Nexora · Colombia</p>
        <h1 id="hero-title">Buenos hallazgos.<br /><em>Para todos los días.</em></h1>
        <p className="hero-description">Tecnología y productos para tu hogar que sí resuelven. Elige con calma; nosotros te acompañamos hasta la puerta.</p>
        <div className="hero-actions">
          <Link href="#catalogo" className="button button-dark">Ver productos <span aria-hidden="true">↗</span></Link>
          <p className="hero-note">Envíos a toda Colombia<br /><strong>Compra acompañada por WhatsApp</strong></p>
        </div>
        <div className="hero-proof"><span>01</span><p>Productos elegidos<br />con intención</p><i /><span>02</span><p>Atención cercana<br />de principio a fin</p></div>
      </div>
      <div className="hero-art">
        <div className="hero-vitrine" role="region" aria-label="Productos destacados de Nexora">
          {activeProduct ? (
            <>
              <article className="hero-featured-card" aria-live="polite">
                <ProductImage
                  product={activeProduct}
                  failedImages={failedImages}
                  onImageError={() => markImageAsFailed(activeProduct.id)}
                  sizes="(max-width: 760px) 100vw, 42vw"
                  className="hero-featured-media"
                />
                <div className="hero-featured-details">
                  <div>
                    <span className="hero-product-category">{activeProduct.category || "Selección Nexora"}</span>
                    <h2>{activeProduct.name}</h2>
                  </div>
                  <span className="hero-product-price">{formatCOP(Number(String(activeProduct.price).replace(/[^\d]/g, "")))}</span>
                  <Link href={`#producto-${activeProduct.id}`} className="hero-product-link">
                    Descubrir <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
              {featuredProducts.length > 1 && (
                <div className="hero-product-switcher" role="group" aria-label="Más productos destacados">
                  {featuredProducts.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      className="hero-product-option"
                      onClick={() => setActiveId(product.id)}
                      aria-label={`Ver ${product.name}, ${formatCOP(Number(String(product.price).replace(/[^\d]/g, "")))}`}
                      aria-pressed={product.id === activeProduct.id}
                    >
                      <ProductImage
                        product={product}
                        failedImages={failedImages}
                        onImageError={() => markImageAsFailed(product.id)}
                        sizes="80px"
                        className="hero-option-media"
                      />
                      <span className="hero-option-copy">
                        <strong>{product.name}</strong>
                        <span>{formatCOP(Number(String(product.price).replace(/[^\d]/g, "")))}</span>
                      </span>
                      <span className="hero-option-arrow" aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="hero-empty-vitrine">
              <span className="hero-product-category">La selección Nexora</span>
              <p>Estamos preparando nuevos hallazgos para ti.</p>
              <Link href="#catalogo" className="hero-product-link">Explorar productos <span aria-hidden="true">↗</span></Link>
            </div>
          )}
        </div>
      </div>
      <div className="hero-bottomline"><span>HECHO PARA ELEGIR MEJOR</span><span>BOGOTÁ · COLOMBIA</span></div>
    </section>
  );
}
