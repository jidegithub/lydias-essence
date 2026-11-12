export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // what is STORED; keep in sync with the storage bucket limit
/** What an owner may pick from their phone/camera: it is shrunk in the browser before upload. */
export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
/** Longest side of a stored product photo, in pixels (never enlarged). */
export const MAX_IMAGE_EDGE = 1600;
export const WEBP_QUALITY = 0.82;
/** Photos already this light are left exactly as they are (no needless quality loss). */
export const SKIP_COMPRESS_BELOW_BYTES = 150 * 1024;
export const MIN_360_FRAMES = 8;
export const MAX_360_FRAMES = 72;
export const MAX_PRODUCT_IMAGES = 12;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

export function extensionForType(type: string): string {
  return EXT_BY_TYPE[type] ?? "bin";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Scales (width, height) down so the longest side is at most maxEdge. Never scales up. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** "serum final.JPG" -> "serum final.webp" */
export function replaceExtension(name: string, ext: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base || "image"}.${ext}`;
}

/** Returns a human-readable problem, or null when the file is acceptable. */
export function validateImageFile(
  file: { name: string; type: string; size: number },
  maxBytes: number = MAX_IMAGE_BYTES
): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type) || !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return `“${file.name}” isn’t a supported image. Use JPG, PNG, WebP or AVIF.`;
  }
  if (file.size <= 0) return `“${file.name}” is empty.`;
  if (file.size > maxBytes) {
    return `“${file.name}” is ${formatBytes(file.size)}. Photos must be under ${formatBytes(maxBytes)}.`;
  }
  return null;
}

/** Natural sort so frame-2.jpg comes before frame-10.jpg. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
