import { sanitizePlainText } from "./checkout.mjs";

function price(value, optional = false) {
  if (optional && (value === "" || value === null || value === undefined)) return 0;
  if (typeof value !== "number" && (typeof value !== "string" || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value.trim()))) return null;
  const parsed = typeof value === "number" ? value : Number(value.replace(/\./g, ""));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function stringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return null;
  const result = value.slice(0, maxItems).map((item) => sanitizePlainText(item, maxLength)).filter(Boolean);
  return result.length === value.length ? result : null;
}

export function validateProductInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "El producto no tiene un formato válido." };

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return { error: "El identificador del producto no es válido." };

  const name = sanitizePlainText(input.name, 120);
  const description = sanitizePlainText(input.description, 2000);
  const category = sanitizePlainText(input.category, 60);
  const badge = sanitizePlainText(input.badge, 50);
  const availability = sanitizePlainText(input.availability, 80);
  const shipping = sanitizePlainText(input.shipping, 300);
  const warranty = sanitizePlainText(input.warranty, 300);
  const priceValue = price(input.price);
  const compareAtPrice = price(input.compareAtPrice, true);
  const costPrice = price(input.costPrice, true);
  const stock = input.stock === "" || input.stock === null || input.stock === undefined ? null : Number(input.stock);
  const sortOrder = Number(input.sortOrder);
  const benefits = stringList(input.benefits, 8, 180);
  const specifications = Array.isArray(input.specifications) ? input.specifications.slice(0, 12).map((item) => ({
    label: sanitizePlainText(item?.label, 60),
    value: sanitizePlainText(item?.value, 160),
  })) : null;

  if (!name || !description || !category || !availability || !shipping || !warranty) return { error: "Completa nombre, descripción, categoría, disponibilidad, envío y garantía." };
  if (priceValue === null || priceValue < 1 || compareAtPrice === null || costPrice === null) return { error: "Revisa el precio, el costo y el precio anterior." };
  if (compareAtPrice > 0 && compareAtPrice <= priceValue) return { error: "El precio anterior debe ser mayor al precio actual." };
  if (stock === null || !Number.isInteger(stock) || stock < 0 || stock > 1_000_000 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100_000) return { error: "Define un inventario válido y revisa el orden del producto." };
  if (!benefits || !specifications || specifications.some((item) => !item.label || !item.value)) return { error: "Revisa los beneficios y las especificaciones." };

  const image = typeof input.image === "string" ? input.image.trim() : "";
  const localImage = image.startsWith("/") && !image.startsWith("//") && !image.includes("..") && /^\/[a-zA-Z0-9/_\-.]+$/.test(image);
  const cloudinaryImage = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\//.test(image);
  if (!image || (!localImage && !cloudinaryImage)) {
    return { error: "Usa una imagen local o una imagen segura alojada en Cloudinary." };
  }
  const imagePublicId = typeof input.imagePublicId === "string" ? input.imagePublicId.trim() : "";
  if (imagePublicId && !/^[a-zA-Z0-9_/-]{1,180}$/.test(imagePublicId)) return { error: "El identificador de la imagen no es válido." };

  return {
    value: {
      id,
      name,
      description,
      price: priceValue,
      compareAtPrice,
      costPrice,
      category,
      stock,
      badge,
      image,
      imagePublicId,
      sortOrder,
      availability,
      shipping,
      warranty,
      benefits,
      specifications,
    },
  };
}
