import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Undo2 } from "lucide-react";
import { useToast } from "@lydias-essence/ui";
import { validateImageFile } from "@lydias-essence/utils";

export interface StagedImage {
  /** URL currently saved (or null). */
  url: string | null;
  /** A newly chosen file waiting to be uploaded on save. */
  file: File | null;
  /** True when the owner chose to remove the saved image. */
  removed: boolean;
}

export const emptyStaged = (url: string | null): StagedImage => ({ url, file: null, removed: false });
export const isStagedDirty = (s: StagedImage) => !!s.file || s.removed;

export function ImageField({
  label,
  value,
  onChange,
  logo,
  defaultUrl,
  help
}: {
  label: string;
  value: StagedImage;
  onChange: (next: StagedImage) => void;
  logo?: boolean;
  /** Shown when nothing is set, e.g. the storefront's built-in image. */
  defaultUrl?: string;
  help?: string;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value.file) return setPreview(null);
    const u = URL.createObjectURL(value.file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [value.file]);

  const shown = preview ?? (value.removed ? null : value.url) ?? defaultUrl ?? null;
  const usingDefault = !preview && !value.url && !!defaultUrl;

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) return toast.error(problem);
    onChange({ ...value, file, removed: false });
  }

  return (
    <div className="field">
      <span className="label-text">{label}</span>
      <div className="image-field">
        <div className={`preview ${logo ? "logo" : ""}`}>{shown ? <img src={shown} alt="" /> : <span>No image</span>}</div>
        <div className="controls">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          <button type="button" className="btn btn-small" onClick={() => input.current?.click()}>
            <ImagePlus size={15} /> {shown && !usingDefault ? "Replace image" : "Choose image"}
          </button>
          {value.file && (
            <button type="button" className="btn btn-small" onClick={() => onChange({ ...value, file: null })}>
              <Undo2 size={15} /> Undo
            </button>
          )}
          {!value.file && value.url && !value.removed && (
            <button type="button" className="btn btn-small btn-danger" onClick={() => onChange({ ...value, removed: true })}>
              <Trash2 size={15} /> {defaultUrl ? "Use default" : "Remove"}
            </button>
          )}
          {value.removed && (
            <button type="button" className="btn btn-small" onClick={() => onChange({ ...value, removed: false })}>
              <Undo2 size={15} /> Keep current
            </button>
          )}
          <span className="help">{help ?? "JPG, PNG, WebP or AVIF, up to 5 MB."}</span>
          {value.file && <span className="help">New image will be uploaded when you save.</span>}
        </div>
      </div>
    </div>
  );
}
