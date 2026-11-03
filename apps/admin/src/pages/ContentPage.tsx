import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import { fetchSettings, mergeSiteContent, removeSiteImageIfOurs, toFriendlyError, uploadSiteImage } from "@lydias-essence/supabase";
import type { SiteContent, SiteSettings } from "@lydias-essence/types";
import { useToast } from "@lydias-essence/ui";
import { DEFAULT_SITE_CONTENT, resolveSiteContent } from "@lydias-essence/utils";
import { ImageField, emptyStaged, isStagedDirty, type StagedImage } from "../components/ImageField";
import { ErrorState, Field, Loading, PageHead, describe } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

type Sec = Exclude<keyof SiteContent, "trustStrip">;
interface FieldDef { key: string; label: string; long?: boolean; help?: string }
interface SectionDef { id: Sec | "trustStrip"; title: string; blurb: string; fields: FieldDef[]; image?: { key: "imageUrl"; label: string } }

const SECTIONS: SectionDef[] = [
  { id: "topBanner", title: "Top green banner", blurb: "The slim green bar at the very top of the shop.", fields: [
    { key: "leftText", label: "Left message" }, { key: "rightText", label: "Right message" } ] },
  { id: "hero", title: "Homepage hero", blurb: "The first thing visitors see.", image: { key: "imageUrl", label: "Hero image" }, fields: [
    { key: "eyebrow", label: "Small heading above" },
    { key: "headingLine1", label: "Heading — first line" },
    { key: "headingLine2", label: "Heading — second line (shown in italics)" },
    { key: "description", label: "Supporting text", long: true },
    { key: "buttonLabel", label: "Main button label" },
    { key: "secondaryLabel", label: "Second link label" },
    { key: "note", label: "Small note under the buttons" },
    { key: "floatingNote", label: "Label on the hero image" } ] },
  { id: "collection", title: "Product collection heading", blurb: "The heading above your product grid.", fields: [
    { key: "eyebrow", label: "Small heading above" },
    { key: "headingLead", label: "Heading — plain part" },
    { key: "headingEmphasis", label: "Heading — italic part" },
    { key: "description", label: "Supporting text" } ] },
  { id: "beautyRules", title: "“Your Beauty, Your Rules” section", blurb: "Its wording and image. Choose its products under Storefront → Your Beauty, Your Rules.", image: { key: "imageUrl", label: "Section image" }, fields: [
    { key: "eyebrow", label: "Small heading above" },
    { key: "headingLine1", label: "Heading — first line" },
    { key: "headingLine2", label: "Heading — second line (italic)" },
    { key: "paragraph1", label: "First paragraph", long: true },
    { key: "paragraph2", label: "Second paragraph", long: true },
    { key: "linkLabel", label: "Link label" },
    { key: "signature", label: "Sign-off line" },
    { key: "imageLabel", label: "Label on the image" } ] },
  { id: "nextFavourite", title: "“Your Next Favourite” section", blurb: "Its wording. Choose its four products under Storefront → Your Next Favourite.", fields: [
    { key: "eyebrow", label: "Small heading above" },
    { key: "headingLead", label: "Heading — plain part" },
    { key: "headingEmphasis", label: "Heading — italic part" },
    { key: "linkLabel", label: "Link label" } ] },
  { id: "contactBanner", title: "“Need help?” banner", blurb: "The green banner with the WhatsApp button.", fields: [
    { key: "eyebrow", label: "Small heading above" },
    { key: "headingLine1", label: "Heading — first line" },
    { key: "headingLine2", label: "Heading — second line (italic)" },
    { key: "description", label: "Supporting text", long: true },
    { key: "buttonLabel", label: "Button label" } ] },
  { id: "footer", title: "Footer", blurb: "Text at the bottom of every page.", fields: [
    { key: "tagline", label: "Tagline", long: true, help: "Press Enter for a new line." },
    { key: "bottomCenter", label: "Centre note" },
    { key: "bottomRight", label: "Right note" } ] },
  { id: "trustStrip", title: "Trust strip", blurb: "The three short phrases under the hero.", fields: [
    { key: "0", label: "First phrase" }, { key: "1", label: "Second phrase" }, { key: "2", label: "Third phrase" } ] }
];

export function ContentPage() {
  const client = useClient();
  const { data, error, loading, reload } = useResource(() => fetchSettings(client), []);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Editor initial={data} />;
}

const getVal = (c: SiteContent, sec: SectionDef["id"], key: string): string =>
  sec === "trustStrip" ? c.trustStrip[Number(key)]! : ((c[sec] as unknown as Record<string, string>)[key] ?? "");

