import type { Product, StorefrontData } from "@lydias-essence/types";
import type { SupabaseClient } from "./client";
import { FriendlyError } from "./errors";
import { LEGACY_PRODUCT_COLUMNS, PRODUCT_COLUMNS, normalizeProduct } from "./products";
import { DEFAULT_SETTINGS, SETTINGS_COLUMNS, normalizeSettings } from "./settings";

async function fetchPublishedProducts(client: SupabaseClient): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!error) return (data ?? []).map(normalizeProduct);

  // 42703 = undefined column: the database hasn't had the new migrations yet.
  // Keep the storefront working with the original columns rather than going blank.
  if (error.code === "42703") {
    const legacy = await client
      .from("products")
      .select(LEGACY_PRODUCT_COLUMNS)
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (!legacy.error) return (legacy.data ?? []).map(normalizeProduct);
    throw new FriendlyError(`Unable to load products: ${legacy.error.message}`);
  }
  throw new FriendlyError(`Unable to load products: ${error.message}`);
}

/**
 * Loads everything the public storefront shows, using only public (anon) reads.
 * Settings and merchandising are optional: if they fail the storefront still renders products.
 */
export async function fetchStorefrontData(client: SupabaseClient): Promise<StorefrontData> {
  const [products, settingsRes, slotsRes] = await Promise.all([
    fetchPublishedProducts(client),
    client.from("store_settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle(),
    client.from("merch_slots").select("section, product_id, position").order("position", { ascending: true })
  ]);

  const settings = settingsRes.error ? DEFAULT_SETTINGS : normalizeSettings(settingsRes.data);
  const slots = slotsRes.error ? [] : slotsRes.data ?? [];
  const byId = new Map(products.map((p) => [p.id, p]));

  const pick = (section: string) =>
    slots
      .filter((s) => s.section === section)
      .sort((a, b) => a.position - b.position)
      .map((s) => byId.get(s.product_id))
      .filter((p): p is Product => !!p);

  return {
    products,
    settings,
    beautyRules: pick("beauty_rules"),
    nextFavourite: pick("next_favourite"),
    nextFavouriteUnconfigured: !slots.some((s) => s.section === "next_favourite")
  };
}
