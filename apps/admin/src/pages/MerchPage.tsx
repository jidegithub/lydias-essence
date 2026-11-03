import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Loader2, Plus, Repeat, Save, X } from "lucide-react";
import type { MerchSection, Product } from "@lydias-essence/types";
import { fetchSettings, listAllProducts, listMerchSlots, saveMerchSection, toFriendlyError } from "@lydias-essence/supabase";
import { useConfirm, useToast } from "@lydias-essence/ui";
import { formatPrice, resolvePricing, resolveSiteContent } from "@lydias-essence/utils";
import { ProductPicker } from "../components/ProductPicker";
import { ProductPreviewCard } from "../components/ProductPreview";
import { ErrorState, Loading, PageHead, Switch, Thumb } from "../components/ui";
import { useClient } from "../lib/auth";
import { move } from "../lib/mediaItems";
import { useResource } from "../lib/useResource";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

const CONFIG = {
  beauty_rules: {
    title: "Your Beauty,",
    emphasis: "Your Rules",
    subtitle: "Choose the products featured in the “Your Beauty, Your Rules” section of your homepage, and the order they appear in.",
    max: 8,
    exact: null as number | null,
    key: "beautyRules" as const,
    pickerTitle: "Choose a product to feature",
    noun: "featured"
  },
  next_favourite: {
    title: "Your Next",
    emphasis: "Favourite",
    subtitle: "A hand-picked set of exactly four products shown in the “Your Next Favourite” section of your homepage.",
    max: 4,
    exact: 4 as number | null,
    key: "nextFavourite" as const,
    pickerTitle: "Choose a recommended product",
    noun: "recommended"
  }
};

export function MerchPage({ section }: { section: MerchSection }) {
  const cfg = CONFIG[section];
  const client = useClient();
  const { data, error, loading, reload } = useResource(async () => {
    const [products, slots, settings] = await Promise.all([listAllProducts(client), listMerchSlots(client), fetchSettings(client)]);
    return { products, slots, settings };
  }, [section]);

  if (loading && !data) return <Loading label="Loading…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return <MerchEditor key={section} section={section} cfg={cfg} data={data} onSaved={reload} />;
}

