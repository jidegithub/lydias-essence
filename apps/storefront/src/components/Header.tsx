import { useState } from "react";
import { ArrowDownRight, Menu, X } from "lucide-react";
import type { ProductCategory } from "../types/product";

type Category = "All" | ProductCategory;

interface HeaderProps {
  categories: readonly ProductCategory[];
  activeCategory: Category;
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
        <span className="wordmark-name">Lydia’s Essence</span>
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
