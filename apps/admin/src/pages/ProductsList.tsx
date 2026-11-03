import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Images, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Product } from "@lydias-essence/types";
import { deleteProductAndMedia, duplicateProductFull, listAllProducts, toFriendlyError, updateProduct } from "@lydias-essence/supabase";
import { PRODUCT_CATEGORIES } from "@lydias-essence/types";
import { useConfirm, useToast } from "@lydias-essence/ui";
import { formatPrice, formatRelative, parseMoney, parseWholeNumber, resolvePricing, MAX_PRICE, MAX_STOCK } from "@lydias-essence/utils";
import { DiscountStatus, ErrorState, Loading, PageHead, ProductStatus, StockStatus, Thumb } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";

type SortKey = "name" | "price" | "stock" | "status" | "updated";

export function ProductsList() {
  const client = useClient();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useResource(() => listAllProducts(client), []);
  const [overrides, setOverrides] = useState<Record<string, Product>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const category = params.get("category") ?? "all";
  const stockF = params.get("stock") ?? "all";
  const discountF = params.get("discount") ?? "all";
  const featuredF = params.get("featured") ?? "all";
  const sort = (params.get("sort") as SortKey) || "updated";
  const dir = params.get("dir") === "asc" ? "asc" : "desc";

  const setParam = (key: string, value: string, def = "all") => {
    const next = new URLSearchParams(params);
    if (!value || value === def) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const products = useMemo(() => (data ?? []).filter((p) => !removed.has(p.id)).map((p) => overrides[p.id] ?? p), [data, overrides, removed]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (needle && !(p.name.toLowerCase().includes(needle) || p.slug.includes(needle) || p.category.toLowerCase().includes(needle))) return false;
      if (status === "published" && !p.published) return false;
      if (status === "draft" && p.published) return false;
      if (category !== "all" && p.category !== category) return false;
      if (stockF === "out" && p.stock > 0) return false;
      if (stockF === "low" && !(p.stock > 0 && p.stock <= p.low_stock_threshold)) return false;
      if (stockF === "in" && p.stock <= p.low_stock_threshold) return false;
      if (discountF === "on" && !resolvePricing(p).onSale) return false;
      if (featuredF === "yes" && !p.is_featured) return false;
      return true;
    });
    const sign = dir === "asc" ? 1 : -1;
    const cmp: Record<SortKey, (a: Product, b: Product) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => resolvePricing(a).current - resolvePricing(b).current,
      stock: (a, b) => a.stock - b.stock,
      status: (a, b) => Number(a.published) - Number(b.published),
      updated: (a, b) => a.updated_at.localeCompare(b.updated_at)
    };
    return [...list].sort((a, b) => sign * cmp[sort](a, b) || a.name.localeCompare(b.name));
  }, [products, q, status, category, stockF, discountF, featuredF, sort, dir]);

  const filtersActive = q || status !== "all" || category !== "all" || stockF !== "all" || discountF !== "all" || featuredF !== "all";

  function toggleSort(key: SortKey) {
    const next = new URLSearchParams(params);
    if (sort === key) next.set("dir", dir === "asc" ? "desc" : "asc");
    else {
      next.set("sort", key);
      next.set("dir", key === "updated" ? "desc" : "asc");
    }
    setParams(next, { replace: true });
  }

  const withBusy = async <T,>(id: string, fn: () => Promise<T>): Promise<T> => {
    setBusy((s) => new Set(s).add(id));
    try {
      return await fn();
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const applyUpdate = (p: Product) => setOverrides((o) => ({ ...o, [p.id]: p }));

  async function quickPatch(p: Product, patch: Partial<Product>, message: string): Promise<boolean> {
    try {
      const saved = await withBusy(p.id, () => updateProduct(client, p.id, patch));
      applyUpdate(saved);
      toast.success(message);
      return true;
    } catch (err) {
      toast.error(toFriendlyError(err).message);
      return false;
    }
  }

  const savePrice = async (p: Product, text: string) => {
    const v = parseMoney(text);
    if (v === null || Number.isNaN(v) || v <= 0 || v > MAX_PRICE) {
      toast.error("Enter a valid price, more than zero (e.g. 18500).");
      return false;
    }
    if (p.discount_enabled && p.sale_price !== null && p.sale_price >= v) {
      toast.error("That price is not higher than the current sale price. Lower or turn off the discount first.");
      return false;
    }
    return quickPatch(p, { price: v }, "Product updated successfully.");
  };

  const saveStock = async (p: Product, text: string) => {
    const v = parseWholeNumber(text);
    if (v === null || Number.isNaN(v) || v < 0 || v > MAX_STOCK) {
      toast.error("Stock must be a whole number, 0 or more.");
      return false;
    }
    return quickPatch(p, { stock: v }, "Stock updated successfully.");
  };

  function togglePublish(p: Product) {
    if (!p.published && !p.image_url) {
      toast.error(`“${p.name}” needs at least one image before it can be published.`);
      return;
    }
    return confirm({
      title: p.published ? `Unpublish “${p.name}”?` : `Publish “${p.name}”?`,
      message: p.published
        ? "It will disappear from the shop straight away (and from any featured section). You can publish it again any time."
        : "It will appear on the shop straight away.",
      confirmLabel: p.published ? "Unpublish" : "Publish",
      run: async () => {
        const saved = await withBusy(p.id, () => updateProduct(client, p.id, { published: !p.published }));
        applyUpdate(saved);
      },
      successMessage: p.published ? "Product moved to drafts." : "Changes published."
    });
  }

  async function duplicate(p: Product) {
    try {
      const copy = await withBusy(p.id, () => duplicateProductFull(client, p));
      toast.success("Product duplicated. The copy is saved as a draft.");
      navigate(`/products/${copy.id}`);
    } catch (err) {
      toast.error(toFriendlyError(err, "The product couldn’t be duplicated.").message);
    }
  }

  function remove(p: Product) {
    return confirm({
      title: `Delete “${p.name}”?`,
      message: "This permanently removes the product and its images. It can’t be undone. If you only want to hide it, unpublish it instead.",
      confirmLabel: "Delete product",
      tone: "danger",
      run: async () => {
        await withBusy(p.id, () => deleteProductAndMedia(client, p.id));
        setRemoved((s) => new Set(s).add(p.id));
      },
      successMessage: "Product deleted."
    });
  }

  const SortHead = ({ k, children }: { k: SortKey; children: string }) => (
    <th aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"} scope="col">
      <button type="button" onClick={() => toggleSort(k)}>
        {children}
        {sort === k && (dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
      </button>
    </th>
  );

  return (
    <>
      <PageHead
        title="Your"
        emphasis="products"
        subtitle="Add, edit and organise everything in your shop. Prices and stock can be changed right here in the list."
        actions={<><Link className="btn" to="/products/bulk"><Images size={16} /> Add many</Link><Link className="btn btn-primary" to="/products/new"><Plus size={16} /> Add a product</Link></>}
      />

      {loading && !data ? (
        <Loading label="Loading products…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="toolbar" role="search">
            <div className="search">
              <Search size={16} aria-hidden="true" />
              <input className="input" type="search" placeholder="Search by name or category" aria-label="Search products" value={q} onChange={(e) => setParam("q", e.target.value, "")} />
            </div>
            <select className="select" aria-label="Filter by status" value={status} onChange={(e) => setParam("status", e.target.value)}>
              <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option>
            </select>
            <select className="select" aria-label="Filter by category" value={category} onChange={(e) => setParam("category", e.target.value)}>
              <option value="all">All categories</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select" aria-label="Filter by stock" value={stockF} onChange={(e) => setParam("stock", e.target.value)}>
              <option value="all">Any stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
            </select>
            <select className="select" aria-label="Filter by discount" value={discountF} onChange={(e) => setParam("discount", e.target.value)}>
              <option value="all">Any pricing</option><option value="on">On sale now</option>
            </select>
            {filtersActive && (
              <button type="button" className="btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</button>
            )}
          </div>
          <p className="help" style={{ marginBottom: 12 }} role="status">
            Showing {rows.length} of {products.length} product{products.length === 1 ? "" : "s"}
          </p>

          {products.length === 0 ? (
            <div className="empty">
              <Package size={28} aria-hidden="true" style={{ color: "var(--sage)" }} />
              <h3>Your shop is empty</h3>
              <p>Add your first product to start building your catalogue. Nothing appears on the shop until you publish it.</p>
              <div className="head-actions" style={{ justifyContent: "center" }}><Link className="btn btn-primary" to="/products/new"><Plus size={16} /> Add your first product</Link><Link className="btn" to="/products/bulk"><Images size={16} /> Add many at once</Link></div>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <h3>No products match</h3>
              <p>Try a different search or clear the filters.</p>
              <button className="btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <SortHead k="name">Product</SortHead>
                    <SortHead k="price">Price</SortHead>
                    <SortHead k="stock">Stock</SortHead>
                    <SortHead k="status">Status</SortHead>
                    <SortHead k="updated">Updated</SortHead>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const pr = resolvePricing(p);
                    const isBusy = busy.has(p.id);
                    return (
                      <tr key={p.id} aria-busy={isBusy}>
                        <td className="cell-product">
                          <div className="product-cell">
                            <Thumb product={p} />
                            <div>
                              <Link className="name" to={`/products/${p.id}`}>{p.name}</Link>
                              <div className="sub">{p.category}{p.is_featured ? " · Featured" : ""}</div>
                              <DiscountStatus product={p} />
                            </div>
                          </div>
                        </td>
                        <td data-label="Price">
                          <InlineNumber label={`Price for ${p.name}`} value={String(p.price)} disabled={isBusy} prefix="₦" onCommit={(t) => savePrice(p, t)} />
                          {pr.onSale && <span className="price-now" title="Price shoppers pay now">now {formatPrice(pr.current)}</span>}
                        </td>
                        <td data-label="Stock">
                          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                            <InlineNumber label={`Stock for ${p.name}`} value={String(p.stock)} narrow disabled={isBusy} onCommit={(t) => saveStock(p, t)} />
                            <StockStatus stock={p.stock} threshold={p.low_stock_threshold} />
                          </div>
                        </td>
                        <td data-label="Status"><ProductStatus product={p} /></td>
                        <td data-label="Updated"><span className="help">{formatRelative(p.updated_at)}</span></td>
                        <td className="cell-actions">
                          <div className="row-actions">
                            <Link className="btn btn-small" to={`/products/${p.id}`}><Pencil size={14} /> Edit</Link>
                            <button className="btn btn-small" disabled={isBusy} onClick={() => void togglePublish(p)}>
                              {p.published ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}
                            </button>
                            <button className="btn btn-small btn-icon" disabled={isBusy} onClick={() => void duplicate(p)} aria-label={`Duplicate ${p.name}`} title="Duplicate"><Copy size={14} /></button>
                            <button className="btn btn-small btn-icon btn-danger" disabled={isBusy} onClick={() => void remove(p)} aria-label={`Delete ${p.name}`} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Edit-in-place number: saves on Enter or when you click away; Esc cancels. */
function InlineNumber({ value, label, onCommit, disabled, prefix, narrow }: { value: string; label: string; onCommit: (text: string) => Promise<boolean>; disabled?: boolean; prefix?: string; narrow?: boolean }) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const last = useRef(value);
  const cancelled = useRef(false);
  if (last.current !== value && !saving) {
    last.current = value;
    if (text !== value) setText(value);
  }

  async function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (saving || text.trim() === value) return;
    setSaving(true);
    const ok = await onCommit(text);
    setSaving(false);
    if (!ok) setText(value);
  }

  return (
    <span className="inline-edit">
      {prefix && <span aria-hidden="true" className="help">{prefix}</span>}
      <input
        className={`input ${narrow ? "narrow" : ""}`}
        inputMode="decimal"
        aria-label={label}
        value={text}
        disabled={disabled || saving}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            setText(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </span>
  );
}
