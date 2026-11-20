import { getPublicProducts } from "@/lib/product-repository";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    const products = await getPublicProducts();
    return Response.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No pudimos consultar el catálogo." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
