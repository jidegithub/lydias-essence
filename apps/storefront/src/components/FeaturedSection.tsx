import { ArrowRight } from "lucide-react";
import { useSite } from "../context/SiteContext";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";

interface FeaturedSectionProps {
  products: Product[];
  onOpenProduct: (product: Product) => void;
}

export function FeaturedSection({ products, onOpenProduct }: FeaturedSectionProps) {
  const { content } = useSite();
  const heading = content.nextFavourite;

  return (
    <section className="featured-section section-pad">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{heading.eyebrow}</span>
          <h2>{heading.headingLead} <em>{heading.headingEmphasis}</em></h2>
        </div>
        <a className="text-link" href="#collection">
          {heading.linkLabel} <ArrowRight size={16} />
        </a>
      </div>

      <div className="product-grid featured-grid">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            onOpen={onOpenProduct}
          />
        ))}
      </div>
    </section>
  );
}
