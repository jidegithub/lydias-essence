export type ProductCategory =
  | "Skincare"
  | "Perfumes"
  | "Beauty"
  | "Glasses";

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