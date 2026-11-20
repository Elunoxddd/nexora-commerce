import { revalidatePath } from "next/cache";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { apiJson, sameOriginRequest } from "@/lib/admin-api";
import { deleteAdminProduct, getAdminProduct, getAdminProducts, RepositoryConfigurationError, saveAdminProduct } from "@/lib/product-repository";
import { validateProductInput } from "@/lib/product-validation.mjs";

const MAX_BODY_BYTES = 24_000;
const slugify = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function GET() {
  if (!(await isAuthenticatedAdmin())) return apiJson({ error: "Inicia sesión para continuar." }, 401);
  try { return apiJson({ products: await getAdminProducts() }); }
  catch (error) {
    const status = error instanceof RepositoryConfigurationError ? 503 : 502;
    return apiJson({ error: status === 503 ? error.message : "No pudimos consultar el catálogo en Google Sheets." }, status);
  }
}

export async function POST(request) {
  if (!(await isAuthenticatedAdmin())) return apiJson({ error: "Inicia sesión para continuar." }, 401);
  if (!sameOriginRequest(request)) return apiJson({ error: "Solicitud no válida." }, 403);
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return apiJson({ error: "La solicitud supera el tamaño permitido." }, 413);

  let input;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return apiJson({ error: "La solicitud supera el tamaño permitido." }, 413);
    input = JSON.parse(text);
  } catch { return apiJson({ error: "No pudimos leer los datos del producto." }, 400); }

  const result = validateProductInput(input);
  if (result.error) return apiJson({ error: result.error }, 400);
  const product = result.value;
  if (!product.id) product.id = `${slugify(product.name) || "producto"}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const existing = await getAdminProduct(product.id);
    await saveAdminProduct(product);
    if (existing?.imagePublicId && existing.imagePublicId !== product.imagePublicId) {
      try {
        const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
        await deleteCloudinaryImage(existing.imagePublicId);
      } catch (error) { console.error("Old Nexora image cleanup failed", error); }
    }
    revalidatePath("/", "page");
    revalidatePath("/admin", "page");
    return apiJson({ product });
  } catch (error) {
    const status = error instanceof RepositoryConfigurationError ? 503 : 502;
    return apiJson({ error: status === 503 ? error.message : "No pudimos guardar el producto en Google Sheets." }, status);
  }
}

export async function DELETE(request) {
  if (!(await isAuthenticatedAdmin())) return apiJson({ error: "Inicia sesión para continuar." }, 401);
  if (!sameOriginRequest(request)) return apiJson({ error: "Solicitud no válida." }, 403);
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return apiJson({ error: "El producto indicado no es válido." }, 400);

  try {
    const existing = await getAdminProduct(id);
    if (!existing) return apiJson({ error: "No encontramos ese producto." }, 404);
    if (!(await deleteAdminProduct(id))) return apiJson({ error: "No encontramos ese producto." }, 404);
    if (existing.imagePublicId) {
      try {
        const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
        await deleteCloudinaryImage(existing.imagePublicId);
      } catch (error) { console.error("Deleted Nexora image cleanup failed", error); }
    }
    revalidatePath("/", "page");
    revalidatePath("/admin", "page");
    return apiJson({ ok: true });
  } catch (error) {
    const status = error instanceof RepositoryConfigurationError ? 503 : 502;
    return apiJson({ error: status === 503 ? error.message : "No pudimos eliminar el producto." }, status);
  }
}
