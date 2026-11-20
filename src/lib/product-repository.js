import "server-only";
import seedProducts from "@/data/products.json";
import { isProductAvailable } from "@/lib/checkout.mjs";

const API_ROOT = "https://sheets.googleapis.com/v4/spreadsheets";
const PRODUCT_HEADERS = [
  "id", "name", "description", "price", "compareAtPrice", "costPrice", "category", "stock",
  "badge", "image", "imagePublicId", "sortOrder", "availability", "shipping", "warranty", "benefits", "specifications",
];
const ANALYTICS_HEADERS = ["timestamp", "event", "productId"];
const MAX_ANALYTICS_ROWS = 50_000;
let cachedToken;
let tokenExpiresAt = 0;
let pendingToken;
let cachedProductIds;
let productIdsExpireAt = 0;

export class RepositoryConfigurationError extends Error {}

export function isGoogleSheetsConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  if (pendingToken) return pendingToken;

  pendingToken = (async () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const pem = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !pem || !process.env.GOOGLE_SHEETS_ID) throw new RepositoryConfigurationError("Configura el acceso de Google Sheets en el servidor.");
    const privateKey = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
    const keyData = Buffer.from(privateKey, "base64");
    const cryptoKey = await crypto.subtle.importKey("pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }))}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(unsigned));
    const assertion = `${unsigned}.${Buffer.from(signature).toString("base64url")}`;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Google authentication failed.");
    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + Math.min(Number(data.expires_in) || 3600, 3600) * 1000;
    return cachedToken;
  })();

  try { return await pendingToken; } finally { pendingToken = undefined; }
}

async function sheetsRequest(path, init = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${API_ROOT}/${encodeURIComponent(process.env.GOOGLE_SHEETS_ID)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Google Sheets request failed (${response.status}).`);
  if (response.status === 204) return null;
  return response.json();
}

function valuesPath(range) {
  return `/values/${encodeURIComponent(range)}`;
}

async function getRows(sheetName, headers) {
  const range = `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}`;
  let result = await sheetsRequest(`${valuesPath(range)}?valueRenderOption=UNFORMATTED_VALUE`);
  const rows = result.values || [];
  if (!rows.length) {
    const headerRange = `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`;
    await sheetsRequest(`${valuesPath(headerRange)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [headers] }),
    });
    result = await sheetsRequest(`${valuesPath(range)}?valueRenderOption=UNFORMATTED_VALUE`);
  } else if (headers.some((header, index) => rows[0]?.[index] !== header)) {
    throw new Error(`La pestaña ${sheetName} ya tiene datos y no coincide con el esquema Nexora.`);
  }
  return result.values || [];
}

