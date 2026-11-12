import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, Heart, Sparkles } from "lucide-react";
import type { Product } from "../types/product";
import { formatNaira, getEffectivePrice } from "../types/product";

interface ProductCardProps {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, index, onOpen }: ProductCardProps) {
  const [liked, setLiked] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const price = getEffectivePrice(product);
  const onSale = product.sale_price !== null && product.sale_price < product.price;

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
          <button
            className={`heart-button ${liked ? "is-liked" : ""}`}
            onClick={() => setLiked((value) => !value)}
            aria-label={
              liked
                ? `Remove ${product.name} from favourites`
                : `Add ${product.name} to favourites`
            }
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
