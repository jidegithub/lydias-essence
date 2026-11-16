import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES, RELATED_CATEGORIES, type ProductCategory } from "@lydias-essence/types";
import { getRelatedProducts, type RelatableProduct } from "./related";

let n = 0;
const make = (over: Partial<RelatableProduct> & { name: string; category: ProductCategory }): RelatableProduct => ({
  id: `id-${++n}`,
  description: "",
  price: 20000,
  sale_price: null,
  stock: 10,
  is_featured: false,
  sort_order: 0,
  ...over
});
const names = (list: RelatableProduct[]) => list.map((p) => p.name);

describe("getRelatedProducts", () => {
  it("never returns the product itself and never repeats a product", () => {
    const a = make({ name: "A", category: "Jewellery" });
    const all = [a, make({ name: "B", category: "Jewellery" }), make({ name: "C", category: "Jewellery" }), make({ name: "D", category: "Jewellery" })];
    const out = getRelatedProducts(a, all);
    expect(out.find((p) => p.id === a.id)).toBeUndefined();
    expect(new Set(out.map((p) => p.id)).size).toBe(out.length);
    expect(out).toHaveLength(3);
  });

  it("puts the same category first", () => {
    const cur = make({ name: "Gold Hoops", category: "Jewellery" });
    const same = make({ name: "Pearl Studs", category: "Jewellery", price: 90000 });
    const other = make({ name: "Amber Reed Diffuser", category: "Home Scents", price: 20000 });
    expect(names(getRelatedProducts(cur, [cur, other, same]))[0]).toBe("Pearl Studs");
  });

  it("prefers a similar price within the same category", () => {
    const cur = make({ name: "A", category: "Beauty", price: 20000 });
    const near = make({ name: "Near", category: "Beauty", price: 21000 });
    const far = make({ name: "Far", category: "Beauty", price: 90000 });
    expect(names(getRelatedProducts(cur, [cur, far, near]))).toEqual(["Near", "Far"]);
  });

  it("uses the price a shopper actually pays (active discount counts, ended discount does not)", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const cur = make({ name: "Cur", category: "Beauty", price: 10000 });
    const onSale = make({ name: "OnSale", category: "Beauty", price: 40000, sale_price: 10000, discount_enabled: true });
    const ended = make({ name: "Ended", category: "Beauty", price: 40000, sale_price: 10000, discount_enabled: true, discount_ends_at: "2026-11-01T00:00:00Z" });
    expect(names(getRelatedProducts(cur, [cur, ended, onSale], { now }))).toEqual(["OnSale", "Ended"]);
  });

  it("nudges products that share words with the one being viewed", () => {
    const cur = make({ name: "Amber Glow Oil", description: "Warm amber and vanilla", category: "Perfumes" });
    const match = make({ name: "Amber Mist", description: "Amber and vanilla notes", category: "Perfumes" });
    const plain = make({ name: "Citrus Splash", description: "Fresh lemon", category: "Perfumes" });
    expect(names(getRelatedProducts(cur, [cur, plain, match]))[0]).toBe("Amber Mist");
  });

  it("gives featured products a boost over otherwise equal ones", () => {
    const cur = make({ name: "Cur", category: "Glasses" });
    const a = make({ name: "A", category: "Glasses" });
    const b = make({ name: "B", category: "Glasses", is_featured: true });
    expect(names(getRelatedProducts(cur, [cur, a, b]))[0]).toBe("B");
  });

  it("shows sold-out products only when nothing else is available", () => {
    const cur = make({ name: "Cur", category: "Beauty" });
    const out = make({ name: "SoldOut", category: "Beauty", stock: 0 });
    const ok1 = make({ name: "Ok1", category: "Jewellery" });
    const ok2 = make({ name: "Ok2", category: "Glasses" });
    const ok3 = make({ name: "Ok3", category: "Perfumes" });
    expect(names(getRelatedProducts(cur, [cur, out, ok1, ok2, ok3]))).not.toContain("SoldOut");
    expect(names(getRelatedProducts(cur, [cur, out, ok1]))).toEqual(["Ok1", "SoldOut"]);
  });

  it("a product alone in its category still gets suggestions, paired categories first", () => {
    const cur = make({ name: "Cur", category: "Home Scents" });
    const paired = make({ name: "Paired", category: "Perfumes" });
    const unrelated = make({ name: "Unrelated", category: "Glasses" });
    const also = make({ name: "Also", category: "Jewellery" });
    const out = names(getRelatedProducts(cur, [cur, unrelated, also, paired]));
    expect(out[0]).toBe("Paired");
    expect(out).toHaveLength(3);
  });

  it("is deterministic and does not change the list it was given", () => {
    const cur = make({ name: "Cur", category: "Beauty" });
    const all = [cur, make({ name: "B", category: "Beauty" }), make({ name: "C", category: "Beauty" }), make({ name: "D", category: "Glasses" })];
    const copy = [...all];
    const first = names(getRelatedProducts(cur, all));
    expect(names(getRelatedProducts(cur, all))).toEqual(first);
    expect(all).toEqual(copy);
  });

  it("handles tiny catalogues and custom limits", () => {
    const cur = make({ name: "Cur", category: "Beauty" });
    expect(getRelatedProducts(cur, [cur])).toEqual([]);
    expect(getRelatedProducts(cur, [])).toEqual([]);
    const two = [cur, make({ name: "B", category: "Beauty" })];
    expect(getRelatedProducts(cur, two)).toHaveLength(1);
    expect(getRelatedProducts(cur, [cur, ...Array.from({ length: 6 }, (_, i) => make({ name: `P${i}`, category: "Beauty" }))], { limit: 4 })).toHaveLength(4);
    expect(getRelatedProducts(cur, two, { limit: 0 })).toEqual([]);
  });

  it("breaks ties by the owner's sort order, then name", () => {
    const cur = make({ name: "Cur", category: "Beauty" });
    const b = make({ name: "Bravo", category: "Beauty", sort_order: 2 });
    const a = make({ name: "Alpha", category: "Beauty", sort_order: 2 });
    const first = make({ name: "Zulu", category: "Beauty", sort_order: 1 });
    expect(names(getRelatedProducts(cur, [cur, b, a, first]))).toEqual(["Zulu", "Alpha", "Bravo"]);
  });
});

describe("RELATED_CATEGORIES", () => {
  it("covers every category, never pairs a category with itself, and only uses real categories", () => {
    for (const c of PRODUCT_CATEGORIES) {
      expect(RELATED_CATEGORIES[c]).toBeDefined();
      expect(RELATED_CATEGORIES[c]).not.toContain(c);
      for (const other of RELATED_CATEGORIES[c]) expect(PRODUCT_CATEGORIES).toContain(other);
    }
  });
});
