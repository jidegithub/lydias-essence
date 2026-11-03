import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { fetchSettings, removeSiteImageIfOurs, toFriendlyError, updateSettingsColumns, uploadSiteImage } from "@lydias-essence/supabase";
import type { SiteSettings } from "@lydias-essence/types";
import { useToast } from "@lydias-essence/ui";
import { isHttpsUrl, isValidEmail, isValidWhatsappNumber, normalizePhoneDigits, parseWholeNumber } from "@lydias-essence/utils";
import { ImageField, emptyStaged, isStagedDirty, type StagedImage } from "../components/ImageField";
import { ErrorState, Field, Loading, PageHead, Switch, describe } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

export function BrandPage() {
  const client = useClient();
  const { data, error, loading, reload } = useResource(() => fetchSettings(client), []);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Editor initial={data} />;
}

interface Values {
  store_name: string;
  whatsapp_number: string;
  contact_email: string;
  contact_phone: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  low_stock_threshold: string;
  show_discount_badge: boolean;
}
const pick = (s: SiteSettings): Values => ({
  store_name: s.store_name,
  whatsapp_number: s.whatsapp_number,
  contact_email: s.contact_email,
  contact_phone: s.contact_phone,
  instagram_url: s.instagram_url,
  facebook_url: s.facebook_url,
  tiktok_url: s.tiktok_url,
  low_stock_threshold: String(s.low_stock_threshold),
  show_discount_badge: s.show_discount_badge
});

