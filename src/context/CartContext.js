"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import products from "@/data/products.json";

const CartContext = createContext(null);
const STORAGE_KEY = "nexora-commerce-cart-v2";

function productPrice(product) {
  const price = Number(String(product?.price ?? "").replace(/\D/g, ""));
  return Number.isSafeInteger(price) ? price : 0;
}

function normalizeEntries(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();

  return value.flatMap((entry) => {
    if (!entry || typeof entry.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || seen.has(entry.id)) return [];
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 15) return [];
    seen.add(entry.id);
    return [{
      id: entry.id,
      quantity,
      ...(typeof entry.name === "string" ? { name: entry.name.slice(0, 120) } : {}),
      ...(Number.isSafeInteger(entry.price) && entry.price > 0 ? { price: entry.price } : {}),
    }];
  });
}

function validCatalog(data) {
  return Array.isArray(data) && data.filter((product) =>
    product &&
    typeof product.id === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id) &&
    typeof product.name === "string" &&
    product.name &&
    productPrice(product) > 0
  );
}

function productIsAvailable(product) {
  const availability = String(product.availability || "").toLowerCase();
  return product.active !== false &&
    product.isActive !== false &&
    (product.stock == null || (Number.isInteger(product.stock) && product.stock > 0)) &&
    !/(agotad|no disponible|desactivad|inactiv|retirad)/.test(availability);
}

function noticesForChanges(changes, removedItems) {
  return {
    removedItems,
    changedItems: changes,
  };
}

