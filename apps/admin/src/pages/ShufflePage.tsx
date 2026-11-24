import { useMemo, useState } from "react";
import { Loader2, Plus, Save, Shuffle, X } from "lucide-react";
import { fetchSettings, listAllProducts, toFriendlyError, updateSettingsColumns } from "@lydias-essence/supabase";
import { PRODUCT_CATEGORIES, type Product } from "@lydias-essence/types";
import { useConfirm, useToast } from "@lydias-essence/ui";
import { SHUFFLE_MAX_PINNED } from "@lydias-essence/utils";
import { ErrorState, Loading, PageHead, Switch } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

export function ShufflePage() {
  const client = useClient();
  const { data, error, loading, reload } = useResource(async () => {
    const [products, settings] = await Promise.all([listAllProducts(client), fetchSettings(client)]);
    return { products, settings };
  }, []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <ShuffleEditor data={data} onSaved={reload} />;
}

type Settings = Awaited<ReturnType<typeof fetchSettings>>;

interface Values {
  enabled: boolean;
  categories: string[];
  skipSoldOut: boolean;
  pinned: string[];
}

function ShuffleEditor({ data, onSaved }: { data: { products: Product[]; settings: Settings }; onSaved: () => Promise<void> }) {
  const client = useClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { products, settings } = data;

  const published = useMemo(() => products.filter((p) => p.published), [products]);
  const byId = useMemo(() => new Map(published.map((p) => [p.id, p])), [published]);

  const initial: Values = {
    enabled: settings.shuffle_enabled,
    // Stored empty means "every category", so show them all ticked.
    categories: settings.shuffle_categories.length ? settings.shuffle_categories : [...PRODUCT_CATEGORIES],
    skipSoldOut: settings.shuffle_skip_sold_out,
    pinned: settings.shuffle_pinned_ids.filter((id) => byId.has(id)),
  };

  const [v, setV] = useState<Values>(initial);
  const [base, setBase] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(base);
  useUnsavedGuard(dirty);

  const allCategoriesTicked = PRODUCT_CATEGORIES.every((c) => v.categories.includes(c));

  function toggleCategory(category: string) {
    setV((s) => ({
      ...s,
      categories: s.categories.includes(category)
        ? s.categories.filter((c) => c !== category)
        : [...s.categories, category],
    }));
  }

  function setPinned(index: number, id: string) {
    setV((s) => {
      const next = [...s.pinned];
      next[index] = id;
      return { ...s, pinned: next };
    });
  }

  function removePinned(index: number) {
    setV((s) => ({ ...s, pinned: s.pinned.filter((_, i) => i !== index) }));
  }

  async function save() {
    if (saving) return;
    if (v.enabled && v.categories.length === 0) {
      toast.error("Choose at least one category to shuffle.");
      return;
    }
    if (v.pinned.some((id) => !id)) {
      toast.error("Choose a product for every pinned slot, or remove the empty ones.");
      return;
    }
    setSaving(true);
    try {
      await updateSettingsColumns(client, {
        shuffle_enabled: v.enabled,
        shuffle_categories: allCategoriesTicked ? [] : v.categories,
        shuffle_skip_sold_out: v.skipSoldOut,
        shuffle_pinned_ids: v.pinned,
      });
      setBase(v);
      await onSaved();
      toast.success(v.enabled ? "Daily shuffle saved. The shop order changes at midnight London time." : "Saved. The shuffle is off.");
    } catch (err) {
      toast.error(toFriendlyError(err, "The shuffle settings couldn’t be saved.").message);
    } finally {
      setSaving(false);
    }
  }

  async function shuffleNow() {
    await confirm({
      title: "Shuffle the shop now?",
      message: "The shop order will change straight away for every visitor, and will keep changing daily.",
      confirmLabel: "Shuffle now",
      run: async () => {
        await updateSettingsColumns(client, {
          shuffle_seed: Math.floor(Math.random() * 1_000_000_000),
          shuffle_updated_at: new Date().toISOString(),
        });
        await onSaved();
      },
      successMessage: "Shop reshuffled."
    });
  }

  const lastShuffled = settings.shuffle_updated_at ? new Date(settings.shuffle_updated_at).toLocaleString("en-GB") : "Never";

  return (
    <>
      <PageHead
        title="Daily"
        emphasis="shuffle"
        subtitle="Changes the order of the shop once a day, so returning visitors see something new. Pinned products always stay at the top."
        actions={
          <button type="button" className="btn" onClick={shuffleNow}>
            <Shuffle size={16} aria-hidden="true" /> Shuffle now
          </button>
        }
      />

      <section className="card">
        <Switch
          checked={v.enabled}
          onChange={(enabled) => setV((s) => ({ ...s, enabled }))}
          label="Shuffle the shop order each day"
          description={v.enabled ? "On. The default “Featured” order is shuffled daily." : "Off. The shop keeps its normal order."}
        />
        <p className="muted" style={{ marginTop: 8 }}>Last shuffled: {lastShuffled}</p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <fieldset className="shuffle-fieldset">
          <legend>Categories to shuffle</legend>
          <p className="muted">Unticked categories keep their normal order, after the shuffled products.</p>
          {PRODUCT_CATEGORIES.map((category) => (
            <label key={category} className="shuffle-check">
              <input
                type="checkbox"
                checked={v.categories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
              {category}
            </label>
          ))}
        </fieldset>

        <div style={{ marginTop: 16 }}>
          <Switch
            checked={v.skipSoldOut}
            onChange={(skipSoldOut) => setV((s) => ({ ...s, skipSoldOut }))}
            label="Leave sold-out products out of the shuffle"
            description="Sold-out products move to the end of the shop."
          />
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="section-title">Pinned to the top</h2>
        <p className="muted">Up to {SHUFFLE_MAX_PINNED} products that always appear first, in this order.</p>

        {v.pinned.map((id, index) => (
          <div key={index} className="shuffle-row">
            <label className="sr-only" htmlFor={`pin-${index}`}>Pinned product {index + 1}</label>
            <select
              id={`pin-${index}`}
              value={id}
              onChange={(e) => setPinned(index, e.target.value)}
            >
              <option value="">Choose a product…</option>
              {published
                .filter((p) => p.id === id || !v.pinned.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                ))}
            </select>
            <button type="button" className="btn btn-small" onClick={() => removePinned(index)} aria-label={`Remove pinned product ${index + 1}`}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}

        {v.pinned.length < SHUFFLE_MAX_PINNED && (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setV((s) => ({ ...s, pinned: [...s.pinned, ""] }))}
          >
            <Plus size={14} aria-hidden="true" /> Add a pinned product
          </button>
        )}
      </section>

      <div className="savebar" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}
