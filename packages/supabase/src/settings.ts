import type { DeepPartial, SiteContent, SiteSettings } from "@lydias-essence/types";
import type { SupabaseClient } from "./client";
import { toFriendlyError } from "./errors";
import { SITE_BUCKET, newObjectPath, uploadFile } from "./media";

export const SETTINGS_COLUMNS =
  "id, store_name, logo_url, whatsapp_number, contact_email, contact_phone, instagram_url, facebook_url, tiktok_url, low_stock_threshold, announcement_enabled, announcement_text, show_discount_badge, content, updated_at";

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  store_name: "Lydia\u2019s Essence",
  logo_url: null,
  whatsapp_number: "",
  contact_email: "",
  contact_phone: "",
  instagram_url: "",
  facebook_url: "",
  tiktok_url: "",
  low_stock_threshold: 5,
  announcement_enabled: false,
  announcement_text: "",
  show_discount_badge: true,
  content: {},
  updated_at: new Date(0).toISOString()
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSettings(row: any): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    logo_url: row.logo_url || null,
    content: row.content && typeof row.content === "object" ? row.content : {}
  } as SiteSettings;
}

export async function fetchSettings(client: SupabaseClient): Promise<SiteSettings> {
  const { data, error } = await client.from("store_settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) throw toFriendlyError(error, "We couldn’t load your settings.");
  return normalizeSettings(data);
}

export type SettingsColumnsPatch = Partial<
  Pick<
    SiteSettings,
    | "store_name"
    | "logo_url"
    | "whatsapp_number"
    | "contact_email"
    | "contact_phone"
    | "instagram_url"
    | "facebook_url"
    | "tiktok_url"
    | "low_stock_threshold"
    | "announcement_enabled"
    | "announcement_text"
    | "show_discount_badge"
  >
>;

export async function updateSettingsColumns(client: SupabaseClient, patch: SettingsColumnsPatch): Promise<SiteSettings> {
  const { data, error } = await client
    .from("store_settings")
    .upsert({ id: 1, ...patch }, { onConflict: "id" })
    .select(SETTINGS_COLUMNS)
    .single();
  if (error) throw toFriendlyError(error, "Your settings couldn’t be saved.");
  return normalizeSettings(data);
}

/** Merges whole sections (hero, footer, …) into the stored content without touching other sections. */
export async function mergeSiteContent(client: SupabaseClient, patch: DeepPartial<SiteContent>): Promise<SiteSettings> {
  const { error } = await client.rpc("merge_site_content", { p_patch: patch });
  if (error) throw toFriendlyError(error, "Your changes couldn’t be saved.");
  return fetchSettings(client);
}

export async function uploadSiteImage(client: SupabaseClient, file: File): Promise<string> {
  const { publicUrl } = await uploadFile(client, SITE_BUCKET, newObjectPath("site", file), file);
  return publicUrl;
}

/** Best-effort removal of a replaced site image, only when it lives in our own bucket. */
export async function removeSiteImageIfOurs(client: SupabaseClient, url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${SITE_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0] ?? "");
  if (!path) return;
  await client.storage.from(SITE_BUCKET).remove([path]);
}