export function CartProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [catalog, setCatalog] = useState(products);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState(true);
  const [isCatalogReady, setIsCatalogReady] = useState(false);
  const [catalogSyncError, setCatalogSyncError] = useState("");
  const [syncNotices, setSyncNotices] = useState({ removedItems: [], changedItems: [] });
  const entriesRef = useRef([]);
  const catalogRef = useRef(products);
  const refreshRequestRef = useRef(0);

  const replaceEntries = useCallback((nextEntries) => {
    const normalized = normalizeEntries(nextEntries);
    entriesRef.current = normalized;
    setEntries(normalized);
  }, []);

  const refreshCatalog = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    setIsCatalogSyncing(true);
    setCatalogSyncError("");

    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("No pudimos consultar los productos actuales.");
      const data = await response.json();
      const freshProducts = validCatalog(data?.products);
      if (!freshProducts) throw new Error("Recibimos una respuesta de catálogo no válida.");
      if (requestId !== refreshRequestRef.current) return false;

      const freshById = new Map(freshProducts.map((product) => [product.id, product]));
      const previousById = new Map(catalogRef.current.map((product) => [product.id, product]));
      const removedItems = [];
      const changedItems = [];
      const refreshedEntries = entriesRef.current.flatMap((entry) => {
        const product = freshById.get(entry.id);
        if (!product || !productIsAvailable(product)) {
          removedItems.push({ id: entry.id, name: entry.name || previousById.get(entry.id)?.name || entry.id });
          return [];
        }

        const price = productPrice(product);
        const previousProduct = previousById.get(entry.id);
        const oldName = entry.name || previousProduct?.name;
        const oldPrice = entry.price || (previousProduct ? productPrice(previousProduct) : 0);
        const nameChanged = Boolean(oldName && oldName !== product.name);
        const priceChanged = Boolean(oldPrice && oldPrice !== price);
        if (nameChanged || priceChanged) {
          changedItems.push({
            id: entry.id,
            oldName: oldName || product.name,
            name: product.name,
            oldPrice: oldPrice || null,
            price,
          });
        }

        const quantity = Number.isInteger(product.stock) ? Math.min(entry.quantity, product.stock) : entry.quantity;
        if (quantity < entry.quantity) {
          changedItems.push({
            id: entry.id,
            oldName: product.name,
            name: product.name,
            oldQuantity: entry.quantity,
            quantity,
          });
        }
        return [{ id: entry.id, quantity, name: product.name, price }];
      });

      catalogRef.current = freshProducts;
      setCatalog(freshProducts);
      setIsCatalogReady(true);
      replaceEntries(refreshedEntries);
      if (removedItems.length || changedItems.length) {
        setSyncNotices(noticesForChanges(changedItems, removedItems));
      }
      return true;
    } catch (error) {
      if (requestId === refreshRequestRef.current) {
        setCatalogSyncError(error instanceof Error ? error.message : "No pudimos confirmar el catálogo. Inténtalo de nuevo.");
      }
      return false;
    } finally {
      if (requestId === refreshRequestRef.current) setIsCatalogSyncing(false);
    }
  }, [replaceEntries]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const savedCart = window.localStorage.getItem(STORAGE_KEY);
        const loadedEntries = savedCart ? normalizeEntries(JSON.parse(savedCart)) : [];
        entriesRef.current = loadedEntries;
        setEntries(loadedEntries);
      } catch {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* storage can be disabled */ }
      } finally {
        if (active) {
          setHasLoadedCart(true);
          void refreshCatalog();
        }
      }
    });
    return () => { active = false; };
  }, [refreshCatalog]);

  useEffect(() => {
    if (!hasLoadedCart) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* cart remains in memory */ }
  }, [entries, hasLoadedCart]);

  const catalogById = useMemo(() => new Map(catalog.map((product) => [product.id, product])), [catalog]);
  const cart = useMemo(() => entries.flatMap(({ id, quantity }) => {
    const product = catalogById.get(id);
    return product ? [{ ...product, quantity }] : [];
  }), [entries, catalogById]);

  const registerProduct = useCallback((product) => {
    if (!product?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id)) return;
    const nextCatalog = [...catalogRef.current.filter((item) => item.id !== product.id), product];
    catalogRef.current = nextCatalog;
    setCatalog(nextCatalog);
  }, []);

  const addToCart = useCallback((product) => {
    if (!product?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id)) return;
    registerProduct(product);
    const price = productPrice(product);
    const currentEntries = entriesRef.current;
    const exists = currentEntries.some((entry) => entry.id === product.id);
    if (exists) {
      replaceEntries(currentEntries.map((entry) => entry.id === product.id
        ? { ...entry, quantity: Math.min(entry.quantity + 1, 15), name: product.name, price }
        : entry));
    } else if (currentEntries.length < 10) {
      replaceEntries([...currentEntries, { id: product.id, quantity: 1, name: product.name, price }]);
    }
  }, [registerProduct, replaceEntries]);

  const removeFromCart = useCallback((productId) => {
    replaceEntries(entriesRef.current.filter((item) => item.id !== productId));
  }, [replaceEntries]);
  const updateQuantity = useCallback((productId, change) => {
    replaceEntries(entriesRef.current.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = Math.min(15, item.quantity + Math.sign(change));
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  }, [replaceEntries]);
  const clearCart = useCallback(() => replaceEntries([]), [replaceEntries]);
  const openCart = useCallback(() => {
    setIsCartOpen(true);
    if (hasLoadedCart) void refreshCatalog();
  }, [hasLoadedCart, refreshCatalog]);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const clearSyncNotices = useCallback(() => setSyncNotices({ removedItems: [], changedItems: [] }), []);

  const applyCheckoutCartUpdate = useCallback((result) => {
    const updatedCart = validCatalog(result?.updatedCart);
    if (!updatedCart) return;
    const updatedById = new Map(updatedCart.map((product) => [product.id, product]));
    const removedItems = Array.isArray(result.removedItems) ? result.removedItems : [];
    const changedItems = Array.isArray(result.changedItems) ? result.changedItems : [];
    const removedIds = new Set(removedItems.map((item) => item.id));
    const nextCatalog = catalogRef.current
      .filter((product) => !removedIds.has(product.id))
      .map((product) => updatedById.get(product.id) || product);
    for (const product of updatedCart) {
      if (!nextCatalog.some((item) => item.id === product.id)) nextCatalog.push(product);
    }

    catalogRef.current = nextCatalog;
    setCatalog(nextCatalog);
    setIsCatalogReady(true);
    replaceEntries(updatedCart.map((product) => ({
      id: product.id,
      quantity: product.quantity,
      name: product.name,
      price: productPrice(product),
    })));
    setSyncNotices(noticesForChanges(changedItems, removedItems));
    setCatalogSyncError("");
  }, [replaceEntries]);

  const totalItems = entries.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + productPrice(item) * item.quantity, 0);
  const value = useMemo(() => ({
    cart,
    registerProduct,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalPrice,
    totalItems,
    isCartOpen,
    openCart,
    closeCart,
    refreshCatalog,
    isCatalogSyncing,
    isCatalogReady,
    catalogSyncError,
    syncNotices,
    clearSyncNotices,
    applyCheckoutCartUpdate,
  }), [
    cart, registerProduct, addToCart, removeFromCart, updateQuantity, clearCart,
    totalPrice, totalItems, isCartOpen, openCart, closeCart, refreshCatalog,
    isCatalogSyncing, isCatalogReady, catalogSyncError, syncNotices,
    clearSyncNotices, applyCheckoutCartUpdate,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}

export function formatCOP(amount) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}
