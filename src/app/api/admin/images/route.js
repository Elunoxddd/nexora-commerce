import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { apiJson, sameOriginRequest } from "@/lib/admin-api";
import { isRateLimited } from "@/lib/rate-limit";
import { uploadCloudinaryImage } from "@/lib/cloudinary";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function detectImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request) {
  if (!(await isAuthenticatedAdmin())) return apiJson({ error: "Inicia sesión para continuar." }, 401);
  if (!sameOriginRequest(request)) return apiJson({ error: "Solicitud no válida." }, 403);
  if (isRateLimited(request, { namespace: "admin-image", limit: 12, windowMs: 15 * 60 * 1000 })) {
    return apiJson({ error: "Se alcanzó el límite de cargas. Inténtalo más tarde." }, 429, { "Retry-After": "900" });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES + 64 * 1024) return apiJson({ error: "La imagen no puede superar 5 MB." }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return apiJson({ error: "Envía una imagen en formato válido." }, 415);

  let form;
  try { form = await request.formData(); } catch { return apiJson({ error: "No pudimos leer la imagen." }, 400); }
  const file = form.get("image");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES) return apiJson({ error: "La imagen debe pesar menos de 5 MB." }, 413);

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectImage(bytes);
  if (!mime || file.type !== mime) return apiJson({ error: "Usa una imagen JPEG, PNG o WebP válida." }, 415);

  try { return apiJson(await uploadCloudinaryImage(file, mime)); }
  catch (error) {
    const message = error instanceof Error && error.message.startsWith("Configura Cloudinary")
      ? error.message
      : "No pudimos procesar la imagen. Inténtalo de nuevo.";
    return apiJson({ error: message }, message === error?.message ? 503 : 502);
  }
}
