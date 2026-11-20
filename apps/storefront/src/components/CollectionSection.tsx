import { useEffect, useState } from "react";
import { ChevronDown, Heart, MessageCircle, Search, Sparkles, X } from "lucide-react";
import { useFavourites } from "../context/FavouritesContext";
import { useSite } from "../context/SiteContext";
import { PAGE_SIZE, pageWindow } from "../lib/pagination";
import type { CategoryFilter, Product } from "../types/product";
import { formatNaira, getEffectivePrice } from "../types/product";
import { ProductCard } from "./ProductCard";
import { useWhatsappLink } from "./Whatsapp";

interface CollectionSectionProps {
  categories: readonly CategoryFilter[];
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  products: Product[];
  loading: boolean;
  error: string;
  onOpenProduct: (product: Product) => void;
  onReset: () => void;
}

/** The favourites list as a WhatsApp message (first 8 by name, then "and N more"). */
function favouritesMessage(list: Product[]): string {
  const lines = list.slice(0, 8).map((p) => `- ${p.name} (${formatNaira(getEffectivePrice(p))})`);
  const more = list.length > 8 ? `\n...and ${list.length - 8} more` : "";
  return `Hello Lydia's Essence! I'd love to know more about my favourites:\n${lines.join("\n")}${more}`;
}

export function CollectionSection({
  categories, activeCategory, onCategoryChange, search, onSearchChange,
  sort, onSortChange, products, loading, error, onOpenProduct, onReset,
}: CollectionSectionProps) {
  const { content } = useSite();
  const heading = content.collection;
  const { count: savedCount } = useFavourites();
  const whatsappLink = useWhatsappLink();

  // Show the collection a page at a time; a new filter, search or sort starts again from the first page.
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    setVisible(PAGE_SIZE);
    setAnnouncement("");
  }, [activeCategory, search, sort]);

  const page = pageWindow(products.length, visible);
  const showingSaved = activeCategory === "Saved";
  const savedLink = showingSaved && products.length > 0 ? whatsappLink(favouritesMessage(products)) : null;

  function loadMore() {
    setVisible(page.nextVisible);
    setAnnouncement(
      `${page.added} more products loaded. Showing ${Math.min(products.length, page.nextVisible)} of ${products.length}.`,
    );
  }

  return (
    <section className="collection-section section-pad" id="collection">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{heading.eyebrow}</span>
          <h2>{heading.headingLead} <em>{heading.headingEmphasis}</em></h2>
          <p>{heading.description}</p>
        </div>
        <span className="collection-count">
          {products.length.toString().padStart(2, "0")} ITEMS
        </span>
      </div>

      <div className="collection-toolbar">
        <div className="category-tabs" aria-label="Product categories">
          {categories.map((category) => (
            <button
              key={category}
              className={activeCategory === category ? "active" : ""}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
          <button
            className={`saved-tab ${showingSaved ? "active" : ""}`}
            aria-pressed={showingSaved}
            aria-label={`Saved favourites, ${savedCount}`}
            onClick={() => onCategoryChange("Saved")}
          >
            <Heart size={12} fill="currentColor" aria-hidden="true" />
            Saved
            <span className="saved-count" aria-hidden="true">{savedCount}</span>
          </button>
        </div>

        <div className="collection-controls">
          <label className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Find something lovely..."
              aria-label="Search products"
            />
            {search && (
              <button onClick={() => onSearchChange("")} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </label>

          <label className="sort-control">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value)}
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
      ) : showingSaved && savedCount === 0 ? (
        <div className="empty-state">
          <Heart size={28} strokeWidth={1} />
          <h3>No favourites yet.</h3>
          <p>Tap the heart on anything you love and it will wait for you here, even after you close this page.</p>
          <button className="button button-dark" onClick={onReset}>
            Browse the collection
          </button>
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="product-grid">
            {products.slice(0, page.shown).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onOpen={onOpenProduct}
              />
            ))}
          </div>

          {page.hasMore && (
            <div className="load-more">
              <p className="load-more-status">Showing {page.shown} of {page.total}</p>
              <button className="button button-dark" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}

          {savedLink && (
            <div className="saved-actions">
              <a className="button button-dark" href={savedLink} target="_blank" rel="noreferrer">
                <MessageCircle size={17} /> Ask about my favourites
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Sparkles size={28} />
          <h3>Nothing here just yet.</h3>
          <p>Try another search or explore a different category.</p>
          <button className="button button-dark" onClick={onReset}>
            See all products
          </button>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
  );
}
