import { formatPrice, resolvePricing, themeBackground, type PricingInput } from "@lydias-essence/utils";
import type { BackgroundTheme } from "@lydias-essence/types";

export interface PreviewProduct extends PricingInput {
  name: string;
  category: string;
  image_url: string | null;
  background_theme: BackgroundTheme;
}

/** A compact look at how a product card appears to shoppers (same pricing rules as the storefront). */
export function ProductPreviewCard({ product, showDiscount = true }: { product: PreviewProduct; showDiscount?: boolean }) {
  const pricing = resolvePricing(product);
  const showSale = pricing.onSale && showDiscount;
  return (
    <article className="p-card">
      <div className="p-image" style={{ background: themeBackground(product.background_theme) }}>
        {product.image_url ? <img src={product.image_url} alt="" /> : <span>{product.category || "Product"}</span>}
        {showSale && <span className="p-label">Special price</span>}
      </div>
      <p className="p-cat">{product.category}</p>
      <p className="p-name">{product.name || "Product name"}</p>
      <p className="p-price">
        {formatPrice(pricing.current)}
        {showSale && pricing.original !== null && <s>{formatPrice(pricing.original)}</s>}
      </p>
    </article>
  );
}
