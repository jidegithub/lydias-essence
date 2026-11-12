import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PRODUCT_CATEGORIES } from "@lydias-essence/types";

import { AnnouncementMarquee } from "./components/AnnouncementMarquee";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { TrustStrip } from "./components/TrustStrip";
import { CollectionSection } from "./components/CollectionSection";
import { FeatureSection } from "./components/FeatureSection";
import { FeaturedSection } from "./components/FeaturedSection";
import { ContactBanner } from "./components/ContactBanner";
import { Footer } from "./components/Footer";
import { FloatingWhatsapp } from "./components/FloatingWhatsapp";
import { ProductModal } from "./components/ProductModal";

import {
  fetchAnnouncement,
  readCachedAnnouncement,
  type Announcement,
} from "./lib/announcement";
import { getProducts } from "./lib/products";
import type { Product } from "./types/product";
import { getEffectivePrice } from "./types/product";

const categories = ["All", ...PRODUCT_CATEGORIES] as const;
type CategoryFilter = (typeof categories)[number];

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(
    readCachedAnnouncement,
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
              : "We couldn't load the collection.",
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
        activeCategory === "All" || product.category === activeCategory;
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
        (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
      );
    }

    if (sort === "price-high") {
      result = [...result].sort(
        (a, b) => getEffectivePrice(b) - getEffectivePrice(a),
      );
    }

    if (sort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, activeCategory, search, sort]);

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

      <Header
        categories={PRODUCT_CATEGORIES}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      <main>
        <Hero />
        <TrustStrip />

        <CollectionSection
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          products={filteredProducts}
          loading={loading}
          error={error}
          onOpenProduct={setSelectedProduct}
          onReset={() => {
            setSearch("");
            setActiveCategory("All");
          }}
        />

        <FeatureSection />

        <FeaturedSection
          products={products.slice(0, 4)}
          onOpenProduct={setSelectedProduct}
        />

        <ContactBanner />
      </main>

      <Footer />
      <FloatingWhatsapp />

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
