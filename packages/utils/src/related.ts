import { RELATED_CATEGORIES, type Product } from "@lydias-essence/types";
import { resolvePricing } from "./pricing";

export type RelatableProduct = Pick<
  Product,
  "id" | "name" | "description" | "category" | "price" | "sale_price" | "stock" | "is_featured" | "sort_order"
> &
  Partial<Pick<Product, "discount_enabled" | "discount_starts_at" | "discount_ends_at">>;

/** How much each signal counts. Higher total = shown first. Tweak here. */
export const RELATED_WEIGHTS = {
  /** Same category as the product being viewed. */
  sameCategory: 50,
  /** A category that pairs well with it (see RELATED_CATEGORIES in packages/types). */
  pairedCategory: 25,
  /** Up to this many points for a similar price (identical price = full points). */
  priceCloseness: 20,
  /** Per word shared by the names/descriptions (see sharedWordCap). */
  sharedWord: 5,
  sharedWordCap: 3,
  /** Products the owner marked "Feature this product". */
  featured: 8,
  /** Sold-out items only appear when there is nothing else to show. */
  soldOut: -1000
} as const;

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "your", "made", "have", "will", "into", "them", "their", "than", "then",
  "also", "only", "more", "very", "each", "most", "some", "about", "these", "those", "while", "where",
  "which", "would", "there", "when", "what", "every", "feel", "feels", "like", "just", "designed", "chosen",
  "perfect", "ideal", "great", "makes", "make", "from", "over", "such", "much", "many", "ever", "ones"
]);

function wordsOf(p: Pick<RelatableProduct, "name" | "description">): Set<string> {
  const text = `${p.name} ${p.description}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(text.split(/\s+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w)));
}

/**
 * "You may also love": the products most like the one being viewed.
 * Automatic and predictable (no randomness): the same product always gets the same suggestions.
 * Always returns up to `limit` items when the catalogue has enough products; never the product itself.
 */
export function getRelatedProducts<T extends RelatableProduct>(
  current: T,
  all: readonly T[],
  options: { limit?: number; now?: Date } = {}
): T[] {
  const { limit = 3, now = new Date() } = options;
  const w = RELATED_WEIGHTS;
  const currentPrice = resolvePricing(current, now).current;
  const currentWords = wordsOf(current);
  const paired = RELATED_CATEGORIES[current.category] ?? [];

  const scored = all
    .filter((c) => c.id !== current.id)
    .map((c) => {
      let score = 0;
      if (c.category === current.category) score += w.sameCategory;
      else if (paired.includes(c.category)) score += w.pairedCategory;

      const price = resolvePricing(c, now).current;
      if (currentPrice > 0 && price > 0) {
        score += w.priceCloseness * (Math.min(price, currentPrice) / Math.max(price, currentPrice));
      }

      let shared = 0;
      for (const word of wordsOf(c)) if (currentWords.has(word)) shared++;
      score += Math.min(shared, w.sharedWordCap) * w.sharedWord;

      if (c.is_featured) score += w.featured;
      if (c.stock <= 0) score += w.soldOut;
      return { c, score };
    });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.c.sort_order - b.c.sort_order ||
      a.c.name.localeCompare(b.c.name) ||
      a.c.id.localeCompare(b.c.id)
  );

  return scored.slice(0, Math.max(0, limit)).map((x) => x.c);
}