function parseJsonCell(value, fallback) {
  try { return typeof value === "string" ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function fromProductRow(row = []) {
  const item = Object.fromEntries(PRODUCT_HEADERS.map((key, index) => [key, row[index] ?? ""]));
  return {
    ...item,
    id: String(item.id),
    name: String(item.name),
    description: String(item.description),
    price: Number(item.price) || 0,
    compareAtPrice: Number(item.compareAtPrice) || 0,
    costPrice: Number(item.costPrice) || 0,
    stock: item.stock === "" ? null : Number(item.stock) || 0,
    sortOrder: Number(item.sortOrder) || 0,
    benefits: parseJsonCell(item.benefits, []),
    specifications: parseJsonCell(item.specifications, []),
  };
}

function toProductRow(product) {
  return PRODUCT_HEADERS.map((header) => {
    if (header === "benefits" || header === "specifications") return JSON.stringify(product[header] || []);
    return product[header] ?? "";
  });
}

function seedProduct(product, index) {
  return {
    ...product,
    price: Number(String(product.price).replace(/\D/g, "")) || 0,
    compareAtPrice: 0,
    costPrice: 0,
    category: product.id.includes("consola") ? "Entretenimiento" : product.id.includes("plancha") ? "Hogar" : "Cuidado personal",
    stock: null,
    imagePublicId: "",
    sortOrder: index + 1,
  };
}

export function toPublicProduct(product) {
  const publicProduct = { ...product };
  delete publicProduct.costPrice;
  delete publicProduct.imagePublicId;
  return publicProduct;
}

class GoogleSheetsProductRepository {
  async getAll() {
    const rows = await getRows("Products", PRODUCT_HEADERS);
    return rows.slice(1).filter((row) => row[0]).map(fromProductRow).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getById(id) {
    return (await this.getAll()).find((product) => product.id === id) || null;
  }

  async save(product) {
    const rows = await getRows("Products", PRODUCT_HEADERS);
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === product.id);
    if (rowIndex > 0) {
      const rowNumber = rowIndex + 1;
      await sheetsRequest(`${valuesPath(`Products!A${rowNumber}:Q${rowNumber}`)}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [toProductRow(product)] }),
      });
    } else {
      await sheetsRequest(`${valuesPath("Products!A:Q")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        body: JSON.stringify({ values: [toProductRow(product)] }),
      });
    }
    return product;
  }

  async seedStorefront() {
    const rows = await getRows("Products", PRODUCT_HEADERS);
    if (rows.slice(1).some((row) => row[0])) return false;
    const seedRows = seedProducts.map(seedProduct).map(toProductRow);
    await sheetsRequest(`${valuesPath("Products!A:Q")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: JSON.stringify({ values: seedRows }),
    });
    return true;
  }

  async delete(id) {
    const rows = await getRows("Products", PRODUCT_HEADERS);
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);
    if (rowIndex < 1) return false;
    const rowNumber = rowIndex + 1;
    await sheetsRequest(`${valuesPath(`Products!A${rowNumber}:Q${rowNumber}`)}:clear`, { method: "POST", body: JSON.stringify({}) });
    return true;
  }

  async appendEvent(event) {
    await getRows("Analytics", ANALYTICS_HEADERS);
    const rows = await sheetsRequest(`${valuesPath("Analytics!A:C")}?valueRenderOption=UNFORMATTED_VALUE`);
    if ((rows.values?.length || 0) >= MAX_ANALYTICS_ROWS) throw new Error("La hoja de analítica llegó al límite configurado.");
    await sheetsRequest(`${valuesPath("Analytics!A:C")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: JSON.stringify({ values: [[new Date().toISOString(), event.type, event.productId]] }),
    });
  }

  async getEvents() {
    const rows = await getRows("Analytics", ANALYTICS_HEADERS);
    return rows.slice(1).map(([timestamp, type, productId]) => ({ timestamp, type, productId: String(productId || "") }));
  }
}

const sheetsRepository = new GoogleSheetsProductRepository();

export async function getPublicProducts() {
  if (!isGoogleSheetsConfigured()) return seedProducts.map(seedProduct).map(toPublicProduct);
  const products = await sheetsRepository.getAll();
  return products.filter(isProductAvailable).map(toPublicProduct);
}

export async function getAdminProducts() {
  if (!isGoogleSheetsConfigured()) throw new RepositoryConfigurationError("Falta configurar Google Sheets para habilitar el catálogo editable.");
  return sheetsRepository.getAll();
}

export async function getAdminProduct(id) {
  if (!isGoogleSheetsConfigured()) throw new RepositoryConfigurationError("Falta configurar Google Sheets para habilitar el catálogo editable.");
  return sheetsRepository.getById(id);
}

export async function getProductsForCheckout() {
  if (!isGoogleSheetsConfigured()) return seedProducts.map(seedProduct);
  return sheetsRepository.getAll();
}

export async function isKnownProductId(id) {
  if (Date.now() < productIdsExpireAt && cachedProductIds) return cachedProductIds.has(id);
  const products = isGoogleSheetsConfigured() ? await sheetsRepository.getAll() : seedProducts;
  cachedProductIds = new Set(products.map((product) => product.id));
  productIdsExpireAt = Date.now() + 30_000;
  return cachedProductIds.has(id);
}

export async function saveAdminProduct(product) {
  if (!isGoogleSheetsConfigured()) throw new RepositoryConfigurationError("Falta configurar Google Sheets para habilitar el catálogo editable.");
  return sheetsRepository.save(product);
}

export async function seedAdminProducts() {
  if (!isGoogleSheetsConfigured()) throw new RepositoryConfigurationError("Falta configurar Google Sheets para habilitar el catálogo editable.");
  return sheetsRepository.seedStorefront();
}

export async function deleteAdminProduct(id) {
  if (!isGoogleSheetsConfigured()) throw new RepositoryConfigurationError("Falta configurar Google Sheets para habilitar el catálogo editable.");
  return sheetsRepository.delete(id);
}

export async function appendAnalyticsEvent(event) {
  if (!isGoogleSheetsConfigured()) return false;
  await sheetsRepository.appendEvent(event);
  return true;
}

export async function getAdminMetrics() {
  if (!isGoogleSheetsConfigured()) throw new RepositoryConfigurationError("Configura Google Sheets para consultar las métricas.");
  const [products, events] = await Promise.all([sheetsRepository.getAll(), sheetsRepository.getEvents()]);
  const counts = new Map();
  const totals = { views: 0, adds: 0, whatsapp: 0 };
  for (const event of events) {
    const key = event.type === "product_view" ? "views" : event.type === "add_to_cart" ? "adds" : "whatsapp";
    totals[key] += 1;
    const current = counts.get(event.productId) || { views: 0, adds: 0, whatsapp: 0 };
    current[key] += 1;
    counts.set(event.productId, current);
  }
  const rankedProducts = products.map((product) => ({ id: product.id, name: product.name, ...counts.get(product.id) || { views: 0, adds: 0, whatsapp: 0 } }))
    .sort((a, b) => b.views - a.views).slice(0, 5);
  const pricedProducts = products.filter((product) => product.price > 0);
  const marginProducts = pricedProducts.filter((product) => product.costPrice > 0);

  return {
    ...totals,
    activeInventory: products.filter((product) => product.stock > 0).length,
    averagePrice: pricedProducts.length ? Math.round(pricedProducts.reduce((sum, product) => sum + product.price, 0) / pricedProducts.length) : 0,
    averageMargin: marginProducts.length ? marginProducts.reduce((sum, product) => sum + ((product.price - product.costPrice) / product.price), 0) / marginProducts.length : null,
    topProducts: rankedProducts,
  };
}