function Editor({ initial }: { initial: SiteSettings }) {
  const client = useClient();
  const toast = useToast();
  const [saved, setSaved] = useState<SiteSettings>(initial);
  const [v, setV] = useState<Values>(pick(initial));
  const [logo, setLogo] = useState<StagedImage>(emptyStaged(initial.logo_url));
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(v) !== JSON.stringify(pick(saved)) || isStagedDirty(logo);
  useUnsavedGuard(dirty);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate() {
    const e: Partial<Record<keyof Values, string>> = {};
    if (v.store_name.trim().length < 2) e.store_name = "Enter your shop’s name.";
    if (v.whatsapp_number.trim() && !isValidWhatsappNumber(v.whatsapp_number)) e.whatsapp_number = "Enter the number with country code, digits only (8–15 digits), e.g. 2348012345678.";
    if (v.contact_email.trim() && !isValidEmail(v.contact_email.trim())) e.contact_email = "That doesn’t look like an email address.";
    for (const k of ["instagram_url", "facebook_url", "tiktok_url"] as const) {
      if (v[k].trim() && !isHttps(v[k].trim())) e[k] = "Enter the full link, starting with https://";
    }
    const t = parseWholeNumber(v.low_stock_threshold);
    if (t === null || Number.isNaN(t) || t < 0 || t > 10000) e.low_stock_threshold = "Enter a whole number, 0 or more.";
    return e;
  }

  async function save() {
    if (saving) return;
    const e = validate();
    setErrors(e);
    const n = Object.keys(e).length;
    if (n) return toast.error(`Please fix ${n} thing${n === 1 ? "" : "s"} — they’re marked in red.`);
    setSaving(true);
    try {
      let logo_url = logo.removed ? null : logo.url;
      if (logo.file) logo_url = await uploadSiteImage(client, logo.file);
      const row = await updateSettingsColumns(client, {
        store_name: v.store_name.trim(),
        logo_url,
        whatsapp_number: normalizePhoneDigits(v.whatsapp_number),
        contact_email: v.contact_email.trim(),
        contact_phone: v.contact_phone.trim(),
        instagram_url: v.instagram_url.trim(),
        facebook_url: v.facebook_url.trim(),
        tiktok_url: v.tiktok_url.trim(),
        low_stock_threshold: parseWholeNumber(v.low_stock_threshold) as number,
        show_discount_badge: v.show_discount_badge
      });
      if (saved.logo_url && saved.logo_url !== row.logo_url) await removeSiteImageIfOurs(client, saved.logo_url);
      setSaved(row);
      setV(pick(row));
      setLogo(emptyStaged(row.logo_url));
      toast.success("Brand and contact details saved.");
    } catch (err) {
      toast.error(toFriendlyError(err, "Your settings couldn’t be saved.").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead title="Brand &" emphasis="contact" subtitle="Your shop’s name, logo and the ways customers can reach you." />

      <section className="card" aria-labelledby="b1">
        <div className="card-head"><div><h2 id="b1">Shop identity</h2></div></div>
        <Field label="Shop name" htmlFor="store_name" error={errors.store_name}>
          <input {...describe("store_name", errors.store_name)} className="input" value={v.store_name} maxLength={60} onChange={(e) => set("store_name", e.target.value)} />
        </Field>
        <div style={{ marginTop: 16 }}>
          <ImageField label="Logo" value={logo} onChange={setLogo} logo help="Optional. A wide logo on a plain or transparent background works best. If empty, your shop name is shown as text." />
        </div>
      </section>

      <section className="card" aria-labelledby="b2">
        <div className="card-head"><div><h2 id="b2">Contact</h2><p className="card-sub">The WhatsApp number powers the “Chat with us” button on your shop.</p></div></div>
        <div className="field-grid">
          <Field label="WhatsApp number" htmlFor="whatsapp_number" error={errors.whatsapp_number} help="Country code first, no + or spaces. Nigeria example: 2348012345678">
            <input {...describe("whatsapp_number", errors.whatsapp_number, "x")} className="input" inputMode="tel" value={v.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} />
          </Field>
          <Field label="Phone (shown to customers)" htmlFor="contact_phone" error={errors.contact_phone}>
            <input {...describe("contact_phone", errors.contact_phone)} className="input" inputMode="tel" value={v.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Customer email" htmlFor="contact_email" error={errors.contact_email}>
          <input {...describe("contact_email", errors.contact_email)} className="input" type="email" value={v.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </Field>
      </section>

      <section className="card" aria-labelledby="b3">
        <div className="card-head"><div><h2 id="b3">Social media</h2><p className="card-sub">Links appear in the shop’s footer. Leave blank to hide one.</p></div></div>
        <Field label="Instagram" htmlFor="instagram_url" error={errors.instagram_url}>
          <input {...describe("instagram_url", errors.instagram_url)} className="input" inputMode="url" placeholder="https://instagram.com/yourshop" value={v.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
        </Field>
        <Field label="Facebook" htmlFor="facebook_url" error={errors.facebook_url}>
          <input {...describe("facebook_url", errors.facebook_url)} className="input" inputMode="url" placeholder="https://facebook.com/yourshop" value={v.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} />
        </Field>
        <Field label="TikTok" htmlFor="tiktok_url" error={errors.tiktok_url}>
          <input {...describe("tiktok_url", errors.tiktok_url)} className="input" inputMode="url" placeholder="https://tiktok.com/@yourshop" value={v.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} />
        </Field>
      </section>

      <section className="card" aria-labelledby="b4">
        <div className="card-head"><div><h2 id="b4">Prices &amp; stock</h2></div></div>
        <Switch checked={v.show_discount_badge} onChange={(x) => set("show_discount_badge", x)} label="Show “Special price” labels and crossed-out prices" description="When off, discounted products still sell at the sale price, but the shop doesn’t highlight the discount." />
        <div style={{ maxWidth: 260, marginTop: 8 }}>
          <Field label="Default low-stock warning" htmlFor="low_stock_threshold" error={errors.low_stock_threshold} help="Pre-filled for new products.">
            <input {...describe("low_stock_threshold", errors.low_stock_threshold, "x")} className="input" inputMode="numeric" value={v.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="savebar" role="region" aria-label="Save">
        <span className={`status ${dirty ? "dirty" : ""}`} role="status">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save changes
          </button>
        </div>
      </div>
    </>
  );
}

const isHttps = (s: string) => isHttpsUrl(s);
