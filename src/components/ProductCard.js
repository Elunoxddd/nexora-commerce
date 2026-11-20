"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCOP, useCart } from "@/context/CartContext";
import { trackStoreEvent } from "@/lib/analytics-client";
import ProductDetailsModal from "@/components/ProductDetailsModal";

export default function ProductCard({ product }) {
  const { addToCart, registerProduct } = useCart();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [wasAdded, setWasAdded] = useState(false);
  const detailsButtonRef = useRef(null);
  const addedTimeoutRef = useRef(null);

  useEffect(() => {
    registerProduct(product);
    trackStoreEvent("product_view", product.id);
  }, [product, registerProduct]);

  const closeDetails = useCallback(() => {
    setIsDetailsOpen(false);
    requestAnimationFrame(() => detailsButtonRef.current?.focus());
  }, []);

  useEffect(() => () => window.clearTimeout(addedTimeoutRef.current), []);

  function addProductToCart() {
    trackStoreEvent("add_to_cart", product.id);
    addToCart(product);
    setWasAdded(true);
    window.clearTimeout(addedTimeoutRef.current);
    addedTimeoutRef.current = window.setTimeout(() => setWasAdded(false), 1800);
    setIsDetailsOpen(false);
  }

  return (
    <>
      <article id={`producto-${product.id}`} className="product-card group flex h-full flex-col">
        <div className="product-card-image">
          <Image src={product.image} alt={product.name} fill loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
          <span>{product.badge}</span>
        </div>

        <div className="product-card-content">
          <h3>{product.name}</h3>
          <p className="product-card-price">{formatCOP(product.price)}</p>
          {product.compareAtPrice > product.price && <p className="product-card-old-price">Antes {formatCOP(product.compareAtPrice)}</p>}
          <ul className="mt-3 space-y-1.5 text-sm leading-5 text-gray-600">
            {product.benefits.slice(0, 3).map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <span aria-hidden="true" className="font-bold text-[#18845d]">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="product-actions mt-auto">
            <button ref={detailsButtonRef} type="button" onClick={() => setIsDetailsOpen(true)} className="detail-button inline-flex min-h-11 w-full items-center justify-center border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004B36]">
              Ver detalles
            </button>
            <button type="button" onClick={addProductToCart} aria-live="polite" className={`add-button inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004B36] ${wasAdded ? "is-added" : ""}`}>
              {wasAdded ? "Agregado ✓" : <><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="add-button-icon h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>Agregar</>}
            </button>
          </div>
        </div>
      </article>

      <ProductDetailsModal
        product={product}
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        onAddToCart={addProductToCart}
      />
    </>
  );
}
