import { supabase } from "./supabase";
import { sampleProducts } from "../data/sampleProducts";
import type { Product } from "../types/product";

const useSampleData =
  import.meta.env.VITE_USE_SAMPLE_DATA !== "false";

export async function getProducts(): Promise<Product[]> {
  if (useSampleData) {
    return sampleProducts;
  }

  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check your environment variables."
    );
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, description, price, sale_price, stock, image_url, image_urls, published, specifications"
    )
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load products: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    image_urls: Array.isArray(row.image_urls)
      ? row.image_urls
      : [],
    specifications:
      row.specifications &&
      typeof row.specifications === "object"
        ? row.specifications
        : {}
  })) as Product[];
}