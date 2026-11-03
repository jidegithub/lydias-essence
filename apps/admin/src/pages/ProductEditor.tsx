import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Eye, EyeOff, Loader2, Save, Trash2 } from "lucide-react";
import {
  BACKGROUND_THEMES,
  PRODUCT_CATEGORIES,
  type BackgroundTheme,
  type Product,
  type ProductCategory
} from "@lydias-essence/types";
import {
  PRODUCT_BUCKET,
  FriendlyError,
  applyMediaOrder,
  deleteMediaRows,
  deleteProductAndMedia,
  duplicateProductFull,
  fetchSettings,
  getProductById,
  insertMediaRow,
  insertProduct,
  listProductMedia,
  newObjectPath,
  removeStorageIfUnreferenced,
  toFriendlyError,
  updateProduct,
  uploadFile,
  type ProductWrite
} from "@lydias-essence/supabase";
import { Spin360Viewer, useConfirm, useToast } from "@lydias-essence/ui";
import {
  BACKGROUND_THEME_LABELS,
  DISCOUNT_STATE_LABEL,
  MAX_360_FRAMES,
  MAX_PRODUCT_IMAGES,
  MIN_360_FRAMES,
  discountPercent,
  formatPrice,
  parseMoney,
  parseWholeNumber,
  resolvePricing,
  slugify,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues
} from "@lydias-essence/utils";
import { MediaManager } from "../components/MediaManager";
import { ProductPreviewCard } from "../components/ProductPreview";
import { ErrorState, Field, Loading, PageHead, ProductStatus, Switch, describe } from "../components/ui";
import { useClient } from "../lib/auth";
import { fromRow, type MediaItem } from "../lib/mediaItems";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

type SectionId = "details" | "pricing" | "media" | "display" | "preview";
const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing & stock" },
  { id: "media", label: "Images & 360°" },
  { id: "display", label: "Display" },
  { id: "preview", label: "Preview" }
];

interface FormState extends ProductFormValues {
  published: boolean;
  backgroundTheme: BackgroundTheme;
  isFeatured: boolean;
  recommendationEligible: boolean;
}

const FIELD_SECTION: Partial<Record<keyof ProductFormValues, SectionId>> = {
  name: "details",
  slug: "details",
  description: "details",
  category: "details",
  price: "pricing",
  salePrice: "pricing",
  discountEnabled: "pricing",
  discountStart: "pricing",
  discountEnd: "pricing",
  stock: "pricing",
  lowStockThreshold: "pricing",
  sortOrder: "display"
};

const pad = (n: number) => String(n).padStart(2, "0");
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (s: string): string | null => (s ? new Date(s).toISOString() : null);

function blankForm(defaultThreshold: number): FormState {
  return {
    name: "",
    slug: "",
    description: "",
    category: "Skincare",
    price: "",
    salePrice: "",
    discountEnabled: false,
    discountStart: "",
    discountEnd: "",
    stock: "0",
    lowStockThreshold: String(defaultThreshold),
    sortOrder: "0",
    published: false,
    backgroundTheme: "default",
    isFeatured: false,
    recommendationEligible: true
  };
}

function formFromProduct(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    category: p.category,
    price: String(p.price),
    salePrice: p.sale_price === null ? "" : String(p.sale_price),
    discountEnabled: p.discount_enabled,
    discountStart: toLocalInput(p.discount_starts_at),
    discountEnd: toLocalInput(p.discount_ends_at),
    stock: String(p.stock),
    lowStockThreshold: String(p.low_stock_threshold),
    sortOrder: String(p.sort_order),
    published: p.published,
    backgroundTheme: p.background_theme,
    isFeatured: p.is_featured,
    recommendationEligible: p.recommendation_eligible
  };
}

function signature(form: FormState, images: MediaItem[], frames: MediaItem[], removed: MediaItem[]): string {
  const m = (l: MediaItem[]) => l.map((i) => `${i.key}${i.isPrimary ? "*" : ""}`).join(",");
  return JSON.stringify([form, m(images), m(frames), removed.map((r) => r.key).join(",")]);
}

type SaveMode = "draft" | "publish" | "save" | "unpublish";

