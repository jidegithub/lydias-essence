import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Product } from "@lydias-essence/types";
import { formatPrice, resolvePricing } from "@lydias-essence/utils";
import { Thumb } from "./ui";

export interface PickerProps {
  title: string;
  products: Product[];
  /** Products that cannot be picked, with the reason shown to the owner. */
  disabled: (p: Product) => string | null;
  onPick: (p: Product) => void;
  onClose: () => void;
}

/** Searchable product selector with thumbnails, in an accessible modal dialog. */
export function ProductPicker({ title, products, disabled, onPick, onClose }: PickerProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    return () => prev?.focus?.();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
    if (e.key === "Tab" && panelRef.current) {
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input"));
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="picker-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKeyDown}>
      <div className="picker" role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <div className="picker-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="picker-search">
          <div className="search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              className="input"
              type="search"
              placeholder="Search by name or category"
              aria-label="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {results.length === 0 ? (
          <p style={{ padding: "0 20px 24px", color: "var(--muted-strong)", fontSize: 14 }}>No products match “{query}”.</p>
        ) : (
          <ul className="picker-list">
            {results.map((p) => {
              const reason = disabled(p);
              const price = resolvePricing(p);
              return (
                <li key={p.id}>
                  <button type="button" disabled={!!reason} onClick={() => onPick(p)}>
                    <Thumb product={p} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="name" style={{ display: "block" }}>{p.name}</span>
                      <span className="meta" style={{ display: "block" }}>
                        {p.category} · {formatPrice(price.current)}
                        {reason ? ` · ${reason}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
