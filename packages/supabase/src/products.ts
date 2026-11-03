import type { BackgroundTheme, Product, ProductCategory } from "@lydias-essence/types";
import { isBackgroundTheme, slugify } from "@lydias-essence/utils";
import type { SupabaseClient } from "./client";
import { FriendlyError, toFriendlyError } from "./errors";

export const PRODUCT_COLUMNS =
  "id, name, slug, category, description, price, sale_price, discount_enabled, discount_starts_at, discount_ends_at, stock, low_stock_threshold, image_url, image_urls, published, published_at, specifications, background_theme, is_featured, recommendation_eligible, has_360, sort_order, created_at, updated_at";

/** Columns that existed before the admin upgrade; used if migrations haven't run yet. */
export const LEGACY_PRODUCT_COLUMNS =
  "id, name, category, description, price, sale_price, stock, image_url, image_urls, published, specifications, created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProduct(row: any): Product {
  const price = Number(row.price) || 0;
  const sale = row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price);
  const imageUrls: string[] = Array.isArray(row.image_urls) ? row.image_urls.filter((u: unknown) => typeof u === "string") : [];
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? slugify(String(row.name ?? "product"))),
    category: (row.category ?? "Beauty") as ProductCategory,
    description: String(row.description ?? ""),
    price,
    sale_price: sale,
    discount_enabled: row.discount_enabled ?? sale !== null,
    discount_starts_at: row.discount_starts_at ?? null,
    discount_ends_at: row.discount_ends_at ?? null,
    stock: Number(row.stock) || 0,
    low_stock_threshold: Number(row.low_stock_threshold ?? 5),
    image_url: row.image_url ?? imageUrls[0] ?? null,
    image_urls: imageUrls,
    published: !!row.published,
    published_at: row.published_at ?? null,
    specifications: row.specifications && typeof row.specifications === "object" ? row.specifications : {},
    background_theme: isBackgroundTheme(row.background_theme) ? (row.background_theme as BackgroundTheme) : "default",
    is_featured: !!row.is_featured,
    recommendation_eligible: row.recommendation_eligible ?? true,
    has_360: !!row.has_360,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ?? new Date(0).toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date(0).toISOString()
  };
}

export interface ProductWrite {
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  price: number;
  sale_price: number | null;
  discount_enabled: boolean;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  stock: number;
  low_stock_threshold: number;
  published: boolean;
  background_theme: BackgroundTheme;
  is_featured: boolean;
  recommendation_eligible: boolean;
  sort_order: number;
}

/** Admin: every product, drafts included (RLS only allows this for administrators). */
export async function listAllProducts(client: SupabaseClient): Promise<Product[]> {
  const { data, error } = await client.from("products").select(PRODUCT_COLUMNS).order("updated_at", { ascending: false });
  if (error) throw toFriendlyError(error, "We couldn’t load your products.");
  return (data ?? []).map(normalizeProduct);
}

export async function getProductById(client: SupabaseClient, id: string): Promise<Product | null> {
  const { data, error } = await client.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toFriendlyError(error, "We couldn’t load that product.");
  return data ? normalizeProduct(data) : null;
}

export async function insertProduct(client: SupabaseClient, id: string, payload: ProductWrite): Promise<Product> {
  const { data, error } = await client.from("products").insert({ id, ...payload }).select(PRODUCT_COLUMNS).single();
  if (error) throw toFriendlyError(error, "The product couldn’t be saved.");
  return normalizeProduct(data);
}

export async function updateProduct(client: SupabaseClient, id: string, patch: Partial<ProductWrite>): Promise<Product> {
  const { data, error } = await client.from("products").update(patch).eq("id", id).select(PRODUCT_COLUMNS).single();
  if (error) throw toFriendlyError(error, "The product couldn’t be saved.");
  return normalizeProduct(data);
}

export async function isSlugAvailable(client: SupabaseClient, slug: string, exceptId?: string): Promise<boolean> {
  let q = client.from("products").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (exceptId) q = q.neq("id", exceptId);
  const { count, error } = await q;
  if (error) throw toFriendlyError(error);
  return (count ?? 0) === 0;
}

/** Deletes the row and reports an error if nothing was deleted (RLS hides rows silently). */
export async function deleteProductRow(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from("products").delete().eq("id", id).select("id");
  if (error) throw toFriendlyError(error, "The product couldn’t be deleted.");
  if (!data || data.length === 0) {
    throw new FriendlyError("The product couldn’t be deleted. It may already be gone, or you don’t have permission.", "permission");
  }
}

export function productToWrite(p: Product): ProductWrite {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    category: p.category,
    price: p.price,
    sale_price: p.sale_price,
    discount_enabled: p.discount_enabled,
    discount_starts_at: p.discount_starts_at,
    discount_ends_at: p.discount_ends_at,
    stock: p.stock,
    low_stock_threshold: p.low_stock_threshold,
    published: p.published,
    background_theme: p.background_theme,
    is_featured: p.is_featured,
    recommendation_eligible: p.recommendation_eligible,
    sort_order: p.sort_order
  };
}
