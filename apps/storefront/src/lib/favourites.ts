/**
 * Favourites without an account. Each browser gets a random visitor ID and a saved list,
 * kept on the visitor's own device (localStorage). Nothing is sent anywhere.
 * Pure functions only, so they are easy to test; the React side lives in context/FavouritesContext.tsx.
 */
export const FAVOURITES_KEY = "le:favourites:v1";
/** Keeps the list (and its storage) sensible. */
export const MAX_FAVOURITES = 100;

export interface FavouritesState {
  /** Random ID for this browser (no personal data). Handy later if favourites are ever synced. */
  visitorId: string;
  /** Product ids, most recently saved first. */
  ids: string[];
  updatedAt: string;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function newVisitorId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID only exists on https/localhost; this works everywhere.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Reads what was stored, tolerating anything (corrupt JSON, wrong shapes, duplicates, too many). */
export function parseFavourites(raw: string | null | undefined): FavouritesState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as { visitorId?: unknown; ids?: unknown; updatedAt?: unknown };
  const ids = Array.isArray(d.ids)
    ? [...new Set(d.ids.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 80))].slice(0, MAX_FAVOURITES)
    : [];
  const visitorId =
    typeof d.visitorId === "string" && /^[a-z0-9-]{8,64}$/i.test(d.visitorId) ? d.visitorId : newVisitorId();
  const updatedAt = typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString();
  return { visitorId, ids, updatedAt };
}

export function loadFavourites(storage: StorageLike | null): FavouritesState {
  try {
    const parsed = parseFavourites(storage?.getItem(FAVOURITES_KEY));
    if (parsed) return parsed;
  } catch {
    /* storage unavailable: start fresh in memory */
  }
  const fresh: FavouritesState = { visitorId: newVisitorId(), ids: [], updatedAt: new Date().toISOString() };
  saveFavourites(fresh, storage);
  return fresh;
}

/** Returns false when it couldn't be stored (e.g. private mode); the list still works for this visit. */
export function saveFavourites(state: FavouritesState, storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    const next = JSON.stringify({ visitorId: state.visitorId, ids: state.ids, updatedAt: state.updatedAt });
    if (storage.getItem(FAVOURITES_KEY) === next) return true; // unchanged: don't wake other tabs
    storage.setItem(FAVOURITES_KEY, next);
    return true;
  } catch {
    return false;
  }
}

export function toggleFavourite(
  state: FavouritesState,
  productId: string,
  now: Date = new Date()
): { state: FavouritesState; added: boolean; limited: boolean } {
  if (state.ids.includes(productId)) {
    return {
      state: { ...state, ids: state.ids.filter((id) => id !== productId), updatedAt: now.toISOString() },
      added: false,
      limited: false
    };
  }
  if (state.ids.length >= MAX_FAVOURITES) return { state, added: false, limited: true };
  return {
    state: { ...state, ids: [productId, ...state.ids], updatedAt: now.toISOString() },
    added: true,
    limited: false
  };
}

/** Drops products that no longer exist in the shop. Returns the same object when nothing changed. */
export function pruneFavourites(state: FavouritesState, validIds: ReadonlySet<string>): FavouritesState {
  const kept = state.ids.filter((id) => validIds.has(id));
  return kept.length === state.ids.length ? state : { ...state, ids: kept, updatedAt: new Date().toISOString() };
}
