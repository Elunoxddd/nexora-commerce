import "server-only";
import { createHash } from "node:crypto";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Configura Cloudinary en el servidor para habilitar imágenes.");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cloudName) || !/^[a-zA-Z0-9]{1,32}$/.test(apiKey)) throw new Error("La configuración de Cloudinary no es válida.");
  return { cloudName, apiKey, apiSecret };
}

function signParameters(parameters, apiSecret) {
  const canonical = Object.keys(parameters).sort().map((key) => `${key}=${parameters[key]}`).join("&");
  return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex");
}

export async function uploadCloudinaryImage(file, detectedMime) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `nexora/products/${crypto.randomUUID()}`;
  const parameters = { public_id: publicId, timestamp };
  const body = new FormData();
  body.set("file", new File([await file.arrayBuffer()], "product", { type: detectedMime }));
  body.set("api_key", apiKey);
  body.set("timestamp", String(timestamp));
  body.set("public_id", publicId);
  body.set("signature", signParameters(parameters, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Cloudinary no pudo guardar la imagen.");
  const result = await response.json();
  if (typeof result.secure_url !== "string" || !result.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)) {
    throw new Error("Cloudinary devolvió una dirección de imagen no válida.");
  }

  return {
    image: result.secure_url.replace("/image/upload/", "/image/upload/f_webp,q_auto/"),
    imagePublicId: publicId,
    width: result.width,
    height: result.height,
  };
}

export async function deleteCloudinaryImage(publicId) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!/^nexora\/products\/[a-f\d-]{36}$/i.test(publicId)) throw new Error("El identificador de Cloudinary no es válido.");
  const timestamp = Math.floor(Date.now() / 1000);
  const parameters = { public_id: publicId, timestamp };
  const body = new URLSearchParams({
    api_key: apiKey,
    public_id: publicId,
    timestamp: String(timestamp),
    signature: signParameters(parameters, apiSecret),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Cloudinary no pudo eliminar la imagen anterior.");
}
