import { ArrowDownRight, Menu, X } from "lucide-react";
import { useSite } from "../context/SiteContext";
import type { CategoryFilter, ProductCategory } from "../types/product";
import { WordmarkName } from "./WordmarkName";

type Category = "All" | ProductCategory;

interface HeaderProps {
  categories: readonly ProductCategory[];
  activeCategory: CategoryFilter;
  onCategoryChange: (category: Category) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
}

export function Header({
  categories,
  activeCategory,
  onCategoryChange,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: HeaderProps) {
  const { logoUrl, storeName } = useSite();

  return (
    <header className="site-header">
      <button
        className="icon-button mobile-menu-toggle"
        onClick={onToggleMobileMenu}
        aria-label="Toggle navigation"
      >
        {mobileMenuOpen ? <X /> : <Menu />}
      </button>

      <a className="wordmark" href="#home">
        <WordmarkName logoUrl={logoUrl} name={storeName} />
        <span className="wordmark-caption">BEAUTY · SCENT · SELF</span>
      </a>

      <nav className={`main-nav ${mobileMenuOpen ? "nav-open" : ""}`}>
        <a href="#collection" onClick={onCloseMobileMenu}>Shop all</a>
        {categories.map((category) => (
          <a
            key={category}
            href="#collection"
            aria-current={activeCategory === category ? "page" : undefined}
            onClick={() => {
              onCategoryChange(category);
              onCloseMobileMenu();
            }}
          >
            {category}
          </a>
        ))}
      </nav>

      <a className="header-contact" href="#contact">
        <span>Get in touch</span>
        <ArrowDownRight size={17} />
      </a>
    </header>
  );
}
