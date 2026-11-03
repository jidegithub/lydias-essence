import type { MerchSection, MerchSlot } from "@lydias-essence/types";
import type { SupabaseClient } from "./client";
import { toFriendlyError } from "./errors";

export const MERCH_LIMITS: Record<MerchSection, { min: number; max: number; exact?: number }> = {
  beauty_rules: { min: 0, max: 8 },
  next_favourite: { min: 0, max: 4, exact: 4 }
};

export async function listMerchSlots(client: SupabaseClient): Promise<MerchSlot[]> {
  const { data, error } = await client
    .from("merch_slots")
    .select("id, section, product_id, position")
    .order("position", { ascending: true });
  if (error) throw toFriendlyError(error, "We couldn’t load the featured selections.");
  return (data ?? []) as MerchSlot[];
}

/**
 * Atomically replaces a section's products and its on/off switch.
 * The database function rejects an enabled "next_favourite" without exactly four eligible products.
 */
export async function saveMerchSection(
  client: SupabaseClient,
  section: MerchSection,
  productIds: string[],
  enabled: boolean
): Promise<void> {
  const { error } = await client.rpc("save_merch_section", {
    p_section: section,
    p_product_ids: productIds,
    p_enabled: enabled
  });
  if (error) throw toFriendlyError(error, "The selection couldn’t be saved.");
}
