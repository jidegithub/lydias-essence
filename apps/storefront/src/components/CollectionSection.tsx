import { ChevronDown, Search, Sparkles, X } from "lucide-react";
import type { Product, ProductCategory } from "../types/product";
import { ProductCard } from "./ProductCard";

type Category = "All" | ProductCategory;

interface CollectionSectionProps {
  categories: readonly Category[];
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
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

export function CollectionSection({
  categories, activeCategory, onCategoryChange, search, onSearchChange,
  sort, onSortChange, products, loading, error, onOpenProduct, onReset,
}: CollectionSectionProps) {
  return (
    <section className="collection-section section-pad" id="collection">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE LYDIA’S EDIT</span>
          <h2>Find your <em>essence.</em></h2>
          <p>Little things that make you feel a little more you.</p>
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
      ) : products.length > 0 ? (
        <div className="product-grid">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onOpen={onOpenProduct}
            />
          ))}
        </div>
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
    </section>
  );
}
