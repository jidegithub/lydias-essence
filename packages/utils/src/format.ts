/**
 * Single source of truth for how money is shown. The store sells in Nigerian
 * naira; change it here and both the storefront and the admin follow.
 */
export const STORE_CURRENCY = { code: "NGN", locale: "en-NG" } as const;

export function formatPrice(amount: number, currency: { code: string; locale: string } = STORE_CURRENCY): string {
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Kept for backwards compatibility with the original storefront code. */
export const formatNaira = (amount: number): string => formatPrice(amount);

/** Typographic apostrophe for display: Lydia's -> Lydia’s */
export function typographic(text: string): string {
  return text.replace(/'/g, "\u2019");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateTime(iso);
}
