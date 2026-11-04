import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  X
} from "lucide-react";

import { AnnouncementMarquee } from "./components/AnnouncementMarquee";
import {
  fetchAnnouncement,
  readCachedAnnouncement,
  type Announcement
} from "./lib/announcement";
import { getProducts } from "./lib/products";
import type { Product, ProductCategory } from "./types/product";
import { formatNaira, getEffectivePrice } from "./types/product";

const categories = [
  "All",
  "Perfumes",
  "Jewelries",
  "Glasses",
  "Beauty"
] as const;

type CategoryFilter = (typeof categories)[number];

const whatsappNumber =
  import.meta.env.VITE_WHATSAPP_NUMBER ?? "";

function whatsappLink(message: string) {
  const number = whatsappNumber.replace(/\D/g, "");

  if (!number) return "#";

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function ProductCard({
  product,
  index,
  onOpen
}: {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const price = getEffectivePrice(product);
  const onSale =
    product.sale_price !== null &&
    product.sale_price < product.price;

  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.55,
        delay: (index % 4) * 0.07
      }}
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

        {onSale && (
          <span className="sale-label">Special price</span>
        )}

        {product.stock === 0 && (
          <span className="sold-label">Sold out</span>
        )}

        <span className="product-quick-view">
          Discover <ArrowDownRight size={15} />
        </span>
      </button>

      <div className="product-info">
        <div>
          <span className="eyebrow product-category">
            {product.category}
          </span>

          <button
            className="product-name"
            onClick={() => onOpen(product)}
          >
            {product.name}
          </button>
        </div>

        <div className="price-row">
          <span className="product-price">
            {formatNaira(price)}
          </span>

          {onSale && (
            <span className="old-price">
              {formatNaira(product.price)}
            </span>
          )}

          <button
            className={`heart-button ${liked ? "is-liked" : ""}`}
            onClick={() => setLiked(!liked)}
            aria-label={
              liked
                ? `Remove ${product.name} from favourites`
                : `Add ${product.name} to favourites`
            }
          >
            <Heart
              size={17}
              fill={liked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function ProductModal({
  product,
  products,
  onClose,
  onSelect
}: {
  product: Product;
  products: Product[];
  onClose: () => void;
  onSelect: (product: Product) => void;
}) {
  const related = products
    .filter(
      (item) =>
        item.id !== product.id &&
        item.category === product.category
    )
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
    `Hello Lydia's Essence! I'm interested in ${product.name} (${formatNaira(getEffectivePrice(product))}). Please share more details.`
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
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close product details"
        >
          <X />
        </button>

        <div className="modal-main">
          <div className="modal-image">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <div className="image-placeholder">
                <Sparkles size={36} />
              </div>
            )}
          </div>

          <div className="modal-details">
            <span className="eyebrow">{product.category}</span>

            <h2>{product.name}</h2>

            <p className="modal-price">
              {formatNaira(getEffectivePrice(product))}
            </p>

            <p className="modal-description">
              {product.description}
            </p>

            <div className="availability">
              <span
                className={`availability-dot ${
                  product.stock > 0 ? "" : "out"
                }`}
              />
              {product.stock > 0
                ? "Available to enquire"
                : "Currently unavailable"}
            </div>

            <a
              className={`button button-dark modal-cta ${
                product.stock <= 0 ? "button-disabled" : ""
              }`}
              href={product.stock > 0 ? enquiry : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                if (product.stock <= 0 || enquiry === "#") {
                  event.preventDefault();
                }
              }}
            >
              <MessageCircle size={17} />
              Enquire on WhatsApp
              <ArrowRight size={16} />
            </a>

            <p className="fine-print">
              Sample product information. Confirm availability
              and final pricing with our team.
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <div className="related-products">
            <span className="eyebrow">You may also love</span>

            <div className="related-grid">
              {related.map((item) => (
                <button
                  className="related-item"
                  key={item.id}
                  onClick={() => onSelect(item)}
                >
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

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(
    readCachedAnnouncement
  );

  useEffect(() => {
    let cancelled = false;

    fetchAnnouncement()
      .then((value) => {
        if (!cancelled && value) setAnnouncement(value);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load the collection."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" ||
        product.category === activeCategory;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    if (sort === "price-low") {
      result = [...result].sort(
        (a, b) =>
          getEffectivePrice(a) - getEffectivePrice(b)
      );
    }

    if (sort === "price-high") {
      result = [...result].sort(
        (a, b) =>
          getEffectivePrice(b) - getEffectivePrice(a)
      );
    }

    if (sort === "name") {
      result = [...result].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    return result;
  }, [products, activeCategory, search, sort]);

  const featuredProducts = products.slice(0, 4);

  return (
    <div className="site-shell">
      <div className="announcement-bar">
        <span>THE ART OF EVERYDAY INDULGENCE</span>
        <span className="announcement-divider">✳</span>
        <span>BEAUTY, WITH INTENTION.</span>
      </div>

      {announcement?.enabled && (
        <AnnouncementMarquee text={announcement.text} />
      )}

      <header className="site-header">
        <button
          className="icon-button mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>

        <a className="wordmark" href="#home">
          <span className="wordmark-name">Lydia’s Essence</span>
          <span className="wordmark-caption">
            BEAUTY · SCENT · SELF
          </span>
        </a>

        <nav className={`main-nav ${mobileMenuOpen ? "nav-open" : ""}`}>
          <a href="#collection" onClick={() => setMobileMenuOpen(false)}>
            Shop all
          </a>
          <a
            href="#collection"
            onClick={() => {
              setActiveCategory("Jewelries");
              setMobileMenuOpen(false);
            }}
          >
            Jewelries
          </a>
          <a
            href="#collection"
            onClick={() => {
              setActiveCategory("Perfumes");
              setMobileMenuOpen(false);
            }}
          >
            Fragrance
          </a>
          <a
            href="#collection"
            onClick={() => {
              setActiveCategory("Glasses");
              setMobileMenuOpen(false);
            }}
          >
            Eyewear
          </a>
        </nav>

        <a className="header-contact" href="#contact">
          <span>Get in touch</span>
          <ArrowDownRight size={17} />
        </a>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <motion.span
              className="eyebrow hero-eyebrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              YOUR DAILY DOSE OF BEAUTY
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              A little luxury.
              <br />
              <em>A lot of you.</em>
            </motion.h1>

            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Thoughtfully chosen skincare, captivating scents,
              beauty essentials and frames that feel like you.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <a className="button button-dark" href="#collection">
                Discover the collection
                <ArrowRight size={17} />
              </a>

              <a className="text-link" href="#story">
                Our philosophy <ArrowDownRight size={16} />
              </a>
            </motion.div>

            <div className="hero-note">
              <span className="hero-note-star">✳</span>
              <span>Feel good in your own essence.</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />

            <div className="hero-image">
              <img
                src="https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1200&q=90"
                alt="Elegant skincare and beauty products"
              />
            </div>

            <div className="hero-floating-note">
              <Sparkles size={16} />
              <span>Made for your moments</span>
            </div>

            <div className="hero-index">01 / YOUR ESSENCE</div>
          </div>

          <a className="hero-scroll" href="#collection">
            <span>SCROLL TO DISCOVER</span>
            <ArrowDown size={15} />
          </a>
        </section>

        <section className="trust-strip" aria-label="Our values">
          <div>
            <Sparkles size={18} />
            <span>Curated with care</span>
          </div>
          <span className="strip-separator">✳</span>
          <div>
            <Heart size={18} />
            <span>Everyday indulgence</span>
          </div>
          <span className="strip-separator">✳</span>
          <div>
            <Check size={18} />
            <span>Personalised enquiries</span>
          </div>
        </section>

        <section className="collection-section section-pad" id="collection">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE LYDIA’S EDIT</span>
              <h2>
                Find your <em>essence.</em>
              </h2>
              <p>
                Little things that make you feel a little more you.
              </p>
            </div>

            <span className="collection-count">
              {filteredProducts.length.toString().padStart(2, "0")} ITEMS
            </span>
          </div>

          <div className="collection-toolbar">
            <div className="category-tabs" aria-label="Product categories">
              {categories.map((category) => (
                <button
                  key={category}
                  className={
                    activeCategory === category ? "active" : ""
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="collection-controls">
              <label className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find something lovely..."
                  aria-label="Search products"
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>

              <label className="sort-control">
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort products"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <Sparkles className="loading-sparkle" size={28} />
              <p>Curating your collection...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>We’ll be right back.</h3>
              <p>{error}</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onOpen={setSelectedProduct}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={28} />
              <h3>Nothing here just yet.</h3>
              <p>Try another search or explore a different category.</p>
              <button
                className="button button-dark"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
              >
                See all products
              </button>
            </div>
          )}
        </section>

        <section className="feature-section" id="story">
          <div className="feature-image">
            <img
              src="https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=85"
              alt="Beauty products arranged in a warm, minimalist setting"
              loading="lazy"
            />
            <span className="feature-image-label">
              THE EVERYDAY RITUAL
            </span>
          </div>

          <div className="feature-copy">
            <span className="eyebrow">MORE THAN A ROUTINE</span>

            <h2>
              Your beauty.
              <br />
              <em>Your rules.</em>
            </h2>

            <p>
              We believe beauty is personal. It lives in the little
              rituals, the familiar scent, the perfect frame, and
              the moments you make entirely your own.
            </p>

            <p>
              Lydia’s Essence brings together considered beauty
              and everyday indulgence, so finding your favourites
              feels just as lovely as using them.
            </p>

            <a className="text-link" href="#collection">
              Explore the edit <ArrowRight size={16} />
            </a>

            <span className="feature-signature">
              Your essence, always.
            </span>
          </div>
        </section>

        <section className="featured-section section-pad">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A GOOD PLACE TO START</span>
              <h2>
                Your next <em>favourite.</em>
              </h2>
            </div>

            <a className="text-link" href="#collection">
              Shop everything <ArrowRight size={16} />
            </a>
          </div>

          <div className="product-grid featured-grid">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onOpen={setSelectedProduct}
              />
            ))}
          </div>
        </section>

        <section className="contact-banner" id="contact">
          <div className="contact-banner-decoration">✳</div>

          <span className="eyebrow">LET’S FIND YOUR FAVOURITE</span>

          <h2>
            A little help finding
            <br />
            <em>your essence?</em>
          </h2>

          <p>
            Tell us what you love. We’ll help you discover
            something that feels just right.
          </p>

          <a
            className="button button-light"
            href={whatsappLink(
              "Hello Lydia's Essence! I'd love some help finding my next favourite."
            )}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!whatsappNumber.replace(/\D/g, "")) {
                event.preventDefault();
              }
            }}
          >
            <MessageCircle size={17} />
            Chat with us on WhatsApp
            <ArrowRight size={16} />
          </a>

          {!whatsappNumber.replace(/\D/g, "") && (
            <span className="contact-note">
              WhatsApp enquiries will be available once your business
              number is configured.
            </span>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <a className="wordmark footer-wordmark" href="#home">
            <span className="wordmark-name">Lydia’s Essence</span>
            <span className="wordmark-caption">
              BEAUTY · SCENT · SELF
            </span>
          </a>

          <p>
            Thoughtful beauty for
            <br />
            your everyday moments.
          </p>

          <a href="#home" className="back-to-top">
            Back to the top <ArrowDown size={15} />
          </a>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Lydia’s Essence</span>
          <span>Made for your moments.</span>
          <span>Prices displayed in Nigerian naira (₦).</span>
        </div>
      </footer>

      <a
        className="floating-whatsapp"
        href={whatsappLink(
          "Hello Lydia's Essence! I'd like to make an enquiry."
        )}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact Lydia's Essence on WhatsApp"
        onClick={(event) => {
          if (!whatsappNumber.replace(/\D/g, "")) {
            event.preventDefault();
          }
        }}
      >
        <MessageCircle size={22} />
      </a>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            key={selectedProduct.id}
            product={selectedProduct}
            products={products}
            onClose={() => setSelectedProduct(null)}
            onSelect={setSelectedProduct}
          />
        )}
      </AnimatePresence>
    </div>
  );
}