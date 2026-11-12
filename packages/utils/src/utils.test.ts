import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@lydias-essence/types";
import {
  DEFAULT_SITE_CONTENT, MAX_SOURCE_IMAGE_BYTES, discountPercent, fitWithin, replaceExtension, formatPrice, getDiscountState, isHttpsUrl, isValidWhatsappNumber, normalizePhoneDigits,
  parseMoney, resolvePricing, resolveSiteContent, slugify, themeBackground, validateAnnouncement, validateImageFile,
  validateProductForm, type ProductFormValues
} from "./index";

const now = new Date("2026-11-03T12:00:00Z");
const base = { price: 20000, sale_price: 15000, discount_enabled: true, discount_starts_at: null, discount_ends_at: null };

describe("pricing", () => {
  it("applies an active discount", () => {
    const r = resolvePricing(base, now);
    expect(r).toMatchObject({ current: 15000, original: 20000, onSale: true, percent: 25, state: "active" });
  });
  it("turning a discount off restores the regular price but keeps the sale price stored", () => {
    const r = resolvePricing({ ...base, discount_enabled: false }, now);
    expect(r).toMatchObject({ current: 20000, original: null, onSale: false, state: "off" });
  });
  it("respects start and end dates", () => {
    expect(getDiscountState({ ...base, discount_starts_at: "2026-12-01T00:00:00Z" }, now)).toBe("upcoming");
    expect(getDiscountState({ ...base, discount_ends_at: "2026-11-01T00:00:00Z" }, now)).toBe("expired");
    expect(getDiscountState({ ...base, discount_starts_at: "2026-11-01T00:00:00Z", discount_ends_at: "2026-11-30T00:00:00Z" }, now)).toBe("active");
  });
  it("never discounts to a price that is not lower", () => {
    expect(getDiscountState({ ...base, sale_price: 20000 }, now)).toBe("invalid");
    expect(resolvePricing({ ...base, sale_price: 25000 }, now).current).toBe(20000);
    expect(discountPercent(20000, 25000)).toBe(0);
  });
  it("treats legacy rows (no switch) with a sale price as discounted", () => {
    expect(resolvePricing({ price: 100, sale_price: 80 }, now).current).toBe(80);
  });
  it("formats naira from one place", () => {
    expect(formatPrice(18500)).toContain("18,500");
    expect(formatPrice(18500)).toContain("₦");
  });
});

const valid: ProductFormValues = {
  name: "Rose Oil", slug: "rose-oil", description: "", category: PRODUCT_CATEGORIES[0], price: "15000", salePrice: "", discountEnabled: false,
  discountStart: "", discountEnd: "", stock: "5", lowStockThreshold: "5", sortOrder: "0"
};

describe("product validation", () => {
  it("accepts a valid product", () => expect(validateProductForm(valid)).toEqual({}));
  it("requires a name, valid slug, category", () => {
    const e = validateProductForm({ ...valid, name: "", slug: "Bad Slug", category: "Nope" });
    expect(Object.keys(e).sort()).toEqual(["category", "name", "slug"]);
  });
  it("rejects negative, zero and malformed prices", () => {
    for (const price of ["-5", "0", "abc", "", "12.345"]) expect(validateProductForm({ ...valid, price }).price).toBeTruthy();
  });
  it("accepts naira-formatted input", () => expect(parseMoney("₦18,500")).toBe(18500));
  it("requires a lower sale price when the discount is on", () => {
    expect(validateProductForm({ ...valid, discountEnabled: true, salePrice: "" }).salePrice).toBeTruthy();
    expect(validateProductForm({ ...valid, discountEnabled: true, salePrice: "15000" }).salePrice).toBeTruthy();
    expect(validateProductForm({ ...valid, discountEnabled: true, salePrice: "12000" }).salePrice).toBeUndefined();
  });
  it("lets a discount be off without a sale price", () => expect(validateProductForm({ ...valid, salePrice: "" })).toEqual({}));
  it("checks the discount window order", () => {
    const e = validateProductForm({ ...valid, discountEnabled: true, salePrice: "10000", discountStart: "2026-12-02T10:00", discountEnd: "2026-12-01T10:00" });
    expect(e.discountEnd).toBeTruthy();
  });
  it("rejects negative or fractional stock", () => {
    expect(validateProductForm({ ...valid, stock: "-1" }).stock).toBeTruthy();
    expect(validateProductForm({ ...valid, stock: "2.5" }).stock).toBeTruthy();
  });
});

