import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  MAX_SOURCE_IMAGE_BYTES,
  SKIP_COMPRESS_BELOW_BYTES,
  WEBP_QUALITY,
  fitWithin,
  formatBytes,
  replaceExtension,
  validateImageFile
} from "@lydias-essence/utils";

/**
 * Shrinks a photo IN THE BROWSER before it is uploaded: longest side <= 1600px, converted to WebP
 * (JPEG on the rare browser that can't encode WebP). Free, no server, and the small file is what
 * travels, is stored, and is later served to shoppers.
 * Photos that are already light are returned untouched.
 */
export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    // Can't be decoded here (corrupt, or a format this browser can't read): keep the original if it is small enough.
    if (file.size <= MAX_IMAGE_BYTES) return file;
    throw new Error(`“${file.name}” couldn’t be read and is too large to upload as it is (${formatBytes(file.size)}). Try saving it as a JPG first.`);
  }

  try {
    const alreadyFits = Math.max(bitmap.width, bitmap.height) <= MAX_IMAGE_EDGE;
    if (alreadyFits && file.size <= SKIP_COMPRESS_BELOW_BYTES) return file;

    // Try the normal settings first; only get stricter if the result is still over the storage limit.
    const attempts: [number, number][] = [
      [MAX_IMAGE_EDGE, WEBP_QUALITY],
      [MAX_IMAGE_EDGE, 0.7],
      [1200, 0.7],
      [1000, 0.6]
    ];
    let best: Blob | null = null;
    for (const [edge, quality] of attempts) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, edge);
      const blob = await encode(bitmap, width, height, quality);
      best = blob;
      if (blob.size <= MAX_IMAGE_BYTES) break;
    }
    if (!best || best.size > MAX_IMAGE_BYTES) {
      throw new Error(`“${file.name}” couldn’t be reduced below ${formatBytes(MAX_IMAGE_BYTES)}. Try a smaller photo.`);
    }
    // Never make a small, already-fitting file bigger.
    if (alreadyFits && best.size >= file.size && file.size <= MAX_IMAGE_BYTES) return file;

    const ext = best.type === "image/webp" ? "webp" : "jpg";
    return new File([best], replaceExtension(file.name, ext), { type: best.type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file); // older browsers without the options argument
  }
}

async function encode(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can’t resize photos.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);

  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return webp;

  // This browser can't encode WebP (it silently returned PNG): use JPEG on a white background.
  const flat = document.createElement("canvas");
  flat.width = width;
  flat.height = height;
  const fctx = flat.getContext("2d");
  if (!fctx) throw new Error("This browser can’t resize photos.");
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, width, height);
  fctx.drawImage(canvas, 0, 0);
  const jpeg = await toBlob(flat, "image/jpeg", Math.max(quality, 0.8));
  if (!jpeg) throw new Error("This browser couldn’t compress the photo.");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export interface PreparedImage {
  /** The file that will be uploaded (usually the smaller WebP). */
  file: File;
  /** What the person picked. */
  original: File;
}

/** Validates then shrinks each photo, one at a time (keeps memory low on phones). Never throws. */
export async function prepareImages(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<{ ready: PreparedImage[]; problems: string[]; before: number; after: number }> {
  const ready: PreparedImage[] = [];
  const problems: string[] = [];
  let before = 0;
  let after = 0;
  for (const [i, original] of files.entries()) {
    onProgress?.(i, files.length);
    const problem = validateImageFile(original, MAX_SOURCE_IMAGE_BYTES);
    if (problem) {
      problems.push(problem);
      continue;
    }
    try {
      const file = await compressImage(original);
      ready.push({ file, original });
      before += original.size;
      after += file.size;
    } catch (err) {
      problems.push(err instanceof Error ? err.message : `“${original.name}” couldn’t be prepared.`);
    }
  }
  onProgress?.(files.length, files.length);
  return { ready, problems, before, after };
}

/** "Photos optimised: 18.4 MB → 612 KB" (only worth showing when it actually saved something). */
export function savingsMessage(before: number, after: number, count: number): string | null {
  if (count === 0 || after >= before * 0.9) return null;
  return `${count === 1 ? "Photo" : "Photos"} optimised: ${formatBytes(before)} → ${formatBytes(after)}.`;
}
