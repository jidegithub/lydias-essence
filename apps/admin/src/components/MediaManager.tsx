import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import type { MediaKind } from "@lydias-essence/types";
import { useConfirm, useToast } from "@lydias-essence/ui";
import { MAX_SOURCE_IMAGE_BYTES, formatBytes, naturalCompare, validateImageFile } from "@lydias-essence/utils";
import { prepareImages, savingsMessage } from "../lib/compressImage";
import { fromFile, move, type MediaItem } from "../lib/mediaItems";

interface Props {
  kind: MediaKind;
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  /** Called when a saved item is removed, so the editor can delete it on save. */
  onRemoveSaved: (item: MediaItem) => void;
  max: number;
  disabled?: boolean;
  uploadingKeys?: Set<string>;
}

export function MediaManager({ kind, items, onChange, onRemoveSaved, max, disabled, uploadingKeys }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);
  const isImage = kind === "image";

  async function accept(fileList: FileList | File[]) {
    if (preparing) return;
    let files = Array.from(fileList);
    const problems: string[] = [];
    files = files.filter((f) => {
      const p = validateImageFile(f, MAX_SOURCE_IMAGE_BYTES);
      if (p) problems.push(p);
      return !p;
    });
    if (!isImage) files.sort((a, b) => naturalCompare(a.name, b.name));
    const room = max - items.length;
    if (files.length > room) {
      problems.push(`You can add up to ${max} ${isImage ? "images" : "frames"} — ${files.length - Math.max(room, 0)} weren’t added.`);
      files = files.slice(0, Math.max(room, 0));
    }
    if (files.length > 0) {
      setPreparing({ done: 0, total: files.length });
      const prepared = await prepareImages(files, (done, total) => setPreparing({ done, total }));
      setPreparing(null);
      problems.push(...prepared.problems);
      const saved = savingsMessage(prepared.before, prepared.after, prepared.ready.length);
      if (saved) toast.info(saved);
      if (prepared.ready.length > 0) {
        const next = [...items, ...prepared.ready.map((r) => fromFile(r.file))];
        if (isImage && !next.some((i) => i.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
        onChange(next);
      }
    }
    if (problems.length) toast.error(problems.slice(0, 3).join(" "));
  }

  function setPrimary(key: string) {
    onChange(items.map((i) => ({ ...i, isPrimary: i.key === key })));
  }

  async function replace(file: File | undefined) {
    const key = replaceKey;
    setReplaceKey(null);
    if (!file || !key || preparing) return;
    setPreparing({ done: 0, total: 1 });
    const prepared = await prepareImages([file]);
    setPreparing(null);
    const fresh0 = prepared.ready[0];
    if (!fresh0) return void toast.error(prepared.problems[0] ?? "That photo couldn’t be used.");
    const old = items.find((i) => i.key === key);
    if (!old) return;
    if (old.id) onRemoveSaved(old);
    else if (old.file) URL.revokeObjectURL(old.previewUrl);
    const fresh = { ...fromFile(fresh0.file), isPrimary: old.isPrimary };
    onChange(items.map((i) => (i.key === key ? fresh : i)));
  }

  async function remove(item: MediaItem) {
    const doRemove = () => {
      if (item.id) onRemoveSaved(item);
      else URL.revokeObjectURL(item.previewUrl);
      const next = items.filter((i) => i.key !== item.key);
      if (isImage && item.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true };
      onChange(next);
    };
    if (!item.id) return doRemove(); // not saved yet: nothing to lose
    await confirm({
      title: isImage ? "Remove this image?" : "Remove this frame?",
      message: "It will be deleted from the product when you save your changes.",
      confirmLabel: "Remove",
      tone: "danger",
      run: async () => doRemove()
    });
  }

  const noun = isImage ? "image" : "frame";

  return (
    <div>
      <input ref={addInput} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => { if (e.target.files) void accept(e.target.files); e.target.value = ""; }} />
      <input ref={replaceInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => { void replace(e.target.files?.[0]); e.target.value = ""; }} />

      <button
        type="button"
        className={`dropzone ${over ? "over" : ""}`}
        style={{ width: "100%" }}
        disabled={disabled || !!preparing || items.length >= max}
        onClick={() => addInput.current?.click()}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          if (e.dataTransfer.files.length) { e.preventDefault(); void accept(e.dataTransfer.files); }
        }}
      >
        <ImagePlus size={22} aria-hidden="true" />
        <strong>{isImage ? "Add product images" : "Add 360° frames"}</strong>
        <span>
          Click to choose or drop files here · JPG, PNG, WebP or AVIF · big photos are shrunk automatically
          {!isImage && " · name them in order (frame-01, frame-02…)"}
        </span>
      </button>

      {preparing && (
        <div className="notice" role="status" style={{ marginTop: 12 }}>
          <Loader2 size={16} className="spin" aria-hidden="true" /> Optimising photos so your shop loads fast… {Math.min(preparing.done + 1, preparing.total)} of {preparing.total}
        </div>
      )}

      {items.length === 0 ? (
        <p className="help" style={{ marginTop: 12 }}>
          {isImage ? "No images yet. The first image you add becomes the main image." : "No 360° frames yet. This is optional — add at least 8 frames, taken evenly around the product."}
        </p>
      ) : (
        <>
          <p className="help" style={{ marginTop: 12 }}>
            {items.length} {noun}{items.length === 1 ? "" : "s"}. Drag to reorder, or use the arrow buttons.
            {isImage ? " The starred image is the main one shoppers see first." : ""}
          </p>
          <ul className="media-grid" style={{ listStyle: "none", padding: 0 }}>
            {items.map((item, index) => {
              const uploading = uploadingKeys?.has(item.key);
              return (
                <li
                  key={item.key}
                  className={`media-item ${item.isPrimary && isImage ? "primary" : ""} ${item.error ? "failed" : ""} ${dragFrom === index ? "dragging" : ""}`}
                  draggable={!disabled}
                  onDragStart={(e) => { setDragFrom(index); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.key); }}
                  onDragOver={(e) => { if (dragFrom !== null) e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) onChange(move(items, dragFrom, index));
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                >
                  <div className="media-thumb">
                    <img src={item.previewUrl} alt={`${isImage ? "Image" : "Frame"} ${index + 1}${item.isPrimary && isImage ? " (main image)" : ""}`} draggable={false} />
                    {isImage && item.isPrimary && <span className="pill ok media-badge">Main</span>}
                    {!isImage && <span className="pill media-badge">{index + 1}</span>}
                    {item.file && <span className="pill rose media-new">New</span>}
                    {uploading && <div className="media-progress" role="progressbar" aria-label="Uploading"><span style={{ width: "60%" }} /></div>}
                  </div>
                  <div className="media-meta">
                    {item.size ? formatBytes(item.size) : "Saved"}
                    {item.error && <div className="err">{item.error}</div>}
                  </div>
                  <div className="media-actions">
                    {isImage && !item.isPrimary && (
                      <button type="button" className="btn btn-icon" onClick={() => setPrimary(item.key)} disabled={disabled || !!preparing} aria-label={`Make image ${index + 1} the main image`} title="Make main image"><Star size={14} /></button>
                    )}
                    <button type="button" className="btn btn-icon" onClick={() => onChange(move(items, index, index - 1))} disabled={disabled || index === 0} aria-label={`Move ${noun} ${index + 1} earlier`} title="Move earlier"><ArrowLeft size={14} /></button>
                    <button type="button" className="btn btn-icon" onClick={() => onChange(move(items, index, index + 1))} disabled={disabled || index === items.length - 1} aria-label={`Move ${noun} ${index + 1} later`} title="Move later"><ArrowRight size={14} /></button>
                    <button type="button" className="btn btn-icon" onClick={() => { setReplaceKey(item.key); replaceInput.current?.click(); }} disabled={disabled || !!preparing} aria-label={`Replace ${noun} ${index + 1}`} title="Replace"><RefreshCw size={14} /></button>
                    <button type="button" className="btn btn-icon btn-danger" onClick={() => void remove(item)} disabled={disabled || !!preparing} aria-label={`Remove ${noun} ${index + 1}`} title="Remove"><Trash2 size={14} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
