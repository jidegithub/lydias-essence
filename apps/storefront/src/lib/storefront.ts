import type { SyntheticEvent } from "react";
import {
  DEFAULT_SETTINGS,
  fetchSettings,
  fetchStorefrontData,
  normalizeProduct
} from "@lydias-essence/supabase";
import type { SiteSettings, StorefrontData } from "@lydias-essence/types";
import { sampleProducts } from "../data/sampleProducts";
import { supabase } from "./supabase";

export { DEFAULT_SETTINGS };

const useSampleData = import.meta.env.VITE_USE_SAMPLE_DATA === "true";

export interface LoadedStorefront extends StorefrontData {
  /** False when the settings couldn't be read, so the page keeps what it already has. */
  settingsLoaded: boolean;
}

/* Last-known settings, so returning visitors see the right wording, photos, logo and banner on
   first paint instead of the page changing when the request finishes. */
const CACHE_KEY = "le:site-settings:v3";

export function readCachedSettings(): SiteSettings | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SiteSettings;
    return parsed && typeof parsed.store_name === "string"
      ? { ...DEFAULT_SETTINGS, ...parsed }
      : null;
  } catch {
    return null;
  }
}

function writeCachedSettings(value: SiteSettings) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): safe to ignore */
  }
}

/**
 * Products, the featured selections and every admin-edited setting (wording, photos, logo,
 * contact details, banner) in one go. Only public (anon) reads; the database decides what is visible.
 */
export async function loadStorefront(): Promise<LoadedStorefront> {
  if (useSampleData) {
    // Demo products, but still use the real settings when Supabase is configured.
    let settings = DEFAULT_SETTINGS;
    if (supabase) {
      try {
        settings = await fetchSettings(supabase);
      } catch {
        /* keep defaults */
      }
    }
    const settingsLoaded = settings !== DEFAULT_SETTINGS;
    if (settingsLoaded) writeCachedSettings(settings);
    return {
      products: sampleProducts.map(normalizeProduct),
      settings,
      beautyRules: [],
      nextFavourite: [],
      nextFavouriteUnconfigured: true,
      settingsLoaded
    };
  }

  if (!supabase) {
    throw new Error("Supabase is not configured. Check your environment variables.");
  }

  const data = await fetchStorefrontData(supabase);
  // fetchStorefrontData hands back DEFAULT_SETTINGS itself when the settings are unavailable.
  const settingsLoaded = data.settings !== DEFAULT_SETTINGS;
  if (settingsLoaded) writeCachedSettings(data.settings);
  return { ...data, settingsLoaded };
}

/** Only real https links are used; anything else (blank, http:, javascript:) means "use the built-in default". */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return url.startsWith("https://") ? url : null;
}

/** If an admin-chosen image can't load (deleted file, bad link), quietly show the built-in one instead. */
export function onImageError(fallbackSrc: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    // Already showing the fallback (or it failed too): stop, so there is never a retry loop.
    if (img.getAttribute("src") === fallbackSrc) return;
    img.src = fallbackSrc;
  };
}
