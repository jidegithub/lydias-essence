import { useEffect, useMemo, useState } from "react";
import type { SiteSettings, StorefrontData } from "@lydias-essence/types";
import { resolveSiteContent } from "@lydias-essence/utils";
import {
  DEFAULT_SETTINGS,
  loadStorefront,
  readCachedSettings
} from "../lib/storefront";
import type { Product } from "../types/product";

/**
 * Loads everything the page needs from Supabase: products, the two featured selections
 * and the settings the owner edits in the admin.
 */
export function useStorefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [data, setData] = useState<StorefrontData | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(
    () => readCachedSettings() ?? DEFAULT_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // False only on a first-ever visit, until the settings arrive (so default wording never flashes).
  const [ready, setReady] = useState(() => readCachedSettings() !== null);

  useEffect(() => {
    let cancelled = false;
    // Never leave a first-time visitor on a blank page if the connection is slow.
    const timer = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1500);

    loadStorefront()
      .then((result) => {
        if (cancelled) return;
        setProducts(result.products);
        setData(result);
        // If the settings couldn't be read, keep what the page already has (cache or defaults).
        if (result.settingsLoaded) setSettings(result.settings);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "We couldn't load the collection."
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const nextFavouriteEnabled = useMemo(
    () => resolveSiteContent(settings.content).nextFavourite.enabled,
    [settings.content]
  );

  // "Your Next Favourite": exactly four products chosen in the admin. Until a selection has ever
  // been saved, the first four eligible products are shown (the original behaviour).
  const favourites = useMemo(() => {
    const eligible = products.filter((p) => p.recommendation_eligible);
    const chosen =
      data?.nextFavouriteUnconfigured ?? true
        ? eligible.slice(0, 4)
        : (data?.nextFavourite ?? []).filter((p) => p.recommendation_eligible);
    // Not exactly four (e.g. one was unpublished)? Hide the section instead of showing gaps.
    return nextFavouriteEnabled && chosen.length === 4 ? chosen : [];
  }, [products, data, nextFavouriteEnabled]);

  return {
    products,
    loading,
    error,
    ready,
    settings,
    favourites,
    /** Products the owner picked for "Your Beauty, Your Rules" (none = text and photo only). */
    beautyPicks: data?.beautyRules ?? []
  };
}
