import { PRODUCT_CATEGORIES } from "@lydias-essence/types";
import { SLUG_PATTERN } from "./slug";

/** Raw form values (strings, as typed into inputs). */
export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  category: string;
  price: string;
  salePrice: string;
  discountEnabled: boolean;
  discountStart: string; // datetime-local
  discountEnd: string; // datetime-local
  stock: string;
  lowStockThreshold: string;
  sortOrder: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

export const MAX_PRICE = 99_999_999.99;
export const MAX_STOCK = 1_000_000;

export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[,\s\u20A6]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

export function parseWholeNumber(input: string): number | null {
  const t = input.trim();
  if (t === "") return null;
  if (!/^-?\d+$/.test(t)) return Number.NaN;
  return Number(t);
}

export function validateProductForm(v: ProductFormValues): ProductFormErrors {
  const e: ProductFormErrors = {};

  const name = v.name.trim();
  if (!name) e.name = "Give the product a name.";
  else if (name.length < 2) e.name = "The name needs at least 2 characters.";
  else if (name.length > 120) e.name = "Keep the name under 120 characters.";

  const slug = v.slug.trim();
  if (!slug) e.slug = "Add a web address for this product.";
  else if (!SLUG_PATTERN.test(slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
  else if (slug.length > 80) e.slug = "Keep the web address under 80 characters.";

  if (v.description.length > 2000) e.description = "Keep the description under 2,000 characters.";

  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(v.category)) e.category = "Choose a category.";

  const price = parseMoney(v.price);
  if (price === null) e.price = "Enter the regular price.";
  else if (Number.isNaN(price)) e.price = "Enter a valid amount, e.g. 18500 or 18500.50.";
  else if (price <= 0) e.price = "The price must be more than zero.";
  else if (price > MAX_PRICE) e.price = "That price is too large.";

  const sale = parseMoney(v.salePrice);
  if (sale !== null && Number.isNaN(sale)) e.salePrice = "Enter a valid amount.";
  else if (v.discountEnabled) {
    if (sale === null) e.salePrice = "Enter the sale price, or turn the discount off.";
    else if (sale < 0) e.salePrice = "The sale price can’t be negative.";
    else if (typeof price === "number" && Number.isFinite(price) && sale >= price) {
      e.salePrice = "The sale price must be lower than the regular price.";
    }
  } else if (sale !== null && sale < 0) {
    e.salePrice = "The sale price can’t be negative.";
  }

  if (v.discountEnabled && v.discountStart && v.discountEnd) {
    if (new Date(v.discountEnd).getTime() <= new Date(v.discountStart).getTime()) {
      e.discountEnd = "The end date must be after the start date.";
    }
  }
  if (v.discountStart && Number.isNaN(new Date(v.discountStart).getTime())) e.discountStart = "Enter a valid date.";
  if (v.discountEnd && Number.isNaN(new Date(v.discountEnd).getTime())) e.discountEnd = "Enter a valid date.";

  const stock = parseWholeNumber(v.stock);
  if (stock === null) e.stock = "Enter the stock quantity (0 if sold out).";
  else if (Number.isNaN(stock) || stock < 0) e.stock = "Stock must be a whole number, 0 or more.";
  else if (stock > MAX_STOCK) e.stock = "That quantity is too large.";

  const low = parseWholeNumber(v.lowStockThreshold);
  if (low === null || Number.isNaN(low) || low < 0 || low > MAX_STOCK) {
    e.lowStockThreshold = "Enter a whole number, 0 or more.";
  }

  const sort = parseWholeNumber(v.sortOrder);
  if (sort === null || Number.isNaN(sort) || Math.abs(sort) > 100000) {
    e.sortOrder = "Enter a whole number (0 is fine).";
  }

  return e;
}

export function validateAnnouncement(enabled: boolean, text: string): string | null {
  const t = text.trim();
  if (enabled && !t) return "Add some text, or switch the banner off.";
  if (t.length > 240) return "Keep the announcement under 240 characters so it reads comfortably.";
  return null;
}
