/**
 * Shared pricing rules. The admin preview and the storefront both call
 * resolvePricing(), so what the owner sees is exactly what shoppers see.
 */
export interface PricingInput {
  price: number;
  sale_price: number | null;
  /** Older rows (before discounts had an on/off switch) may not have this. */
  discount_enabled?: boolean | null;
  discount_starts_at?: string | null;
  discount_ends_at?: string | null;
}

export type DiscountState = "off" | "invalid" | "upcoming" | "expired" | "active";

export interface ResolvedPricing {
  regular: number;
  /** The price a shopper pays right now. */
  current: number;
  /** Struck-through price, only when a discount is active. */
  original: number | null;
  onSale: boolean;
  percent: number;
  state: DiscountState;
}

export function discountPercent(price: number, salePrice: number): number {
  if (!(price > 0) || !(salePrice >= 0) || salePrice >= price) return 0;
  return Math.round((1 - salePrice / price) * 100);
}

export function getDiscountState(p: PricingInput, now: Date = new Date()): DiscountState {
  const enabled = p.discount_enabled ?? p.sale_price !== null;
  if (!enabled) return "off";
  if (p.sale_price === null || !(p.sale_price >= 0) || p.sale_price >= p.price) return "invalid";
  const t = now.getTime();
  if (p.discount_starts_at && new Date(p.discount_starts_at).getTime() > t) return "upcoming";
  if (p.discount_ends_at && new Date(p.discount_ends_at).getTime() <= t) return "expired";
  return "active";
}

export function resolvePricing(p: PricingInput, now: Date = new Date()): ResolvedPricing {
  const state = getDiscountState(p, now);
  const onSale = state === "active" && p.sale_price !== null;
  return {
    regular: p.price,
    current: onSale ? (p.sale_price as number) : p.price,
    original: onSale ? p.price : null,
    onSale,
    percent: onSale ? discountPercent(p.price, p.sale_price as number) : 0,
    state
  };
}

/** Back-compat helper used by the original storefront. */
export function getEffectivePrice(p: PricingInput, now: Date = new Date()): number {
  return resolvePricing(p, now).current;
}

export const DISCOUNT_STATE_LABEL: Record<DiscountState, string> = {
  off: "No discount",
  invalid: "Needs attention",
  upcoming: "Scheduled",
  expired: "Ended",
  active: "Running now"
};
