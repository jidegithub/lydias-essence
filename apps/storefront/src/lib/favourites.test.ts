import { describe, expect, it } from "vitest";
import {
  FAVOURITES_KEY, MAX_FAVOURITES, loadFavourites, newVisitorId, parseFavourites, pruneFavourites,
  saveFavourites, toggleFavourite, type FavouritesState, type StorageLike
} from "./favourites";
import { PAGE_SIZE, pageWindow } from "./pagination";

const fakeStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string>; writes: number } => {
  const s = { data: { ...initial }, writes: 0, getItem: (k: string) => s.data[k] ?? null, setItem: (k: string, v: string) => { s.data[k] = v; s.writes++; } };
  return s;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const state = (ids: string[] = []): FavouritesState => ({ visitorId: "11111111-1111-4111-8111-111111111111", ids, updatedAt: "2026-01-01T00:00:00.000Z" });

describe("visitor id", () => {
  it("is a random UUID v4, different every time", () => {
    const a = newVisitorId(), b = newVisitorId();
    expect(a).toMatch(UUID); expect(b).toMatch(UUID); expect(a).not.toBe(b);
  });
  it("still works where crypto.randomUUID doesn't exist (plain http)", () => {
    const original = globalThis.crypto.randomUUID;
    // @ts-expect-error simulate an insecure context
    globalThis.crypto.randomUUID = undefined;
    try { expect(newVisitorId()).toMatch(UUID); } finally { globalThis.crypto.randomUUID = original; }
  });
});

describe("loading and saving", () => {
  it("creates a visitor id and an empty list on the first visit, and keeps the same id afterwards", () => {
    const storage = fakeStorage();
    const first = loadFavourites(storage);
    expect(first.ids).toEqual([]); expect(first.visitorId).toMatch(UUID);
    expect(loadFavourites(storage).visitorId).toBe(first.visitorId);
  });
  it("survives a save/load round trip", () => {
    const storage = fakeStorage();
    saveFavourites(state(["a", "b"]), storage);
    expect(loadFavourites(storage).ids).toEqual(["a", "b"]);
  });
  it("starts fresh (never crashes) on corrupt or strange stored data", () => {
    for (const bad of ["{not json", "null", "42", '"text"', "[]", '{"ids":"nope"}']) {
      const s = loadFavourites(fakeStorage({ [FAVOURITES_KEY]: bad }));
      expect(Array.isArray(s.ids)).toBe(true); expect(s.visitorId).toMatch(/^[a-z0-9-]{8,64}$/i);
    }
  });
  it("cleans the stored list: removes non-strings and duplicates, and caps its size", () => {
    const raw = JSON.stringify({ visitorId: "abc12345-x", ids: ["a", "a", 7, null, "", "b", ...Array.from({ length: 300 }, (_, i) => `p${i}`)] });
    const s = parseFavourites(raw)!;
    expect(s.ids.slice(0, 2)).toEqual(["a", "b"]); expect(s.ids).toHaveLength(MAX_FAVOURITES); expect(new Set(s.ids).size).toBe(s.ids.length);
  });
  it("replaces an invalid visitor id but keeps the saved products", () => {
    const s = parseFavourites(JSON.stringify({ visitorId: "<script>", ids: ["a"] }))!;
    expect(s.visitorId).toMatch(UUID); expect(s.ids).toEqual(["a"]);
  });
  it("works when storage is missing or throws (private browsing)", () => {
    expect(loadFavourites(null).ids).toEqual([]);
    const throwing: StorageLike = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadFavourites(throwing).ids).toEqual([]);
    expect(saveFavourites(state(["a"]), throwing)).toBe(false);
    expect(saveFavourites(state(["a"]), null)).toBe(false);
  });
  it("doesn't rewrite storage when nothing changed", () => {
    const storage = fakeStorage(); const s = state(["a"]);
    saveFavourites(s, storage); saveFavourites(s, storage);
    expect(storage.writes).toBe(1);
  });
});

describe("toggleFavourite", () => {
  it("adds to the front, then removes", () => {
    const a = toggleFavourite(state(["x"]), "y");
    expect(a.added).toBe(true); expect(a.state.ids).toEqual(["y", "x"]);
    const r = toggleFavourite(a.state, "y");
    expect(r.added).toBe(false); expect(r.state.ids).toEqual(["x"]);
  });
  it("does not change the state it was given", () => {
    const s = state(["x"]); toggleFavourite(s, "y"); expect(s.ids).toEqual(["x"]);
  });
  it("refuses to go past the limit, but still lets you remove", () => {
    const full = state(Array.from({ length: MAX_FAVOURITES }, (_, i) => `p${i}`));
    const blocked = toggleFavourite(full, "new");
    expect(blocked.limited).toBe(true); expect(blocked.added).toBe(false); expect(blocked.state).toBe(full);
    expect(toggleFavourite(full, "p0").state.ids).toHaveLength(MAX_FAVOURITES - 1);
  });
});

describe("pruneFavourites", () => {
  it("removes products that no longer exist, keeps the rest in order", () => {
    expect(pruneFavourites(state(["a", "gone", "b"]), new Set(["a", "b"])).ids).toEqual(["a", "b"]);
  });
  it("returns the very same object when nothing was removed (no pointless re-render)", () => {
    const s = state(["a"]); expect(pruneFavourites(s, new Set(["a", "b"]))).toBe(s);
  });
});

describe("pageWindow (Load more)", () => {
  it("shows the first page and offers a full next page", () => {
    expect(pageWindow(30, PAGE_SIZE)).toMatchObject({ shown: 12, hasMore: true, remaining: 18, added: 12, nextVisible: 24 });
  });
  it("the last page can be smaller, then there is nothing more", () => {
    expect(pageWindow(30, 24)).toMatchObject({ shown: 24, added: 6, hasMore: true });
    expect(pageWindow(30, 36)).toMatchObject({ shown: 30, added: 0, hasMore: false });
  });
  it("no button when everything already fits, and handles empty lists", () => {
    expect(pageWindow(5, PAGE_SIZE).hasMore).toBe(false);
    expect(pageWindow(12, PAGE_SIZE).hasMore).toBe(false);
    expect(pageWindow(0, PAGE_SIZE)).toMatchObject({ shown: 0, hasMore: false, added: 0 });
  });
});
