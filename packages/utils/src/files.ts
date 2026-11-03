export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // keep in sync with the storage bucket limit
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

/** Returns a human-readable problem, or null when the file is acceptable. */
export function validateImageFile(file: { name: string; type: string; size: number }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type) || !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return `“${file.name}” isn’t a supported image. Use JPG, PNG, WebP or AVIF.`;
  }
  if (file.size <= 0) return `“${file.name}” is empty.`;
  if (file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. Images must be under ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}

/** Natural sort so frame-2.jpg comes before frame-10.jpg. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
