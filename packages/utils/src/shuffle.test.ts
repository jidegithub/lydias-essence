import { describe, expect, it } from "vitest";
import { applyDailyShuffle, shuffleDayKey, stableHash, type ShuffleConfig } from "./shuffle";

const items = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i}`,
  category: i % 2 === 0 ? "Jewellery" : "Perfumes",
  stock: i === 5 ? 0 : 3,
}));

const base: ShuffleConfig = { enabled: true, categories: [], skipSoldOut: true, pinnedIds: [], seed: 1 };

describe("applyDailyShuffle", () => {
  it("returns the original order when disabled", () => {
    const out = applyDailyShuffle(items, { ...base, enabled: false }, "2026-11-24");
    expect(out.map((p) => p.id)).toEqual(items.map((p) => p.id));
  });

  it("keeps the same order for the same day and seed", () => {
    const a = applyDailyShuffle(items, base, "2026-11-24").map((p) => p.id);
    const b = applyDailyShuffle(items, base, "2026-11-24").map((p) => p.id);
    expect(a).toEqual(b);
  });

  it("changes order on a new day or after a manual shuffle", () => {
    const today = applyDailyShuffle(items, base, "2026-11-24").map((p) => p.id);
    const tomorrow = applyDailyShuffle(items, base, "2026-11-25").map((p) => p.id);
    const reseeded = applyDailyShuffle(items, { ...base, seed: 2 }, "2026-11-24").map((p) => p.id);
    expect(tomorrow).not.toEqual(today);
    expect(reseeded).not.toEqual(today);
  });

  it("puts pinned products first, in saved order, and never duplicates", () => {
    const out = applyDailyShuffle(items, { ...base, pinnedIds: ["p7", "p2", "p7", "missing"] }, "2026-11-24");
    expect(out.slice(0, 2).map((p) => p.id)).toEqual(["p7", "p2"]);
    expect(out).toHaveLength(items.length);
    expect(new Set(out.map((p) => p.id)).size).toBe(items.length);
  });

  it("limits pinned products to six", () => {
    const pinnedIds = items.slice(0, 8).map((p) => p.id);
    const out = applyDailyShuffle(items, { ...base, pinnedIds }, "2026-11-24");
    expect(out.slice(0, 6).map((p) => p.id)).toEqual(pinnedIds.slice(0, 6));
  });

  it("only shuffles the selected categories and leaves the rest in order at the end", () => {
    const out = applyDailyShuffle(items, { ...base, categories: ["Perfumes"] }, "2026-11-24");
    const shuffledPart = out.slice(0, 5);
    expect(shuffledPart.every((p) => p.category === "Perfumes" && p.stock > 0)).toBe(true);
    const tail = out.slice(5).map((p) => p.id);
    expect(tail).toEqual(["p0", "p2", "p4", "p5", "p6", "p8", "p10"]);
  });

  it("moves sold-out products to the end when skipping is on", () => {
    const out = applyDailyShuffle(items, base, "2026-11-24");
    expect(out.slice(-1)[0].id).toBe("p5");
  });

  it("day key is a YYYY-MM-DD London date", () => {
    expect(shuffleDayKey(new Date("2026-11-24T12:00:00Z"))).toBe("2026-11-24");
    expect(stableHash("abc")).toBe(stableHash("abc"));
  });
});