function Editor({ initial }: { initial: SiteSettings }) {
  const client = useClient();
  const toast = useToast();
  const [savedSettings, setSavedSettings] = useState(initial);
  const savedContent = resolveSiteContent(savedSettings.content);
  const [c, setC] = useState<SiteContent>(savedContent);
  const [images, setImages] = useState<Record<"hero" | "beautyRules", StagedImage>>({
    hero: emptyStaged(initial.content.hero?.imageUrl || null),
    beautyRules: emptyStaged(initial.content.beautyRules?.imageUrl || null)
  });
  const [open, setOpen] = useState<string>("hero");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(c) !== JSON.stringify(savedContent) || isStagedDirty(images.hero) || isStagedDirty(images.beautyRules);
  useUnsavedGuard(dirty);

  function setField(sec: SectionDef["id"], key: string, value: string) {
    setC((cur) => {
      if (sec === "trustStrip") {
        const t = [...cur.trustStrip] as SiteContent["trustStrip"];
        t[Number(key)] = value;
        return { ...cur, trustStrip: t };
      }
      return { ...cur, [sec]: { ...(cur[sec] as object), [key]: value } } as SiteContent;
    });
    setErrors((e) => ({ ...e, [`${sec}.${key}`]: "" }));
  }

  async function save() {
    if (saving) return;
    const e: Record<string, string> = {};
    let firstSection: string | null = null;
    for (const s of SECTIONS) {
      for (const f of s.fields) {
        const val = getVal(c, s.id, f.key).trim();
        if (!val) e[`${s.id}.${f.key}`] = "This can’t be left blank — it would leave a gap on your shop.";
        else if (val.length > (f.long ? 600 : 120)) e[`${s.id}.${f.key}`] = `Please keep this under ${f.long ? 600 : 120} characters.`;
        if (e[`${s.id}.${f.key}`] && !firstSection) firstSection = s.id;
      }
    }
    setErrors(e);
    if (firstSection) {
      setOpen(firstSection);
      const n = Object.keys(e).length;
      return toast.error(`Please fix ${n} thing${n === 1 ? "" : "s"} — they’re marked in red.`);
    }

    setSaving(true);
    try {
      const patch = JSON.parse(JSON.stringify(c)) as Record<string, Record<string, unknown>>;
      // On/off switches belong to the Storefront pages and are saved there, never here.
      delete patch.beautyRules!.enabled;
      delete patch.nextFavourite!.enabled;

      const oldUrls: (string | null | undefined)[] = [];
      for (const key of ["hero", "beautyRules"] as const) {
        const st = images[key];
        const prev = savedSettings.content[key]?.imageUrl || null;
        if (st.file) {
          patch[key]!.imageUrl = await uploadSiteImage(client, st.file);
          oldUrls.push(prev);
        } else if (st.removed) {
          patch[key]!.imageUrl = "";
          oldUrls.push(prev);
        } else {
          patch[key]!.imageUrl = prev ?? "";
        }
      }
      const row = await mergeSiteContent(client, patch as never);
      for (const u of oldUrls) await removeSiteImageIfOurs(client, u);
      setSavedSettings(row);
      const fresh = resolveSiteContent(row.content);
      setC(fresh);
      setImages({ hero: emptyStaged(row.content.hero?.imageUrl || null), beautyRules: emptyStaged(row.content.beautyRules?.imageUrl || null) });
      toast.success("Changes published.");
    } catch (err) {
      toast.error(toFriendlyError(err, "Your changes couldn’t be saved.").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead title="Website" emphasis="content" subtitle="Edit the words and pictures on your homepage. Changes go live as soon as you save — no developer needed." />

      {SECTIONS.map((s) => {
        const isOpen = open === s.id;
        const sectionErrors = s.fields.some((f) => errors[`${s.id}.${f.key}`]);
        return (
          <div className="accordion" key={s.id}>
            <button type="button" aria-expanded={isOpen} aria-controls={`panel-${s.id}`} onClick={() => setOpen(isOpen ? "" : s.id)}>
              <div>
                <strong>{s.title} {sectionErrors && <span className="pill bad" style={{ marginLeft: 6 }}>Needs attention</span>}</strong>
                <span>{s.blurb}</span>
              </div>
              {isOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </button>
            {isOpen && (
              <div className="accordion-body" id={`panel-${s.id}`}>
                {s.id === "hero" && (
                  <div className="hero-preview" style={{ margin: "16px 0" }} aria-label="Hero preview">
                    <div className="eyebrow">{c.hero.eyebrow}</div>
                    <h3>{c.hero.headingLine1}<br /><em>{c.hero.headingLine2}</em></h3>
                    <p>{c.hero.description}</p>
                    <span className="fake-btn">{c.hero.buttonLabel}</span>
                  </div>
                )}
                {s.id === "beautyRules" && (
                  <div className="hero-preview" style={{ margin: "16px 0" }} aria-label="Section preview">
                    <div className="eyebrow">{c.beautyRules.eyebrow}</div>
                    <h3>{c.beautyRules.headingLine1}<br /><em>{c.beautyRules.headingLine2}</em></h3>
                    <p>{c.beautyRules.paragraph1}</p>
                  </div>
                )}
                {s.fields.map((f) => {
                  const id = `${s.id}-${f.key}`;
                  const err = errors[`${s.id}.${f.key}`] || undefined;
                  const val = getVal(c, s.id, f.key);
                  return (
                    <Field key={id} label={f.label} htmlFor={id} error={err} help={f.help}>
                      {f.long ? (
                        <textarea {...describe(id, err, f.help)} className="textarea" style={{ minHeight: 84 }} value={val} onChange={(e) => setField(s.id, f.key, e.target.value)} />
                      ) : (
                        <input {...describe(id, err, f.help)} className="input" value={val} onChange={(e) => setField(s.id, f.key, e.target.value)} />
                      )}
                    </Field>
                  );
                })}
                {s.image && (s.id === "hero" || s.id === "beautyRules") && (
                  <div style={{ marginTop: 18 }}>
                    <ImageField
                      label={s.image.label}
                      value={images[s.id]}
                      onChange={(next) => setImages((cur) => ({ ...cur, [s.id]: next }))}
                      defaultUrl={DEFAULT_SITE_CONTENT[s.id].imageUrl}
                      help="JPG, PNG, WebP or AVIF, up to 5 MB. If you remove it, the original image returns."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="savebar" role="region" aria-label="Save">
        <span className={`status ${dirty ? "dirty" : ""}`} role="status">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save &amp; publish
          </button>
        </div>
      </div>
    </>
  );
}
