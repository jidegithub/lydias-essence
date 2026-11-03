import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Plus } from "lucide-react";
import { fetchSettings, listAllProducts, listMerchSlots } from "@lydias-essence/supabase";
import { formatPrice, formatRelative, resolvePricing, resolveSiteContent } from "@lydias-essence/utils";
import { ErrorState, Loading, PageHead, Thumb } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";

const DAY = 86_400_000;

export function Dashboard() {
  const client = useClient();
  const { data, error, loading, reload } = useResource(async () => {
    const [products, slots, settings] = await Promise.all([listAllProducts(client), listMerchSlots(client), fetchSettings(client)]);
    return { products, slots, settings };
  }, []);

  if (loading && !data) return <Loading label="Loading your shop…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { products, slots, settings } = data;
  const content = resolveSiteContent(settings.content);
  const now = Date.now();

  const published = products.filter((p) => p.published);
  const drafts = products.filter((p) => !p.published);
  const onSale = products.filter((p) => resolvePricing(p).onSale);
  const out = products.filter((p) => p.stock <= 0);
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.low_stock_threshold);
  const inStock = products.length - out.length - low.length;
  const featured = products.filter((p) => p.is_featured);
  const recentlyUpdated = [...products].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const recentlyPublished = published
    .filter((p) => p.published_at)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 5);

  // Products whose most recent edit fell on each of the last 14 days.
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(now - (13 - i) * DAY);
    start.setHours(0, 0, 0, 0);
    const from = start.getTime();
    const count = products.filter((p) => {
      const t = new Date(p.updated_at).getTime();
      return t >= from && t < from + DAY;
    }).length;
    return { label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), short: String(start.getDate()), count };
  });
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const favIds = slots.filter((s) => s.section === "next_favourite").map((s) => s.product_id);
  const favValid = favIds.map((id) => products.find((p) => p.id === id)).filter((p) => p && p.published && p.recommendation_eligible).length;
  const rulesCount = slots.filter((s) => s.section === "beauty_rules").length;
  const eligibleForFav = products.filter((p) => p.published && p.recommendation_eligible).length;

  return (
    <>
      <PageHead
        title="Welcome"
        emphasis="back."
        subtitle="Here’s how your shop looks right now. Everything below comes straight from your live products."
        actions={
          <Link className="btn btn-primary" to="/products/new">
            <Plus size={16} /> Add a product
          </Link>
        }
      />

      {content.nextFavourite.enabled && favIds.length > 0 && favValid !== 4 && (
        <div className="notice warn" role="status" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>“Your Next Favourite” isn’t showing.</strong> It needs exactly four published products, and only {favValid} of the selected products qualify right now.{" "}
            <Link to="/featured/next-favourite">Fix this</Link>
          </div>
        </div>
      )}

      <section className="metric-grid" aria-label="Product summary">
        <Metric primary label="Total products" value={products.length} hint={`${published.length} live on the shop`} to="/products" />
        <Metric label="Published" value={published.length} hint="Visible to shoppers" to="/products?status=published" />
        <Metric label="Drafts" value={drafts.length} hint="Hidden until published" to="/products?status=draft" />
        <Metric label="Running discounts" value={onSale.length} hint="Sale prices showing now" to="/products?discount=on" />
        <Metric label="Low stock" value={low.length} hint="Almost sold out" to="/products?stock=low" tone={low.length ? "warn" : undefined} />
        <Metric label="Out of stock" value={out.length} hint="Can’t be bought" to="/products?stock=out" tone={out.length ? "bad" : undefined} />
        <Metric label="Featured products" value={featured.length} hint="Shown first in the shop" to="/products?featured=yes" />
        <Metric label="In “Your Next Favourite”" value={`${Math.min(favIds.length, 4)}/4`} hint={content.nextFavourite.enabled ? "Section is on" : "Section is off"} to="/featured/next-favourite" />
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="activity-h">
          <div className="card-head">
            <div>
              <h2 id="activity-h">Product updates</h2>
              <p className="card-sub">Products last edited on each of the past 14 days.</p>
            </div>
          </div>
          <div className="bars" role="img" aria-label={`Product updates over the last 14 days. Busiest day: ${maxCount} product${maxCount === 1 ? "" : "s"}.`}>
            {days.map((d) => (
              <div className="bar-col" key={d.label} title={`${d.label}: ${d.count} updated`}>
                <div className={`bar ${d.count === 0 ? "zero" : ""}`} style={{ height: `${(d.count / maxCount) * 100}%` }} />
                <span className="bar-label">{d.short}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="inv-h">
          <div className="card-head">
            <div>
              <h2 id="inv-h">Inventory</h2>
              <p className="card-sub">Stock health across all products.</p>
            </div>
          </div>
          {products.length === 0 ? (
            <p className="help">Add products to see your stock summary.</p>
          ) : (
            <>
              <div className="stack" role="img" aria-label={`${inStock} in stock, ${low.length} low, ${out.length} out of stock`}>
                <span style={{ width: `${(inStock / products.length) * 100}%`, background: "var(--green)" }} />
                <span style={{ width: `${(low.length / products.length) * 100}%`, background: "#c9a13b" }} />
                <span style={{ width: `${(out.length / products.length) * 100}%`, background: "var(--danger)" }} />
              </div>
              <div className="legend">
                <div><span><i className="dot" style={{ background: "var(--green)" }} />In stock</span><strong>{inStock}</strong></div>
                <div><span><i className="dot" style={{ background: "#c9a13b" }} />Low stock</span><strong>{low.length}</strong></div>
                <div><span><i className="dot" style={{ background: "var(--danger)" }} />Out of stock</span><strong>{out.length}</strong></div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <section className="card" aria-labelledby="recent-h">
          <div className="card-head">
            <h2 id="recent-h">Recently updated</h2>
            <Link className="btn btn-small" to="/products">All products</Link>
          </div>
          {recentlyUpdated.length === 0 ? (
            <Empty text="No products yet." cta="Add your first product" to="/products/new" />
          ) : (
            <ul className="mini-list">
              {recentlyUpdated.map((p) => (
                <li key={p.id}>
                  <Thumb product={p} small />
                  <div className="grow">
                    <Link className="name" to={`/products/${p.id}`} style={{ display: "block", textDecoration: "none" }}>{p.name}</Link>
                    <span className="meta">{formatRelative(p.updated_at)} · {p.published ? "Published" : "Draft"}</span>
                  </div>
                  <Link className="btn btn-small" to={`/products/${p.id}`}>Edit</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="card" aria-labelledby="disc-h">
            <div className="card-head"><h2 id="disc-h">Running discounts</h2></div>
            {onSale.length === 0 ? (
              <p className="help">No discounts are running. Add a sale price on any product to start one.</p>
            ) : (
              <ul className="mini-list">
                {onSale.slice(0, 5).map((p) => {
                  const r = resolvePricing(p);
                  return (
                    <li key={p.id}>
                      <div className="grow">
                        <div className="name">{p.name}</div>
                        <span className="meta">{formatPrice(r.current)} <s>{formatPrice(p.price)}</s></span>
                      </div>
                      <span className="pill rose">−{r.percent}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="pub-h">
            <div className="card-head"><h2 id="pub-h">Recently published</h2></div>
            {recentlyPublished.length === 0 ? (
              <p className="help">Nothing published yet.</p>
            ) : (
              <ul className="mini-list">
                {recentlyPublished.map((p) => (
                  <li key={p.id}>
                    <div className="grow">
                      <div className="name">{p.name}</div>
                      <span className="meta">{formatRelative(p.published_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="card" style={{ marginTop: 20 }} aria-labelledby="sections-h">
        <div className="card-head">
          <div>
            <h2 id="sections-h">Storefront sections</h2>
            <p className="card-sub">What’s currently chosen for the homepage.</p>
          </div>
        </div>
        <ul className="mini-list">
          <li>
            <div className="grow">
              <div className="name">Your Beauty, Your Rules</div>
              <span className="meta">{content.beautyRules.enabled ? `On · ${rulesCount} product${rulesCount === 1 ? "" : "s"} chosen` : "Off"}</span>
            </div>
            <Link className="btn btn-small" to="/featured/beauty-rules">Manage</Link>
          </li>
          <li>
            <div className="grow">
              <div className="name">Your Next Favourite</div>
              <span className="meta">
                {content.nextFavourite.enabled ? `On · ${favValid}/4 products` : "Off"}
                {eligibleForFav < 4 ? ` · only ${eligibleForFav} eligible product${eligibleForFav === 1 ? "" : "s"} available` : ""}
              </span>
            </div>
            <Link className="btn btn-small" to="/featured/next-favourite">Manage</Link>
          </li>
          <li>
            <div className="grow">
              <div className="name">Announcement banner</div>
              <span className="meta">{settings.announcement_enabled ? `On · “${settings.announcement_text}”` : "Off"}</span>
            </div>
            <Link className="btn btn-small" to="/settings/banner">Manage</Link>
          </li>
        </ul>
      </section>
    </>
  );
}

function Metric({ label, value, hint, to, primary, tone }: { label: string; value: number | string; hint: string; to: string; primary?: boolean; tone?: "warn" | "bad" }) {
  return (
    <Link to={to} className={`metric ${primary ? "primary" : ""} ${tone ?? ""}`}>
      <span className="label">{label}</span>
      <span className="go" aria-hidden="true"><ArrowUpRight size={14} /></span>
      <span className="value">{value}</span>
      <span className="hint">{hint}</span>
    </Link>
  );
}

function Empty({ text, cta, to }: { text: string; cta: string; to: string }) {
  return (
    <div className="empty">
      <h3>{text}</h3>
      <Link className="btn btn-primary" to={to}>{cta}</Link>
    </div>
  );
}
