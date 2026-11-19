import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, Sparkles } from "lucide-react";
import { resolvePricing, themeBackground } from "@lydias-essence/utils";
import { useSite } from "../context/SiteContext";
import type { Product } from "../types/product";
import { formatNaira } from "../types/product";
import { FavouriteButton } from "./FavouriteButton";

interface ProductCardProps {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, index, onOpen }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { showDiscount } = useSite();
  // Same pricing rules as the admin preview: discount switch, start/end dates, sale < regular.
  const pricing = resolvePricing(product);
  const price = pricing.current;
  const onSale = pricing.onSale && showDiscount;

  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.07 }}
      whileHover={{ y: -5 }}
    >
      <button
        className="product-image"
        style={{ background: themeBackground(product.background_theme) }}
        onClick={() => onOpen(product)}
        aria-label={`View ${product.name}`}
      >
        {product.image_url && !imageFailed ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="image-placeholder">
            <Sparkles size={30} strokeWidth={1} />
            <span>{product.category}</span>
          </div>
        )}
        {onSale && <span className="sale-label">Special price</span>}
        {product.stock === 0 && <span className="sold-label">Sold out</span>}
        <span className="product-quick-view">
          Discover <ArrowDownRight size={15} />
        </span>
      </button>

      <div className="product-info">
        <div>
          <span className="eyebrow product-category">{product.category}</span>
          <button className="product-name" onClick={() => onOpen(product)}>
            {product.name}
          </button>
        </div>
        <div className="price-row">
          <span className="product-price">{formatNaira(price)}</span>
          {onSale && <span className="old-price">{formatNaira(product.price)}</span>}
          <FavouriteButton product={product} />
        </div>
      </div>
    </motion.article>
  );
}
