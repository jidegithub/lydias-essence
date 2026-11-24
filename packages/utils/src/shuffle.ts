/**
 * Daily shuffle for the storefront's default "Featured" order.
 *
 * Every visitor on the same London day sees the same order, because the order comes from a
 * stable hash of (day, seed, product id). No server job is needed. "Shuffle now" in the admin
 * changes the seed, which reorders the shop straight away.
 *
 * Order produced:
 *   1. Pinned products, in the order the admin saved them
 *   2. Shuffled products from the selected categories (sold-out ones excluded when skipping is on)
 *   3. Everything else, in its existing order (other categories and sold-out items)
 */

export const SHUFFLE_MAX_PINNED = 6;

export interface ShuffleConfig {
  enabled: boolean;
  /** Categories that shuffle. An empty list means every category. */
  categories: readonly string[];
  skipSoldOut: boolean;
  pinnedIds: readonly string[];
  seed: number;
}

export interface ShuffleableProduct {
  id: string;
  category: string;
  stock: number;
}

/** 32-bit FNV-1a hash. Small, fast and the same on every device. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The London calendar day as YYYY-MM-DD, so the shuffle changes at local midnight. */
export function shuffleDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function applyDailyShuffle<T extends ShuffleableProduct>(
  products: readonly T[],
  config: ShuffleConfig,
  dayKey: string,
): T[] {
  if (!config.enabled) return [...products];

  const byId = new Map(products.map((p) => [p.id, p]));
  const pinned: T[] = [];
  const seenPinned = new Set<string>();
  for (const id of config.pinnedIds) {
    const product = byId.get(id);
    if (!product || seenPinned.has(id)) continue;
    seenPinned.add(id);
    pinned.push(product);
    if (pinned.length === SHUFFLE_MAX_PINNED) break;
  }

  const rest = products.filter((p) => !seenPinned.has(p.id));
  const allowedCategories = new Set(config.categories);
  const inShuffle = (p: T) =>
    (allowedCategories.size === 0 || allowedCategories.has(p.category)) &&
    (!config.skipSoldOut || p.stock > 0);

  const shuffled = rest
    .filter(inShuffle)
    .map((p) => ({ p, key: stableHash(`${dayKey}:${config.seed}:${p.id}`) }))
    .sort((a, b) => a.key - b.key || a.p.id.localeCompare(b.p.id))
    .map(({ p }) => p);

  const tail = rest.filter((p) => !inShuffle(p));

  return [...pinned, ...shuffled, ...tail];
}
