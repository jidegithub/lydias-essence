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
import { applyDailyShuffle, shuffleDayKey } from "@lydias-essence/utils";
import { ContactBanner } from "./components/ContactBanner";
import { Footer } from "./components/Footer";
import { FloatingWhatsapp } from "./components/FloatingWhatsapp";
import { ProductModal } from "./components/ProductModal";
import { FavouritesProvider, useFavourites } from "./context/FavouritesContext";
import { SiteProvider, useSite } from "./context/SiteContext";
import { useStorefront } from "./hooks/useStorefront";
import type { CategoryFilter, Product } from "./types/product";
import { getEffectivePrice } from "./types/product";

const categories: readonly CategoryFilter[] = ["All", ...PRODUCT_CATEGORIES];

interface ShopProps {
  products: Product[];
  favourites: Product[];
  beautyPicks: Product[];
  loading: boolean;
  error: string;
}

export default function App() {
  const { settings, ready, ...shop } = useStorefront();

  return (
    <SiteProvider settings={settings} ready={ready}>
      <FavouritesProvider>
        <Shop {...shop} />
      </FavouritesProvider>
    </SiteProvider>
  );
}

function Shop({ products, favourites, beautyPicks, loading, error }: ShopProps) {
  const { settings, content, ready } = useSite();
  const { idSet, prune } = useFavourites();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const announcementText = settings.announcement_text.trim();

  const shuffleConfig = useMemo(
    () => ({
      enabled: settings.shuffle_enabled,
      categories: settings.shuffle_categories,
      skipSoldOut: settings.shuffle_skip_sold_out,
      pinnedIds: settings.shuffle_pinned_ids,
      seed: settings.shuffle_seed,
    }),
    [settings.shuffle_enabled, settings.shuffle_categories, settings.shuffle_skip_sold_out, settings.shuffle_pinned_ids, settings.shuffle_seed],
  );

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory =
        activeCategory === "Saved"
          ? idSet.has(product.id)
          : activeCategory === "All" || product.category === activeCategory;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    if (sort === "featured") {
      // Products marked "Feature this product" in the admin come first (order is otherwise kept).
      result = [...result].sort(
        (a, b) => Number(b.is_featured) - Number(a.is_featured),
      );
      // Daily shuffle (admin): pinned first, then a stable daily order. Off by default.
      result = applyDailyShuffle(result, shuffleConfig, shuffleDayKey());
    }

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
  }, [products, activeCategory, search, sort, idSet]);

  // Forget favourites for products that are no longer in the shop.
  useEffect(() => {
    if (!loading && !error && products.length > 0) {
      prune(new Set(products.map((product) => product.id)));
    }
  }, [loading, error, products, prune]);

  return (
    <div className={`site-shell ${ready ? "" : "settings-pending"}`}>
      <div className="announcement-bar">
        <span>{content.topBanner.leftText}</span>
        <span className="announcement-divider">✳</span>
        <span>{content.topBanner.rightText}</span>
      </div>

      {settings.announcement_enabled && announcementText && (
        <AnnouncementMarquee text={announcementText} />
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

        <FeatureSection picks={beautyPicks} onOpenProduct={setSelectedProduct} />

        {favourites.length > 0 && (
          <FeaturedSection products={favourites} onOpenProduct={setSelectedProduct} />
        )}

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
