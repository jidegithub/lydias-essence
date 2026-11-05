import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ImagePlus, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@lydias-essence/types";
import {
  PRODUCT_BUCKET,
  deleteProductRow,
  fetchSettings,
  insertMediaRow,
  insertProduct,
  listAllProducts,
  newObjectPath,
  toFriendlyError,
  uploadFile
} from "@lydias-essence/supabase";
import { useToast } from "@lydias-essence/ui";
import {
  parseMoney,
  parseWholeNumber,
  slugify,
  validateImageFile,
  validateProductForm,
  type ProductFormErrors
} from "@lydias-essence/utils";
import { ErrorState, Loading, PageHead } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

const MAX_ROWS = 30;
type ColKey = "name" | "category" | "price" | "stock";
const COLS: ColKey[] = ["name", "category", "price", "stock"];

interface Row {
  key: string;
  file: File;
  previewUrl: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  status: "idle" | "saving" | "done" | "failed";
  error?: string;
  productId?: string;
}

/** "serum-final_2.JPG" -> "Serum final 2" (a starting point the owner can edit). */
function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return base.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function BulkAdd() {
  const client = useClient();
  const { data, error, loading, reload } = useResource(async () => {
    const [products, settings] = await Promise.all([listAllProducts(client), fetchSettings(client)]);
    return { slugs: new Set(products.map((p) => p.slug)), threshold: settings.low_stock_threshold };
  }, []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Grid existingSlugs={data.slugs} threshold={data.threshold} />;
}

function Grid({ existingSlugs, threshold }: { existingSlugs: Set<string>; threshold: number }) {
  const client = useClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const pending = rows.filter((r) => r.status !== "done");
  const created = rows.filter((r) => r.status === "done");
  const dirty = pending.length > 0;
  const { bypass } = useUnsavedGuard(dirty);

  const rowErrors = useMemo(() => {
    const map = new Map<string, ProductFormErrors>();
    for (const r of rows) {
      if (r.status === "done") continue;
      const e = validateProductForm({
        name: r.name,
        slug: slugify(r.name || "x"),
        description: "",
        category: r.category,
        price: r.price,
        salePrice: "",
        discountEnabled: false,
        discountStart: "",
        discountEnd: "",
        stock: r.stock,
        lowStockThreshold: String(threshold),
        sortOrder: "0"
      });
      delete e.slug; // generated automatically
      if (Object.keys(e).length) map.set(r.key, e);
    }
    return map;
  }, [rows, threshold]);

  const update = (key: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const problems: string[] = [];
    const known = new Set(rows.map((r) => `${r.file.name}|${r.file.size}|${r.file.lastModified}`));
    const fresh: Row[] = [];
    let skippedDupes = 0;
    for (const file of incoming) {
      const problem = validateImageFile(file);
      if (problem) {
        problems.push(problem);
        continue;
      }
      const sig = `${file.name}|${file.size}|${file.lastModified}`;
      if (known.has(sig)) {
        skippedDupes++;
        continue;
      }
      known.add(sig);
      fresh.push({ key: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), name: nameFromFile(file.name), category: "", price: "", stock: "0", status: "idle" });
    }
    const room = MAX_ROWS - rows.length;
    if (fresh.length > room) {
      problems.push(`You can add up to ${MAX_ROWS} products at a time — ${fresh.length - Math.max(room, 0)} photo${fresh.length - room === 1 ? " wasn’t" : "s weren’t"} added. Create this batch, then add more.`);
      fresh.slice(Math.max(room, 0)).forEach((r) => URL.revokeObjectURL(r.previewUrl));
    }
    if (problems.length) toast.error(problems.slice(0, 3).join(" "));
    if (skippedDupes) toast.info(`${skippedDupes} photo${skippedDupes === 1 ? " was" : "s were"} already in the list and skipped.`);
    if (fresh.length) setRows((list) => [...list, ...fresh.slice(0, Math.max(room, 0))]);
  }

  function removeRow(row: Row) {
    URL.revokeObjectURL(row.previewUrl);
    setRows((list) => list.filter((r) => r.key !== row.key));
  }

  function setAll(col: "category" | "stock" | "price", value: string, onlyEmpty = false) {
    setRows((list) => list.map((r) => (r.status === "done" || (onlyEmpty && r[col].trim()) ? r : { ...r, [col]: value })));
  }

  /** Paste several lines (copied from Excel/Sheets) and they spread down the rows and across the columns. */
  function onPaste(e: React.ClipboardEvent, rowIndex: number, col: ColKey) {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text.replace(/\n+$/, ""))) return; // single value: normal paste
    e.preventDefault();
    const lines = text.replace(/\r/g, "").replace(/\n+$/, "").split("\n");
    const startCol = COLS.indexOf(col);
    const editable = rows.map((r, i) => ({ r, i })).filter((x) => x.i >= rowIndex && x.r.status !== "done");
    let ignored = 0;
    let badCategory = 0;
    const patches = new Map<string, Partial<Row>>();
    lines.forEach((line, li) => {
      const target = editable[li];
      if (!target) return void (ignored += 1);
      line.split("\t").forEach((cell, ci) => {
        const c = COLS[startCol + ci];
        if (!c) return;
        const value = cell.trim();
        if (c === "category") {
          const match = PRODUCT_CATEGORIES.find((x) => x.toLowerCase() === value.toLowerCase());
          if (match) patches.set(target.r.key, { ...patches.get(target.r.key), category: match });
          else if (value) badCategory++;
        } else patches.set(target.r.key, { ...patches.get(target.r.key), [c]: value });
      });
    });
    setRows((list) => list.map((r) => (patches.has(r.key) ? { ...r, ...patches.get(r.key) } : r)));
    toast.info(`Pasted into ${patches.size} row${patches.size === 1 ? "" : "s"}.`);
    if (ignored) toast.error(`${ignored} extra line${ignored === 1 ? " was" : "s were"} ignored — there aren’t enough photos for them. Add more photos first.`);
    if (badCategory) toast.error(`${badCategory} category value${badCategory === 1 ? "" : "s"} didn’t match (use ${PRODUCT_CATEGORIES.join(", ")}).`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, col: ColKey) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = document.querySelector<HTMLElement>(`[data-cell="${rowIndex + 1}-${col}"]`);
    next?.focus();
    (next as HTMLInputElement | null)?.select?.();
  }

  async function createOne(row: Row, slug: string): Promise<string> {
    const id = crypto.randomUUID();
    let useSlug = slug;
    for (let attempt = 0; ; attempt++) {
      try {
        await insertProduct(client, id, {
          name: row.name.trim(),
          slug: useSlug,
          description: "",
          category: row.category as ProductCategory,
          price: parseMoney(row.price) as number,
          sale_price: null,
          discount_enabled: false,
          discount_starts_at: null,
          discount_ends_at: null,
          stock: parseWholeNumber(row.stock) as number,
          low_stock_threshold: threshold,
          published: false,
          background_theme: "default",
          is_featured: false,
          recommendation_eligible: true,
          sort_order: 0
        });
        break;
      } catch (err) {
        const e = toFriendlyError(err);
        if (e.kind !== "conflict" || attempt >= 3) throw e;
        useSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }
    let path: string | null = null;
    try {
      const up = await uploadFile(client, PRODUCT_BUCKET, newObjectPath(id, row.file), row.file);
      path = up.path;
      await insertMediaRow(client, {
        product_id: id,
        kind: "image",
        storage_path: up.path,
        public_url: up.publicUrl,
        sort_order: 0,
        is_primary: true,
        mime_type: row.file.type,
        size_bytes: row.file.size,
        alt_text: ""
      });
    } catch (err) {
      // A product without its photo is useless, so undo it completely and let the owner retry this row.
      if (path) await client.storage.from(PRODUCT_BUCKET).remove([path]).catch(() => undefined);
      await deleteProductRow(client, id).catch(() => undefined);
      throw err;
    }
    return id;
  }

  async function createAll() {
    if (savingRef.current) return;
    setShowErrors(true);
    const todo = rows.filter((r) => r.status !== "done");
    if (todo.length === 0) return;
    const bad = todo.filter((r) => rowErrors.has(r.key));
    if (bad.length) {
      toast.error(`${bad.length} product${bad.length === 1 ? " needs" : "s need"} attention before they can be created — marked in red.`);
      document.querySelector<HTMLElement>(`[data-row-key="${bad[0]!.key}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setProgress({ done: 0, total: todo.length });
    const taken = new Set(existingSlugs);
    let ok = 0;
    let failed = 0;
    let stopped = false;

    for (const [i, row] of todo.entries()) {
      let slug = slugify(row.name);
      for (let n = 2; taken.has(slug); n++) slug = `${slugify(row.name)}-${n}`;
      taken.add(slug);
      update(row.key, { status: "saving", error: undefined });
      try {
        const productId = await createOne(row, slug);
        update(row.key, { status: "done", productId });
        existingSlugs.add(slug);
        ok++;
      } catch (err) {
        const e = toFriendlyError(err, "This product couldn’t be created.");
        update(row.key, { status: "failed", error: e.message });
        failed++;
        taken.delete(slug);
        if (e.kind === "auth" || e.kind === "permission" || e.kind === "network") {
          stopped = true;
          for (const rest of todo.slice(i + 1)) update(rest.key, { status: "idle" });
          toast.error(e.message);
          break;
        }
      }
      setProgress({ done: i + 1, total: todo.length });
    }

    savingRef.current = false;
    setSaving(false);

    if (failed === 0 && !stopped) {
      toast.success(`${ok} product${ok === 1 ? "" : "s"} created as drafts.`);
      bypass();
      navigate("/products?status=draft", { replace: true });
    } else {
      if (ok) toast.success(`${ok} product${ok === 1 ? "" : "s"} created as drafts.`);
      if (!stopped) toast.error(`${failed} couldn’t be created. They’re still in the list with the reason — fix and try again.`);
    }
  }

  const needAttention = pending.filter((r) => rowErrors.has(r.key)).length;
  const noStock = pending.filter((r) => parseWholeNumber(r.stock) === 0).length;

  return (
    <>
      <Link to="/products" className="btn btn-small" style={{ marginBottom: 18 }}>
        ← All products
      </Link>
      <PageHead
        title="Add many"
        emphasis="products"
        subtitle="Drop in all your product photos at once. Each photo becomes a row — fill in the name, category and price, then create them all as drafts. Nothing goes live until you publish."
      />

      <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
      <button
        type="button"
        className={`dropzone ${over ? "over" : ""}`}
        style={{ width: "100%", marginBottom: 20 }}
        disabled={saving || rows.length >= MAX_ROWS}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { setOver(false); if (e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } }}
      >
        <ImagePlus size={24} aria-hidden="true" />
        <strong>{rows.length ? "Add more photos" : "Choose your product photos"}</strong>
        <span>Click to choose, or drop them here · one photo per product · up to {MAX_ROWS} at a time · JPG, PNG, WebP or AVIF, 5 MB each · best done on a computer</span>
      </button>

      {rows.length === 0 ? (
        <div className="empty">
          <h3>No photos yet</h3>
          <p>Choose the photos for the products you’re adding. You can add more photos later and extra details like descriptions and sale prices after the products are created.</p>
        </div>
      ) : (
        <>
          <section className="card tinted" aria-label="Fill in all rows at once">
            <div className="bulk-tools">
              <strong>Save time:</strong>
              <label className="sr-only" htmlFor="all-category">Set category for every product</label>
              <select id="all-category" className="select" defaultValue="" disabled={saving} onChange={(e) => { if (e.target.value) setAll("category", e.target.value); e.target.value = ""; }}>
                <option value="">Set category for all…</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <BulkValue label="Set price for all empty" placeholder="Price" disabled={saving} onApply={(v) => setAll("price", v, true)} />
              <BulkValue label="Set stock for all" placeholder="Stock" disabled={saving} onApply={(v) => setAll("stock", v)} />
            </div>
            <p className="help" style={{ marginTop: 10 }}>
              Tip: press <kbd>Enter</kbd> to move down a column. You can also copy cells from Excel or Google Sheets and paste them into a Name, Price or Stock box — they’ll spread down the rows in order (Name, Category, Price, Stock).
            </p>
          </section>

          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="data bulk">
              <thead>
                <tr>
                  <th scope="col">Photo</th>
                  <th scope="col">Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price (₦)</th>
                  <th scope="col">Stock <span className="help" style={{ textTransform: "none", letterSpacing: 0 }}>(0 = sold out)</span></th>
                  <th scope="col"><span className="sr-only">Status</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const errs = showErrors && r.status !== "done" ? rowErrors.get(r.key) : undefined;
                  const locked = r.status === "done" || r.status === "saving" || saving;
                  const cell = (col: ColKey, label: string, inputMode?: "decimal" | "numeric") => (
                    <td data-label={label}>
                      <input
                        className="input"
                        data-cell={`${i}-${col}`}
                        aria-label={`${label} for photo ${i + 1} (${r.file.name})`}
                        aria-invalid={errs?.[col] ? true : undefined}
                        inputMode={inputMode}
                        value={r[col]}
                        disabled={locked}
                        onChange={(e) => update(r.key, { [col]: e.target.value })}
                        onPaste={(e) => onPaste(e, i, col)}
                        onKeyDown={(e) => onKeyDown(e, i, col)}
                      />
                      {errs?.[col] && <div className="error-text" role="alert">{errs[col]}</div>}
                    </td>
                  );
                  return (
                    <tr key={r.key} data-row-key={r.key} className={`${errs ? "row-bad" : ""} ${r.status === "done" ? "row-done" : ""}`}>
                      <td className="cell-product">
                        <div className="product-cell">
                          <span className="thumb"><img src={r.previewUrl} alt="" /></span>
                          <span className="sub bulk-file">{r.file.name}</span>
                        </div>
                      </td>
                      {cell("name", "Name")}
                      <td data-label="Category">
                        <select
                          className="select"
                          aria-label={`Category for photo ${i + 1} (${r.file.name})`}
                          aria-invalid={errs?.category ? true : undefined}
                          value={r.category}
                          disabled={locked}
                          onChange={(e) => update(r.key, { category: e.target.value })}
                        >
                          <option value="">Choose…</option>
                          {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        {errs?.category && <div className="error-text" role="alert">{errs.category}</div>}
                      </td>
                      {cell("price", "Price", "decimal")}
                      {cell("stock", "Stock", "numeric")}
                      <td className="cell-actions">
                        {r.status === "saving" && <span className="pill"><Loader2 size={12} className="spin" /> Creating…</span>}
                        {r.status === "done" && (
                          <span className="row-actions">
                            <span className="pill ok"><CheckCircle2 size={12} /> Created</span>
                            <Link className="btn btn-small" to={`/products/${r.productId}`}>Edit</Link>
                          </span>
                        )}
                        {r.status === "failed" && (
                          <span style={{ display: "grid", gap: 6 }}>
                            <span className="pill bad"><TriangleAlert size={12} /> Not created</span>
                            <span className="error-text">{r.error}</span>
                          </span>
                        )}
                        {(r.status === "idle" || r.status === "failed") && (
                          <button className="btn btn-small btn-icon btn-danger" disabled={saving} onClick={() => removeRow(r)} aria-label={`Remove photo ${r.file.name}`} title="Remove"><Trash2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showErrors && needAttention > 0 && (
            <div className="notice bad" role="alert" style={{ marginTop: 16 }}>
              <TriangleAlert size={18} aria-hidden="true" />
              <div>{needAttention} product{needAttention === 1 ? " needs" : "s need"} attention — the problem is shown under each marked box.</div>
            </div>
          )}
          {noStock > 0 && pending.length > 0 && !saving && (
            <p className="help" style={{ marginTop: 12 }}>
              {noStock} product{noStock === 1 ? " has" : "s have"} stock set to 0, so would show as sold out once published. Use “Set stock for all” if that’s not what you want.
            </p>
          )}
        </>
      )}

      <div className="savebar" role="region" aria-label="Create products">
        <span className={`status ${dirty ? "dirty" : ""}`} role="status">
          {saving
            ? `Creating ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
            : pending.length
              ? `${pending.length} product${pending.length === 1 ? "" : "s"} ready to create${created.length ? ` · ${created.length} already created` : ""}`
              : created.length
                ? `${created.length} created`
                : "Add photos to begin"}
        </span>
        <div className="head-actions">
          {created.length > 0 && !saving && (
            <Link className="btn" to="/products?status=draft">View drafts</Link>
          )}
          <button className="btn btn-primary" onClick={() => void createAll()} disabled={saving || pending.length === 0}>
            {saving ? <Loader2 size={15} className="spin" /> : null}
            {saving ? "Creating…" : `Create ${pending.length || ""} draft product${pending.length === 1 ? "" : "s"}`.replace("  ", " ")}
          </button>
        </div>
      </div>
    </>
  );
}

function BulkValue({ label, placeholder, onApply, disabled }: { label: string; placeholder: string; onApply: (v: string) => void; disabled?: boolean }) {
  const [v, setV] = useState("");
  return (
    <span className="inline-edit">
      <label className="sr-only" htmlFor={`bulk-${placeholder}`}>{label}</label>
      <input id={`bulk-${placeholder}`} className="input narrow" placeholder={placeholder} inputMode="decimal" value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} />
      <button type="button" className="btn btn-small" disabled={disabled || !v.trim()} onClick={() => { onApply(v.trim()); setV(""); }}>{label.startsWith("Set price") ? "Fill empty prices" : "Apply to all"}</button>
    </span>
  );
}
