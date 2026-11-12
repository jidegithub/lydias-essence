import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles, X } from "lucide-react";
import type { Product } from "../types/product";
import { formatNaira, getEffectivePrice } from "../types/product";
import { whatsappLink } from "./Whatsapp";

interface ProductModalProps {
  product: Product;
  products: Product[];
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export function ProductModal({ product, products, onClose, onSelect }: ProductModalProps) {
  const related = products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 3);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const enquiry = whatsappLink(
    `Hello Lydia's Essence! I'm interested in ${product.name} (${formatNaira(getEffectivePrice(product))}). Please share more details.`,
  );

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close product details">
          <X />
        </button>

        <div className="modal-main">
          <div className="modal-image">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <div className="image-placeholder"><Sparkles size={36} /></div>
            )}
          </div>

          <div className="modal-details">
            <span className="eyebrow">{product.category}</span>
            <h2>{product.name}</h2>
            <p className="modal-price">{formatNaira(getEffectivePrice(product))}</p>
            <p className="modal-description">{product.description}</p>

            <div className="availability">
              <span className={`availability-dot ${product.stock > 0 ? "" : "out"}`} />
              {product.stock > 0 ? "Available to enquire" : "Currently unavailable"}
            </div>

            {product.stock > 0 && enquiry ? (
              <a className="button button-dark modal-cta" href={enquiry} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} />
                Enquire on WhatsApp
                <ArrowRight size={16} />
              </a>
            ) : (
              <p className="contact-note">
                {product.stock <= 0
                  ? "This product is currently unavailable."
                  : "WhatsApp enquiries are temporarily unavailable. Please contact us through our other channels."}
              </p>
            )}

            <p className="fine-print">
              Sample product information. Confirm availability and final pricing
              with our team.
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <div className="related-products">
            <span className="eyebrow">You may also love</span>
            <div className="related-grid">
              {related.map((item) => (
                <button className="related-item" key={item.id} onClick={() => onSelect(item)}>
                  <span>{item.name}</span>
                  <span>{formatNaira(getEffectivePrice(item))}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
