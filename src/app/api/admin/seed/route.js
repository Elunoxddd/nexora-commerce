import { revalidatePath } from "next/cache";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { apiJson, sameOriginRequest } from "@/lib/admin-api";
import { RepositoryConfigurationError, seedAdminProducts } from "@/lib/product-repository";

export async function POST(request) {
  if (!(await isAuthenticatedAdmin())) return apiJson({ error: "Inicia sesión para continuar." }, 401);
  if (!sameOriginRequest(request)) return apiJson({ error: "Solicitud no válida." }, 403);

  try {
    if (!(await seedAdminProducts())) return apiJson({ error: "La hoja ya tiene productos. No se hizo ningún cambio." }, 409);
    revalidatePath("/", "page");
    revalidatePath("/admin", "page");
    return apiJson({ ok: true });
  } catch (error) {
    const status = error instanceof RepositoryConfigurationError ? 503 : 502;
    return apiJson({ error: status === 503 ? error.message : "No pudimos importar los productos a Google Sheets." }, status);
  }
}