describe("files, slugs, contact", () => {
  it("accepts supported images and rejects the rest", () => {
    expect(validateImageFile({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateImageFile({ name: "a.exe", type: "application/x-msdownload", size: 1000 })).toBeTruthy();
    expect(validateImageFile({ name: "a.svg", type: "image/svg+xml", size: 1000 })).toBeTruthy();
    expect(validateImageFile({ name: "a.png", type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateImageFile({ name: "a.jpg.exe", type: "image/jpeg", size: 1000 })).toBeTruthy();
    expect(validateImageFile({ name: "big.png", type: "image/png", size: 6 * 1024 * 1024 })).toBeTruthy();
  });
  it("accepts big phone photos as SOURCE files (they are shrunk before upload) but not huge ones", () => {
    const big = { name: "IMG_1.jpg", type: "image/jpeg", size: 12 * 1024 * 1024 };
    expect(validateImageFile(big)).toBeTruthy();
    expect(validateImageFile(big, MAX_SOURCE_IMAGE_BYTES)).toBeNull();
    expect(validateImageFile({ ...big, size: 26 * 1024 * 1024 }, MAX_SOURCE_IMAGE_BYTES)).toBeTruthy();
  });
  it("fits images within the max edge without ever enlarging", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1, 1600).height).toBe(1);
  });
  it("renames to the new extension", () => {
    expect(replaceExtension("serum final.JPG", "webp")).toBe("serum final.webp");
    expect(replaceExtension("noext", "webp")).toBe("noext.webp");
    expect(replaceExtension("a.b.png", "jpg")).toBe("a.b.jpg");
  });
  it("slugifies names", () => {
    expect(slugify("Petal & Silk")).toBe("petal-and-silk");
    expect(slugify("  Crème Brûlée!! ")).toBe("creme-brulee");
    expect(slugify("!!!")).toBe("product");
  });
  it("validates WhatsApp numbers and URLs", () => {
    expect(normalizePhoneDigits("+234 801 234 5678")).toBe("2348012345678");
    expect(isValidWhatsappNumber("12345")).toBe(false);
    expect(isHttpsUrl("https://instagram.com/x")).toBe(true);
    expect(isHttpsUrl("http://x.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
  });
  it("announcement rules", () => {
    expect(validateAnnouncement(true, "  ")).toBeTruthy();
    expect(validateAnnouncement(false, "")).toBeNull();
    expect(validateAnnouncement(true, "x".repeat(241))).toBeTruthy();
  });
  it("themes fall back safely", () => {
    expect(themeBackground("blush")).toBe("var(--theme-blush)");
    expect(themeBackground("javascript:evil")).toBe("var(--theme-default)");
  });
});

describe("site content", () => {
  it("fills blanks and missing keys with the shipped wording", () => {
    const c = resolveSiteContent({ hero: { headingLine1: "Hello", headingLine2: "  " } });
    expect(c.hero.headingLine1).toBe("Hello");
    expect(c.hero.headingLine2).toBe(DEFAULT_SITE_CONTENT.hero.headingLine2);
    expect(c.footer).toEqual(DEFAULT_SITE_CONTENT.footer);
  });
  it("ignores malformed stored data", () => {
    expect(resolveSiteContent({ trustStrip: ["only one"] as never }).trustStrip).toEqual(DEFAULT_SITE_CONTENT.trustStrip);
    expect(resolveSiteContent(null).beautyRules.enabled).toBe(true);
  });
});
