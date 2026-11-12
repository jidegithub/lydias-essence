import { ArrowRight } from "lucide-react";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";

interface FeaturedSectionProps {
  products: Product[];
  onOpenProduct: (product: Product) => void;
}

export function FeaturedSection({ products, onOpenProduct }: FeaturedSectionProps) {
  return (
    <section className="featured-section section-pad">
      <div className="section-heading">
        <div>
          <span className="eyebrow">A GOOD PLACE TO START</span>
          <h2>Your next <em>favourite.</em></h2>
        </div>
        <a className="text-link" href="#collection">
          Shop everything <ArrowRight size={16} />
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
