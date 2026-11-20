"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const EMPTY_PRODUCT = {
  id: "", name: "", description: "", price: "", compareAtPrice: "", costPrice: "", category: "Hogar",
  stock: "", badge: "", image: "", imagePublicId: "", sortOrder: "0", availability: "Consulta disponibilidad",
  shipping: "Envíos nacionales. Confirma cobertura y plazo antes de pagar.", warranty: "Consulta la garantía por WhatsApp.",
  benefits: [], specifications: [],
};
const money = (amount) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(amount) || 0);
const localPrice = (value) => String(value || "").replace(/\D/g, "");

function FormField({ label, name, value, onChange, type = "text", required = false, maxLength, ...props }) {
  return <label className="admin-field">{label}<input name={name} type={type} value={value ?? ""} onChange={onChange} required={required} maxLength={maxLength} {...props} /></label>;
}

export default function AdminDashboard({ initialProducts, initialMetrics, setupMessage }) {
  const [products, setProducts] = useState(initialProducts);
  const [metrics] = useState(initialMetrics);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [specText, setSpecText] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeProductId, setActiveProductId] = useState("");

  const orderedProducts = useMemo(() => [...products].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder)), [products]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function startNewProduct() {
    setForm(EMPTY_PRODUCT);
    setSpecText("");
    setActiveProductId("");
    setError("");
    setStatus("");
    document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editProduct(product) {
      setForm({ ...EMPTY_PRODUCT, ...product, price: String(product.price), compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "", costPrice: product.costPrice ? String(product.costPrice) : "", stock: product.stock == null ? "" : String(product.stock), sortOrder: String(product.sortOrder) });
    setSpecText((product.specifications || []).map((item) => `${item.label} | ${item.value}`).join("\n"));
    setActiveProductId(product.id);
    setError("");
    setStatus("");
    document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("");
    setError("");
    const payload = {
      ...form,
      price: localPrice(form.price),
      compareAtPrice: localPrice(form.compareAtPrice),
      costPrice: localPrice(form.costPrice),
      stock: form.stock === "" ? null : Number(form.stock),
      sortOrder: Number(form.sortOrder),
      benefits: (Array.isArray(form.benefits) ? form.benefits : String(form.benefits || "").split("\n")).map((item) => item.trim()).filter(Boolean),
      specifications: specText.split("\n").map((line) => {
        const separator = line.indexOf("|");
        return separator < 0 ? null : { label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() };
      }).filter(Boolean),
    };

    try {
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos guardar el producto.");
      setProducts((current) => [...current.filter((product) => product.id !== result.product.id), result.product]);
      setActiveProductId(result.product.id);
      setForm({ ...EMPTY_PRODUCT, ...result.product, price: String(result.product.price), compareAtPrice: result.product.compareAtPrice ? String(result.product.compareAtPrice) : "", costPrice: result.product.costPrice ? String(result.product.costPrice) : "", stock: result.product.stock == null ? "" : String(result.product.stock), sortOrder: String(result.product.sortOrder) });
      setStatus("Producto guardado. La tienda pública ya tiene la información actualizada.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar el producto.");
    } finally { setBusy(false); }
  }

  async function uploadImage(event) {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;
    setUploading(true);
    setStatus("");
    setError("");
    try {
      const body = new FormData();
      body.set("image", imageFile);
      const response = await fetch("/api/admin/images", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos subir la imagen.");
      setForm((current) => ({ ...current, image: result.image, imagePublicId: result.imagePublicId }));
      setStatus("Imagen cargada y optimizada para la tienda.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No pudimos subir la imagen.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`¿Eliminar “${product.name}” del catálogo?`)) return;
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos eliminar el producto.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (activeProductId === product.id) startNewProduct();
      setStatus("Producto eliminado del catálogo.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No pudimos eliminar el producto.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login");
  }

  async function importStorefrontCatalog() {
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/seed", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos importar el catálogo.");
      window.location.reload();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "No pudimos importar el catálogo.");
    }
  }

  const averageMarginText = metrics?.averageMargin === null || metrics?.averageMargin === undefined ? "Agrega costos" : `${Math.round(metrics.averageMargin * 100)}%`;

  return (
    <main className="admin-shell">
      <header className="admin-topbar"><Link className="admin-wordmark" href="/">NEXORA <span>ADMIN</span></Link><div className="admin-top-actions"><Link href="/" target="_blank" rel="noreferrer">Ver tienda ↗</Link><button type="button" onClick={logout}>Cerrar sesión</button></div></header>
      <div className="admin-main">
        <div className="admin-page-heading"><div><p className="admin-kicker">OPERACIÓN DE TIENDA</p><h1>Tu negocio, en orden.</h1><p>Actualiza el catálogo y revisa qué productos están llamando la atención.</p></div><button type="button" className="admin-primary-button" onClick={startNewProduct}>+ Nuevo producto</button></div>

        {setupMessage && <section className="admin-setup-notice"><strong>Falta conectar la fuente de datos</strong><p>{setupMessage} Configura las variables del servidor y las pestañas <code>Products</code> y <code>Analytics</code> de la hoja. Los pasos están en <code>ESTADO_PROYECTO.md</code>.</p></section>}

        <section className="admin-metrics" aria-label="Métricas de la tienda">
          <article><span>Vistas de producto</span><strong>{metrics?.views ?? "—"}</strong><small>desde la conexión de Sheets</small></article>
          <article><span>Agregados al carrito</span><strong>{metrics?.adds ?? "—"}</strong><small>intención de compra</small></article>
          <article><span>Clics a WhatsApp</span><strong>{metrics?.whatsapp ?? "—"}</strong><small>pedidos enviados al chat</small></article>
          <article><span>Inventario activo</span><strong>{metrics?.activeInventory ?? "—"}</strong><small>productos con existencias</small></article>
          <article><span>Precio promedio</span><strong>{metrics ? money(metrics.averagePrice) : "—"}</strong><small>catálogo vigente</small></article>
          <article><span>Margen bruto promedio</span><strong>{metrics ? averageMarginText : "—"}</strong><small>se calcula con costo y precio</small></article>
        </section>

        {metrics?.topProducts?.length > 0 && <section className="admin-top-products"><div><p className="admin-kicker">INTERÉS DE CLIENTES</p><h2>Productos más vistos</h2></div><ol>{metrics.topProducts.map((product) => <li key={product.id}><span>{product.name}</span><strong>{product.views} vistas</strong><small>{product.adds} al carrito · {product.whatsapp} a WhatsApp</small></li>)}</ol></section>}

        {(error || status) && <p className={error ? "admin-error admin-flash" : "admin-success admin-flash"} role={error ? "alert" : "status"}>{error || status}</p>}

        <div className="admin-workspace">
          <section className="admin-catalog-list"><div className="admin-section-heading"><div><p className="admin-kicker">CATÁLOGO</p><h2>Productos <span>{products.length}</span></h2></div><button type="button" onClick={startNewProduct}>Agregar</button></div>
            {products.length === 0 ? <div className="admin-empty"><p>{setupMessage ? "Cuando conectes Google Sheets, aquí aparecerá tu catálogo para editarlo." : "La hoja está vacía. Puedes cargar los productos actuales de la tienda para empezar."}</p>{!setupMessage && <button type="button" className="admin-seed-button" onClick={importStorefrontCatalog}>Importar catálogo actual</button>}</div> : <ul>{orderedProducts.map((product) => <li key={product.id} className={product.id === activeProductId ? "selected" : ""}><button className="admin-product-select" type="button" onClick={() => editProduct(product)}>{product.image && <Image src={product.image} alt="" width={64} height={64} unoptimized /> }<span><strong>{product.name}</strong><small>{money(product.price)} · {product.stock ?? "Sin dato"} unidades</small></span></button><button className="admin-delete-button" type="button" aria-label={`Eliminar ${product.name}`} onClick={() => deleteProduct(product)}>Eliminar</button></li>)}</ul>}
          </section>

          <section className="admin-editor" id="product-editor"><div className="admin-section-heading"><div><p className="admin-kicker">FICHA DE PRODUCTO</p><h2>{form.id ? "Editar producto" : "Nuevo producto"}</h2></div>{form.id && <button type="button" onClick={startNewProduct}>Limpiar</button>}</div>
            {setupMessage ? <p className="admin-empty">Conecta la hoja para editar y guardar el catálogo.</p> : <form onSubmit={saveProduct} className="admin-product-form">
              <div className="admin-form-grid"><FormField label="Nombre" name="name" value={form.name} onChange={updateField} required maxLength={120} /><FormField label="Categoría" name="category" value={form.category} onChange={updateField} required maxLength={60} /><label className="admin-field admin-span-two">Descripción<textarea name="description" value={form.description} onChange={updateField} required maxLength={2000} rows={4} /></label>
                <FormField label="Precio (COP)" name="price" value={form.price} onChange={updateField} type="number" required min="1" step="1" /><FormField label="Precio anterior (COP)" name="compareAtPrice" value={form.compareAtPrice} onChange={updateField} type="number" min="0" step="1" /><FormField label="Costo interno (COP)" name="costPrice" value={form.costPrice} onChange={updateField} type="number" min="0" step="1" /><FormField label="Unidades disponibles" name="stock" value={form.stock} onChange={updateField} type="number" min="0" max="1000000" step="1" /><FormField label="Etiqueta" name="badge" value={form.badge} onChange={updateField} maxLength={50} /><FormField label="Orden de aparición" name="sortOrder" value={form.sortOrder} onChange={updateField} type="number" min="0" max="100000" step="1" /><FormField label="Disponibilidad" name="availability" value={form.availability} onChange={updateField} required maxLength={80} />
                <label className="admin-field admin-span-two">Beneficios <textarea value={(form.benefits || []).join("\n")} onChange={(event) => setForm((current) => ({ ...current, benefits: event.target.value.split("\n") }))} rows={3} maxLength={1500} placeholder="Un beneficio por línea" /></label>
                <label className="admin-field admin-span-two">Especificaciones <textarea value={specText} onChange={(event) => setSpecText(event.target.value)} rows={4} maxLength={2500} placeholder={"Una por línea: Atributo | Detalle\nEjemplo: Material | Acero inoxidable"} /></label>
                <FormField label="Información de envío" name="shipping" value={form.shipping} onChange={updateField} required maxLength={300} /><FormField label="Garantía" name="warranty" value={form.warranty} onChange={updateField} required maxLength={300} />
                <label className="admin-field admin-span-two">Foto principal <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} /><small>JPG, PNG o WebP · máximo 5 MB. Se verifica el contenido y se optimiza en Cloudinary.</small></label>
                {form.image && <div className="admin-image-preview"><Image src={form.image} alt="Vista previa de la imagen del producto" width={160} height={120} unoptimized /><button type="button" onClick={() => setForm((current) => ({ ...current, image: "", imagePublicId: "" }))}>Quitar foto</button></div>}
              </div>
              <button className="admin-primary-button" type="submit" disabled={busy || uploading}>{busy ? "Guardando…" : uploading ? "Subiendo imagen…" : "Guardar producto"}</button>
            </form>}
          </section>
        </div>
      </div>
    </main>
  );
}
