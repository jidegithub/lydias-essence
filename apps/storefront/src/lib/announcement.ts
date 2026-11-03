import { supabase } from "./supabase";

export interface Announcement {
  enabled: boolean;
  text: string;
}

/* Last-known banner, so returning visitors see it on first paint
   instead of the page shifting down when the request finishes. */
const CACHE_KEY = "le:announcement:v1";

export function readCachedAnnouncement(): Announcement | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Announcement) : null;
  } catch {
    return null;
  }
}

function writeCache(value: Announcement) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): safe to ignore */
  }
}

/**
 * Reads the banner saved from the admin dashboard.
 * Returns null when it can't be read (no connection, migrations not applied yet…):
 * the banner then simply stays as it was and the rest of the shop is unaffected.
 */
export async function fetchAnnouncement(): Promise<Announcement | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("store_settings")
    .select("announcement_enabled, announcement_text")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  const text = String(data.announcement_text ?? "").trim();
  const value = { enabled: Boolean(data.announcement_enabled) && text.length > 0, text };
  writeCache(value);
  return value;
}