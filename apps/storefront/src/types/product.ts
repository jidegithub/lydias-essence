import type { ProductCategory } from "@lydias-essence/types";

// The category list lives in one place (packages/types) and is shared with the admin.
export type { ProductCategory };

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  image_url: string | null;
  image_urls: string[];
  published: boolean;
  specifications: Record<string, unknown>;
}

export function getEffectivePrice(product: Product): number {
  if (
    product.sale_price !== null &&
    product.sale_price >= 0 &&
    product.sale_price < product.price
  ) {
    return product.sale_price;
  }

  return product.price;
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}