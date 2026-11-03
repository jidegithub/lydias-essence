import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { fetchSettings, toFriendlyError, updateSettingsColumns } from "@lydias-essence/supabase";
import { useToast } from "@lydias-essence/ui";
import { resolveSiteContent, validateAnnouncement } from "@lydias-essence/utils";
import { ErrorState, Field, Loading, PageHead, Switch, describe } from "../components/ui";
import { useClient } from "../lib/auth";
import { useResource } from "../lib/useResource";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";

export function AnnouncementPage() {
  const client = useClient();
  const { data, error, loading, reload } = useResource(() => fetchSettings(client), []);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Editor initial={{ enabled: data.announcement_enabled, text: data.announcement_text }} topBanner={resolveSiteContent(data.content).topBanner} />;
}

function Editor({ initial, topBanner }: { initial: { enabled: boolean; text: string }; topBanner: { leftText: string; rightText: string } }) {
  const client = useClient();
  const toast = useToast();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [text, setText] = useState(initial.text);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = enabled !== saved.enabled || text !== saved.text;
  useUnsavedGuard(dirty);

  async function save() {
    if (saving) return;
    const problem = validateAnnouncement(enabled, text);
    setError(problem);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const row = await updateSettingsColumns(client, { announcement_enabled: enabled, announcement_text: text.trim() });
      setSaved({ enabled: row.announcement_enabled, text: row.announcement_text });
      setText(row.announcement_text);
      toast.success("Announcement banner updated.");
    } catch (err) {
      toast.error(toFriendlyError(err, "The banner couldn’t be saved.").message);
    } finally {
      setSaving(false);
    }
  }

  const shown = text.trim() || "Your announcement will appear here";
  return (
    <>
      <PageHead
        title="Announcement"
        emphasis="banner"
        subtitle="A slim scrolling message shown just below the green banner at the top of your shop — perfect for sales, delivery news or holidays."
      />
      <section className="card">
        <Switch checked={enabled} onChange={(v) => { setEnabled(v); setError(null); }} label="Show the announcement banner" description="Turn off to hide it from the shop. Your text is kept." />
        <div style={{ marginTop: 8 }}>
          <Field label="Announcement text" htmlFor="announcement" error={error ?? undefined} help="Keep it short and friendly. It scrolls from right to left.">
            <textarea {...describe("announcement", error ?? undefined, "x")} className="textarea" style={{ minHeight: 84 }} value={text} maxLength={240} onChange={(e) => { setText(e.target.value); setError(null); }} placeholder="e.g. Free delivery on orders over ₦30,000 this weekend" />
          </Field>
          <div className="char-count" aria-live="off">{text.length}/240</div>
        </div>
      </section>

      <section className="card tinted" aria-labelledby="bp-h">
        <div className="card-head"><div><h2 id="bp-h">Preview</h2><p className="card-sub">Shown exactly under your existing green banner.</p></div></div>
        <div className="banner-green"><span>{topBanner.leftText}</span><span aria-hidden="true">✳</span><span>{topBanner.rightText}</span></div>
        {enabled ? (
          <div className="banner-preview" aria-label="Announcement preview">
            <div className="track">
              {Array.from({ length: 8 }, (_, i) => <span className="item" key={i}>{shown} <span style={{ opacity: 0.5, marginLeft: 22 }}>✳</span></span>)}
            </div>
          </div>
        ) : (
          <div className="banner-preview off">Banner is off — shoppers won’t see it</div>
        )}
        <p className="help" style={{ marginTop: 10 }}>On phones and for visitors who prefer reduced motion, the message stays still instead of scrolling.</p>
      </section>

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