export function ProductEditor() {
  const { id: routeId } = useParams();
  const isNewRoute = !routeId;
  const client = useClient();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  // A new product gets its id up front so images can be stored under it before the first save completes.
  const newId = useRef(crypto.randomUUID());
  const created = useRef(false);
  const productId = routeId ?? newId.current;

  const [loading, setLoading] = useState(!isNewRoute);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [showBadge, setShowBadge] = useState(true);

  const [form, setForm] = useState<FormState>(() => blankForm(5));
  const [slugTouched, setSlugTouched] = useState(false);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [frames, setFrames] = useState<MediaItem[]>([]);
  const [removed, setRemoved] = useState<MediaItem[]>([]);
  const [baseline, setBaseline] = useState("");

  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [mediaErrors, setMediaErrors] = useState<{ images?: string; frames?: string }>({});
  const [section, setSection] = useState<SectionId>("details");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null);
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const savingRef = useRef(false);
  const [show360, setShow360] = useState(false);

  const exists = !isNewRoute || created.current;
  const dirty = baseline !== "" && signature(form, images, frames, removed) !== baseline;
  const { bypass } = useUnsavedGuard(dirty);

  async function load(keepFailed?: MediaItem[]) {
    setLoading(true);
    setLoadError("");
    try {
      const [settings, p] = await Promise.all([fetchSettings(client), isNewRoute && !created.current ? Promise.resolve(null) : getProductById(client, productId)]);
      setShowBadge(settings.show_discount_badge);
      if (!p) {
        if (!isNewRoute) {
          setNotFound(true);
          return;
        }
        const f = blankForm(settings.low_stock_threshold);
        setForm(f);
        setBaseline(signature(f, [], [], []));
        return;
      }
      const media = await listProductMedia(client, p.id);
      const imgs = media.filter((m) => m.kind === "image").map(fromRow);
      if (imgs.length && !imgs.some((i) => i.isPrimary)) imgs[0] = { ...imgs[0]!, isPrimary: true };
      const frs = media.filter((m) => m.kind === "frame_360").map(fromRow);
      const f = formFromProduct(p);
      const failedImages = (keepFailed ?? []).filter((k) => k.file && k.error && images.some((i) => i.key === k.key));
      const failedFrames = (keepFailed ?? []).filter((k) => k.file && k.error && frames.some((i) => i.key === k.key));
      setProduct(p);
      setForm(f);
      setSlugTouched(true);
      setImages([...imgs, ...failedImages]);
      setFrames([...frs, ...failedFrames]);
      setRemoved([]);
      setBaseline(signature(f, imgs, frs, []));
    } catch (err) {
      setLoadError(toFriendlyError(err, "We couldn’t load this product.").message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function onName(value: string) {
    setForm((f) => ({ ...f, name: value, slug: !slugTouched && !exists ? slugify(value) : f.slug }));
    setErrors((e) => ({ ...e, name: undefined, slug: !slugTouched && !exists ? undefined : e.slug }));
  }

  // ---- pricing preview (same rules the storefront uses) ----
  const priceNum = parseMoney(form.price);
  const saleNum = parseMoney(form.salePrice);
  const previewPricing = useMemo(
    () =>
      resolvePricing({
        price: typeof priceNum === "number" && Number.isFinite(priceNum) ? priceNum : 0,
        sale_price: typeof saleNum === "number" && Number.isFinite(saleNum) ? saleNum : null,
        discount_enabled: form.discountEnabled,
        discount_starts_at: fromLocalInput(form.discountStart),
        discount_ends_at: fromLocalInput(form.discountEnd)
      }),
    [priceNum, saleNum, form.discountEnabled, form.discountStart, form.discountEnd]
  );
  const calcPercent =
    typeof priceNum === "number" && typeof saleNum === "number" && Number.isFinite(priceNum) && Number.isFinite(saleNum) ? discountPercent(priceNum, saleNum) : 0;

  const primaryImage = images.find((i) => i.isPrimary) ?? images[0];

  // ---------------------------------------------------------------- saving
  async function syncMedia(pid: string): Promise<{ uploaded: number; failed: MediaItem[] }> {
    const failed: MediaItem[] = [];
    let uploaded = 0;
    const rowIds = new Map<string, string>();
    const queue = [
      ...images.map((item, index) => ({ item, index, kind: "image" as const })),
      ...frames.map((item, index) => ({ item, index, kind: "frame_360" as const }))
    ];
    const total = queue.filter((q) => q.item.file).length;
    let done = 0;

    for (const { item, index, kind } of queue) {
      if (!item.file) {
        if (item.id) rowIds.set(item.key, item.id);
        continue;
      }
      setProgress({ done, total, name: item.file.name });
      setUploadingKeys(new Set([item.key]));
      let path: string | null = null;
      try {
        const up = await uploadFile(client, PRODUCT_BUCKET, newObjectPath(pid, item.file), item.file);
        path = up.path;
        const row = await insertMediaRow(client, {
          product_id: pid,
          kind,
          storage_path: up.path,
          public_url: up.publicUrl,
          sort_order: index,
          mime_type: item.file.type,
          size_bytes: item.file.size,
          alt_text: ""
        });
        rowIds.set(item.key, row.id);
        uploaded++;
      } catch (err) {
        // The file went up but could not be linked: take it back so nothing is left orphaned.
        if (path) await client.storage.from(PRODUCT_BUCKET).remove([path]).catch(() => undefined);
        failed.push({ ...item, error: toFriendlyError(err, "Upload failed.").message });
      }
      done++;
    }
    setUploadingKeys(new Set());
    setProgress(null);

    const removeIds = removed.map((r) => r.id).filter((x): x is string => !!x);
    await deleteMediaRows(client, removeIds);
    for (const r of removed) await removeStorageIfUnreferenced(client, PRODUCT_BUCKET, r.storagePath);

    const imageIds = images.map((i) => rowIds.get(i.key)).filter((x): x is string => !!x);
    const primaryKey = images.find((i) => i.isPrimary)?.key;
    const primaryId = (primaryKey && rowIds.get(primaryKey)) || imageIds[0] || null;
    const frameIds = frames.map((i) => rowIds.get(i.key)).filter((x): x is string => !!x);
    await applyMediaOrder(client, pid, imageIds, primaryId, frameIds);
    return { uploaded, failed };
  }

  /** Validates and saves. With `quiet`, success is left to the caller (used inside confirm dialogs). */
  async function save(mode: SaveMode, quiet = false): Promise<{ ok: boolean; message: string }> {
    if (savingRef.current) return { ok: false, message: "Already saving." };
    const published = mode === "publish" ? true : mode === "draft" || mode === "unpublish" ? false : form.published;

    const fieldErrors = validateProductForm(form);
    const mErr: { images?: string; frames?: string } = {};
    if (published && images.length === 0) mErr.images = "Add at least one image before publishing.";
    if (images.length > MAX_PRODUCT_IMAGES) mErr.images = `Use no more than ${MAX_PRODUCT_IMAGES} images.`;
    if (frames.length > 0 && frames.length < MIN_360_FRAMES) mErr.frames = `A 360° view needs at least ${MIN_360_FRAMES} frames (you have ${frames.length}). Add more, or remove them all.`;
    if (frames.length > MAX_360_FRAMES) mErr.frames = `Use no more than ${MAX_360_FRAMES} frames.`;
    setErrors(fieldErrors);
    setMediaErrors(mErr);

    const keys = Object.keys(fieldErrors) as (keyof ProductFormValues)[];
    const count = keys.length + Object.keys(mErr).length;
    if (count > 0) {
      const firstSection = keys.length ? FIELD_SECTION[keys[0]!] ?? "details" : "media";
      setSection(firstSection as SectionId);
      const message = `Please fix ${count} thing${count === 1 ? "" : "s"} before saving — they’re marked in red.`;
      if (!quiet) toast.error(message);
      return { ok: false, message };
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const payload: ProductWrite = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        category: form.category as ProductCategory,
        price: parseMoney(form.price) as number,
        sale_price: parseMoney(form.salePrice),
        discount_enabled: form.discountEnabled,
        discount_starts_at: fromLocalInput(form.discountStart),
        discount_ends_at: fromLocalInput(form.discountEnd),
        stock: parseWholeNumber(form.stock) as number,
        low_stock_threshold: parseWholeNumber(form.lowStockThreshold) as number,
        published,
        background_theme: form.backgroundTheme,
        is_featured: form.isFeatured,
        recommendation_eligible: form.recommendationEligible,
        sort_order: parseWholeNumber(form.sortOrder) as number
      };

      const wasNew = !exists;
      if (wasNew) {
        await insertProduct(client, productId, payload);
        created.current = true;
      } else {
        await updateProduct(client, productId, payload);
      }

      let uploaded = 0;
      let failed: MediaItem[] = [];
      try {
        ({ uploaded, failed } = await syncMedia(productId));
      } catch (err) {
        const message = `The product was saved, but its images couldn’t be updated. ${toFriendlyError(err).message}`;
        toast.error(message);
        await load();
        return { ok: false, message };
      }

      if (failed.length) {
        const message = `Saved, but ${failed.length} file${failed.length === 1 ? "" : "s"} couldn’t be uploaded: ${failed[0]!.error}`;
        toast.error(message);
        setImages((l) => l.map((i) => failed.find((f) => f.key === i.key) ?? i));
        setFrames((l) => l.map((i) => failed.find((f) => f.key === i.key) ?? i));
        await load(failed);
        return { ok: false, message };
      }

      const message = wasNew
        ? published ? "Product created and published." : "Product created successfully."
        : mode === "publish" ? "Changes published." : mode === "unpublish" ? "Product moved to drafts." : "Product updated successfully.";
      if (!quiet) toast.success(message);
      if (uploaded > 0) toast.success("Product images uploaded successfully.");

      if (wasNew) {
        bypass();
        navigate(`/products/${productId}`, { replace: true });
      } else {
        await load();
      }
      return { ok: true, message };
    } catch (err) {
      const message = toFriendlyError(err, "The product couldn’t be saved.").message;
      if (!quiet) toast.error(message);
      return { ok: false, message };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function publish() {
    const wasNew = !exists;
    return confirm({
      title: wasNew ? "Create and publish this product?" : "Publish this product?",
      message: "It will appear on your shop straight away. You can switch it back to a draft any time.",
      confirmLabel: "Publish",
      run: async () => {
        const r = await save("publish", true);
        if (!r.ok) throw new FriendlyError(r.message);
      },
      successMessage: wasNew ? "Product created and published." : "Changes published."
    });
  }

  function unpublish() {
    return confirm({
      title: "Unpublish this product?",
      message: "It will disappear from the shop (and any featured section) straight away. Your edits are saved too.",
      confirmLabel: "Unpublish",
      run: async () => {
        const r = await save("unpublish", true);
        if (!r.ok) throw new FriendlyError(r.message);
      },
      successMessage: "Product moved to drafts."
    });
  }

  function remove() {
    return confirm({
      title: `Delete “${form.name || "this product"}”?`,
      message: "This permanently removes the product and its images. It can’t be undone. If you only want to hide it, unpublish it instead.",
      confirmLabel: "Delete product",
      tone: "danger",
      run: async () => {
        await deleteProductAndMedia(client, productId);
        bypass();
        navigate("/products", { replace: true });
      },
      successMessage: "Product deleted."
    });
  }

  async function duplicate() {
    if (!product) return;
    try {
      const copy = await duplicateProductFull(client, product);
      toast.success("Product duplicated. The copy is saved as a draft.");
      navigate(`/products/${copy.id}`);
    } catch (err) {
      toast.error(toFriendlyError(err, "The product couldn’t be duplicated.").message);
    }
  }

  // ---------------------------------------------------------------- render
  if (loading && !baseline) return <Loading label="Loading product…" />;
  if (notFound)
    return (
      <div className="empty">
        <h3>That product wasn’t found</h3>
        <p>It may have been deleted, or the link is out of date.</p>
        <Link className="btn btn-primary" to="/products">Back to products</Link>
      </div>
    );
  if (loadError) return <ErrorState message={loadError} onRetry={() => void load()} />;

  const sectionHasError = (id: SectionId) =>
    (Object.keys(errors) as (keyof ProductFormValues)[]).some((k) => errors[k] && FIELD_SECTION[k] === id) ||
    (id === "media" && !!(mediaErrors.images || mediaErrors.frames));

  const pricingInput = {
    price: previewPricing.regular,
    sale_price: typeof saleNum === "number" && Number.isFinite(saleNum) ? saleNum : null,
    discount_enabled: form.discountEnabled,
    discount_starts_at: fromLocalInput(form.discountStart),
    discount_ends_at: fromLocalInput(form.discountEnd)
  };

  return (
    <>
      <Link to="/products" className="btn btn-small" style={{ marginBottom: 18 }}>
        <ArrowLeft size={14} /> All products
      </Link>
      <PageHead
        title={exists ? form.name || "Edit product" : "New"}
        emphasis={exists ? undefined : "product"}
        subtitle={
          exists ? (
            <>
              {product && <ProductStatus product={{ ...product, published: form.published }} />} <span style={{ marginLeft: 8 }}>
                {form.published ? "This product is live on your shop." : "This product is a draft and isn’t visible to shoppers."}</span>
            </>
          ) : (
            "Fill in the details, add some images, then save it as a draft or publish it straight away."
          )
        }
        actions={
          exists ? (
            <>
              <button className="btn" onClick={() => void duplicate()} disabled={dirty || saving} title={dirty ? "Save your changes first" : undefined}>
                <Copy size={15} /> Duplicate
              </button>
              <button className="btn btn-danger" onClick={() => void remove()} disabled={saving}>
                <Trash2 size={15} /> Delete
              </button>
            </>
          ) : undefined
        }
      />

      <div className="editor-layout">
        <nav className="section-nav" aria-label="Product sections">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" aria-current={section === s.id} onClick={() => setSection(s.id)}>
              {s.label}
              {sectionHasError(s.id) && <span className="has-error" aria-label="has problems" />}
            </button>
          ))}
        </nav>

        <div>
          {/* Details */}
          <section className="card" hidden={section !== "details"} aria-labelledby="sec-details">
            <div className="card-head"><div><h2 id="sec-details">Details</h2><p className="card-sub">What shoppers read about this product.</p></div></div>
            <Field label="Product name" htmlFor="name" error={errors.name}>
              <input {...describe("name", errors.name)} className="input" value={form.name} onChange={(e) => onName(e.target.value)} maxLength={120} autoComplete="off" />
            </Field>
            <Field label="Web address" htmlFor="slug" error={errors.slug} help="Used in the product’s link. Created from the name automatically.">
              <input {...describe("slug", errors.slug, "x")} className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} autoComplete="off" />
            </Field>
            <Field label="Category" htmlFor="category" error={errors.category}>
              <select {...describe("category", errors.category)} className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Description" htmlFor="description" error={errors.description} help="A short, inviting description. Plain text.">
              <textarea {...describe("description", errors.description, "x")} className="textarea" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </section>

          {/* Pricing & stock */}
          <section className="card" hidden={section !== "pricing"} aria-labelledby="sec-pricing">
            <div className="card-head"><div><h2 id="sec-pricing">Pricing &amp; stock</h2><p className="card-sub">Set the regular price, and optionally a sale price.</p></div></div>
            <div className="field-grid">
              <Field label="Regular price" htmlFor="price" error={errors.price}>
                <div className="input-prefix"><span aria-hidden="true">₦</span>
                  <input {...describe("price", errors.price)} className="input" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="18500" />
                </div>
              </Field>
              <Field label="Sale price" htmlFor="salePrice" error={errors.salePrice} help="Kept safely even when the discount is switched off.">
                <div className="input-prefix"><span aria-hidden="true">₦</span>
                  <input {...describe("salePrice", errors.salePrice, "x")} className="input" inputMode="decimal" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="Optional" />
                </div>
              </Field>
            </div>

            <Switch
              checked={form.discountEnabled}
              onChange={(v) => set("discountEnabled", v)}
              label="Discount is on"
              description="When on, shoppers pay the sale price. Turning it off brings back the regular price instantly — nothing is lost."
            />

            {form.discountEnabled && (
              <div className="field-grid">
                <Field label="Starts (optional)" htmlFor="discountStart" error={errors.discountStart} help="Leave empty to start straight away.">
                  <input {...describe("discountStart", errors.discountStart, "x")} className="input" type="datetime-local" value={form.discountStart} onChange={(e) => set("discountStart", e.target.value)} />
                </Field>
                <Field label="Ends (optional)" htmlFor="discountEnd" error={errors.discountEnd} help="Leave empty to run until you turn it off.">
                  <input {...describe("discountEnd", errors.discountEnd, "x")} className="input" type="datetime-local" value={form.discountEnd} onChange={(e) => set("discountEnd", e.target.value)} />
                </Field>
              </div>
            )}

            <div className="price-summary" style={{ marginTop: 18 }} aria-live="polite">
              <div className="row"><span>Shoppers will pay</span><span className="big">{formatPrice(previewPricing.current)}</span></div>
              {previewPricing.onSale && previewPricing.original !== null && (
                <div className="row"><span>Instead of</span><span><s>{formatPrice(previewPricing.original)}</s> · <strong>{previewPricing.percent}% off</strong></span></div>
              )}
              {form.discountEnabled && !previewPricing.onSale && (
                <div className="row"><span>Discount status</span><span><strong>{DISCOUNT_STATE_LABEL[previewPricing.state]}</strong>{previewPricing.state === "upcoming" ? " — not live yet" : previewPricing.state === "expired" ? " — the end date has passed" : ""}</span></div>
              )}
              {!form.discountEnabled && calcPercent > 0 && <div className="row help"><span>Your saved sale price would be {calcPercent}% off.</span></div>}
            </div>

            <div className="field-grid" style={{ marginTop: 22 }}>
              <Field label="Stock quantity" htmlFor="stock" error={errors.stock} help="Set to 0 when it’s sold out.">
                <input {...describe("stock", errors.stock, "x")} className="input" inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
              </Field>
              <Field label="Low-stock warning at" htmlFor="lowStockThreshold" error={errors.lowStockThreshold} help="You’ll see a “low stock” flag at or below this number.">
                <input {...describe("lowStockThreshold", errors.lowStockThreshold, "x")} className="input" inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Media */}
          <div hidden={section !== "media"}>
            <section className="card" aria-labelledby="sec-media">
              <div className="card-head"><div><h2 id="sec-media">Product images</h2><p className="card-sub">Photos are uploaded when you save. The main image is used on the shop’s product cards.</p></div></div>
              {mediaErrors.images && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{mediaErrors.images}</div>}
              {progress && (
                <div className="notice" role="status" style={{ marginBottom: 14 }}>
                  <Loader2 className="spin" size={16} aria-hidden="true" /> Uploading {progress.done + 1} of {progress.total}: {progress.name}
                </div>
              )}
              <MediaManager
                kind="image"
                items={images}
                onChange={setImages}
                onRemoveSaved={(i) => setRemoved((r) => [...r, i])}
                max={MAX_PRODUCT_IMAGES}
                disabled={saving}
                uploadingKeys={uploadingKeys}
              />
            </section>
            <section className="card" aria-labelledby="sec-360">
              <div className="card-head"><div><h2 id="sec-360">360° view <span className="pill" style={{ marginLeft: 8, verticalAlign: "middle" }}>Optional</span></h2>
                <p className="card-sub">Upload {MIN_360_FRAMES}–{MAX_360_FRAMES} photos taken evenly around the product (name them in order). Shoppers can drag to spin it.</p></div></div>
              {mediaErrors.frames && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{mediaErrors.frames}</div>}
              <MediaManager
                kind="frame_360"
                items={frames}
                onChange={setFrames}
                onRemoveSaved={(i) => setRemoved((r) => [...r, i])}
                max={MAX_360_FRAMES}
                disabled={saving}
                uploadingKeys={uploadingKeys}
              />
              {frames.length >= 2 && (
                <div style={{ marginTop: 16 }}>
                  <button type="button" className="btn" onClick={() => setShow360((v) => !v)} aria-expanded={show360}>{show360 ? "Hide 360° preview" : "Preview 360° view"}</button>
                  {show360 && (
                    <div style={{ marginTop: 14, maxWidth: 360 }}>
                      <Spin360Viewer frames={frames.map((f) => f.previewUrl)} alt={form.name || "Product"} background={`var(--theme-${form.backgroundTheme})`} />
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Display */}
          <section className="card" hidden={section !== "display"} aria-labelledby="sec-display">
            <div className="card-head"><div><h2 id="sec-display">Display</h2><p className="card-sub">How this product is presented and where it can appear.</p></div></div>
            <div className="field">
              <span className="label-text" id="theme-label">Image background</span>
              <div className="theme-options" role="group" aria-labelledby="theme-label">
                {BACKGROUND_THEMES.map((t) => (
                  <button key={t} type="button" className="theme-option" aria-pressed={form.backgroundTheme === t} onClick={() => set("backgroundTheme", t)}>
                    <span className="theme-swatch" style={{ background: `var(--theme-${t})` }} />{BACKGROUND_THEME_LABELS[t]}
                  </button>
                ))}
              </div>
              <span className="help">The soft colour behind the product photo on the shop.</span>
            </div>
            <Switch checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} label="Feature this product" description="Featured products are listed first when shoppers sort by “Featured”. This does not add it to the homepage sections — manage those under Storefront." />
            <Switch checked={form.recommendationEligible} onChange={(v) => set("recommendationEligible", v)} label="Allowed in “Your Next Favourite”" description="Turn off to keep this product out of the recommendation picker." />
            <div style={{ marginTop: 10, maxWidth: 220 }}>
              <Field label="Sort order" htmlFor="sortOrder" error={errors.sortOrder} help="Lower numbers appear first. 0 is fine for most products.">
                <input {...describe("sortOrder", errors.sortOrder, "x")} className="input" inputMode="numeric" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
              </Field>
            </div>
            {product && (
              <p className="help" style={{ marginTop: 18 }}>
                Created {new Date(product.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })} · Last updated {new Date(product.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </section>

          {/* Preview */}
          <section className="card" hidden={section !== "preview"} aria-labelledby="sec-preview">
            <div className="card-head"><div><h2 id="sec-preview">Preview</h2><p className="card-sub">How this product will look to shoppers. Nothing here is live until you publish.</p></div></div>
            <div className="preview-stage">
              <ProductPreviewCard
                showDiscount={showBadge}
                product={{ ...pricingInput, name: form.name, category: form.category, image_url: primaryImage?.previewUrl ?? null, background_theme: form.backgroundTheme }}
              />
              <div className="stack-gap">
                <div className="price-summary">
                  <div className="row"><span>Regular price</span><strong>{formatPrice(previewPricing.regular)}</strong></div>
                  <div className="row"><span>Shoppers pay</span><strong>{formatPrice(previewPricing.current)}</strong></div>
                  <div className="row"><span>Discount</span><strong>{previewPricing.onSale ? `${previewPricing.percent}% off` : DISCOUNT_STATE_LABEL[previewPricing.state]}</strong></div>
                  <div className="row"><span>Stock</span><strong>{form.stock || 0}</strong></div>
                  <div className="row"><span>Visibility</span><strong>{form.published ? "Live" : "Draft (hidden)"}</strong></div>
                </div>
                {!showBadge && previewPricing.onSale && <div className="notice">The “Special price” label is switched off site-wide, so shoppers see only the sale price.</div>}
                {images.length > 1 && (
                  <div>
                    <p className="label-text" style={{ marginBottom: 8 }}>All images</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {images.map((i) => <span key={i.key} className="thumb" style={{ background: `var(--theme-${form.backgroundTheme})` }}><img src={i.previewUrl} alt="" /></span>)}
                    </div>
                  </div>
                )}
                {frames.length >= MIN_360_FRAMES && (
                  <div style={{ maxWidth: 300 }}>
                    <p className="label-text" style={{ marginBottom: 8 }}>360° view</p>
                    <Spin360Viewer frames={frames.map((f) => f.previewUrl)} alt={form.name || "Product"} background={`var(--theme-${form.backgroundTheme})`} />
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="savebar" role="region" aria-label="Save">
            <span className={`status ${dirty ? "dirty" : ""}`} role="status">
              {saving ? "Saving…" : dirty ? "You have unsaved changes" : exists ? "All changes saved" : "Not saved yet"}
            </span>
            <div className="head-actions">
              {exists && form.published ? (
                <>
                  <button className="btn" onClick={() => void unpublish()} disabled={saving}><EyeOff size={15} /> Unpublish</button>
                  <button className="btn btn-primary" onClick={() => void save("save")} disabled={saving || !dirty}>
                    {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save changes
                  </button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => void save("draft")} disabled={saving || (exists && !dirty)}>
                    {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save draft
                  </button>
                  <button className="btn btn-primary" onClick={() => void publish()} disabled={saving}><Eye size={15} /> Publish</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