function MerchEditor({
  section,
  cfg,
  data,
  onSaved
}: {
  section: MerchSection;
  cfg: (typeof CONFIG)[MerchSection];
  data: { products: Product[]; slots: { section: string; product_id: string; position: number }[]; settings: Awaited<ReturnType<typeof fetchSettings>> };
  onSaved: () => Promise<void>;
}) {
  const client = useClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { products, slots, settings } = data;
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const initialIds = useMemo(
    () => slots.filter((s) => s.section === section).sort((a, b) => a.position - b.position).map((s) => s.product_id).filter((id) => byId.has(id)),
    [slots, section, byId]
  );
  const initialEnabled = resolveSiteContent(settings.content)[cfg.key].enabled;

  const [ids, setIds] = useState<string[]>(initialIds);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [base, setBase] = useState(JSON.stringify([initialIds, initialEnabled]));
  const [picker, setPicker] = useState<{ index: number } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify([ids, enabled]) !== base;
  useUnsavedGuard(dirty);

  const isEligible = (p: Product) => p.published && (section === "beauty_rules" || p.recommendation_eligible);
  const reasonNot = (p: Product): string | null => (!p.published ? "Draft — publish it first" : section === "next_favourite" && !p.recommendation_eligible ? "Not allowed in recommendations" : null);
  const eligible = products.filter(isEligible);
  const selected = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  const validSelected = selected.filter(isEligible);
  const exact = cfg.exact;
  const slotCount = exact ?? Math.max(ids.length, 0);
  const incomplete = exact !== null && ids.length !== exact;
  const invalidSelected = selected.length - validSelected.length;
  const blocked = enabled && (incomplete || invalidSelected > 0);

  function pick(p: Product) {
    if (!picker) return;
    const next = [...ids];
    if (picker.index < next.length) next[picker.index] = p.id;
    else next.push(p.id);
    setIds(next);
    setPicker(null);
  }

  async function persist() {
    await saveMerchSection(client, section, ids, enabled);
    setBase(JSON.stringify([ids, enabled]));
    await onSaved();
  }

  async function save() {
    if (saving) return;
    if (blocked) {
      toast.error(
        incomplete
          ? `Choose exactly ${exact} products before turning this section on.`
          : "Some chosen products are no longer available. Replace them first."
      );
      return;
    }
    if (enabled) {
      await confirm({
        title: `Publish “${cfg.title} ${cfg.emphasis}”?`,
        message: "Your homepage will show these products straight away.",
        confirmLabel: "Publish",
        run: persist,
        successMessage: "Featured products saved."
      });
      return;
    }
    setSaving(true);
    try {
      await persist();
      toast.success(`Saved. The section is currently hidden on your shop.`);
    } catch (err) {
      toast.error(toFriendlyError(err, "The selection couldn’t be saved.").message);
    } finally {
      setSaving(false);
    }
  }

  const rowsToShow = exact ?? ids.length;

  return (
    <>
      <PageHead
        title={cfg.title}
        emphasis={cfg.emphasis}
        subtitle={cfg.subtitle}
        actions={<Link className="btn" to="/settings/content">Edit wording &amp; image</Link>}
      />

      {exact !== null && eligible.length < exact && (
        <div className="notice warn" role="status" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Not enough products yet.</strong> This section needs {exact} products that are published{section === "next_favourite" ? " and allowed in recommendations" : ""}, and only {eligible.length} {eligible.length === 1 ? "is" : "are"} available.
            Until then it will stay hidden on your shop instead of showing empty cards. <Link to="/products">Manage products</Link>
          </div>
        </div>
      )}

      <section className="card">
        <Switch
          checked={enabled}
          onChange={setEnabled}
          label={`Show this section on the shop`}
          description={enabled ? "The section is visible to shoppers." : "The section is hidden. Your product choices below are kept."}
        />
      </section>

      <section className="card" aria-labelledby="chosen-h">
        <div className="card-head">
          <div>
            <h2 id="chosen-h">Chosen products</h2>
            <p className="card-sub">
              {exact ? `Pick exactly ${exact}.` : `Pick up to ${cfg.max}.`} Drag to reorder, or use the arrows. The order here is the order shoppers see.
            </p>
          </div>
          {!exact && ids.length < cfg.max && (
            <button className="btn btn-primary" onClick={() => setPicker({ index: ids.length })}><Plus size={16} /> Add product</button>
          )}
        </div>

        {rowsToShow === 0 ? (
          <div className="empty">
            <h3>Nothing chosen yet</h3>
            <p>Add the products you’d like to feature here.</p>
            <button className="btn btn-primary" onClick={() => setPicker({ index: 0 })}><Plus size={16} /> Choose a product</button>
          </div>
        ) : (
          <ol className="slots" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {Array.from({ length: slotCount }, (_, i) => {
              const p = ids[i] ? byId.get(ids[i]!) : undefined;
              if (!p) {
                return (
                  <li key={`empty-${i}`} className="slot empty-slot">
                    <span className="slot-num" aria-hidden="true" style={{ background: "var(--muted)" }}>{i + 1}</span>
                    <div className="grow"><div className="name">Slot {i + 1} is empty</div><div className="meta">Choose a product to fill it.</div></div>
                    <button className="btn btn-small" onClick={() => setPicker({ index: ids.length })}><Plus size={14} /> Choose product</button>
                  </li>
                );
              }
              const reason = reasonNot(p);
              const price = resolvePricing(p);
              return (
                <li
                  key={p.id}
                  className={`slot ${dragFrom === i ? "dragging" : ""}`}
                  draggable
                  onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", p.id); }}
                  onDragOver={(e) => dragFrom !== null && e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) setIds(move(ids, dragFrom, Math.min(i, ids.length - 1))); setDragFrom(null); }}
                  onDragEnd={() => setDragFrom(null)}
                >
                  <GripVertical className="slot-grip" size={18} aria-hidden="true" />
                  <span className="slot-num" aria-hidden="true">{i + 1}</span>
                  <Thumb product={p} small />
                  <div className="grow">
                    <div className="name">{p.name}</div>
                    <div className="meta">{p.category} · {formatPrice(price.current)}</div>
                    {reason && <span className="pill bad" style={{ marginTop: 4 }}>{reason} — won’t show</span>}
                  </div>
                  <div className="slot-actions">
                    <button className="btn btn-icon" onClick={() => setIds(move(ids, i, i - 1))} disabled={i === 0} aria-label={`Move ${p.name} up`}><ArrowUp size={15} /></button>
                    <button className="btn btn-icon" onClick={() => setIds(move(ids, i, i + 1))} disabled={i >= ids.length - 1} aria-label={`Move ${p.name} down`}><ArrowDown size={15} /></button>
                    <button className="btn btn-small" onClick={() => setPicker({ index: i })} aria-label={`Change ${p.name}`}><Repeat size={14} /> Change</button>
                    <button className="btn btn-icon btn-danger" onClick={() => setIds(ids.filter((_, k) => k !== i))} aria-label={`Remove ${p.name}`}><X size={15} /></button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {exact !== null && (
          <p className={incomplete ? "error-text" : "help"} style={{ marginTop: 12 }} role="status">
            {ids.length} of {exact} chosen{incomplete && enabled ? " — choose all four to publish this section." : ""}
          </p>
        )}
      </section>

      <section className="card tinted" aria-labelledby="prev-h">
        <div className="card-head"><div><h2 id="prev-h">Preview</h2><p className="card-sub">How the {cfg.noun} products will look on the shop.</p></div></div>
        {!enabled && <div className="notice" style={{ marginBottom: 14 }}>This section is switched off, so shoppers won’t see it.</div>}
        {selected.length === 0 ? (
          <p className="help">Choose products to see a preview.</p>
        ) : (
          <div className={`preview-row ${exact ? "" : "five"}`}>
            {selected.map((p) => (
              <ProductPreviewCard key={p.id} showDiscount={settings.show_discount_badge} product={p} />
            ))}
          </div>
        )}
      </section>

      <div className="savebar" role="region" aria-label="Save">
        <span className={`status ${dirty ? "dirty" : ""}`} role="status">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => void save()} disabled={saving || !dirty || blocked}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} {enabled ? "Publish changes" : "Save"}
          </button>
        </div>
      </div>

      {picker && (
        <ProductPicker
          title={cfg.pickerTitle}
          products={products}
          disabled={(p) => {
            const current = ids[picker.index];
            if (ids.includes(p.id) && p.id !== current) return "Already chosen";
            if (p.id === current) return "Currently in this slot";
            return reasonNot(p);
          }}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
