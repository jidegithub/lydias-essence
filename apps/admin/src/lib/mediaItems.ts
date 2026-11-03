import type { ProductMedia } from "@lydias-essence/types";

/** One image/frame in the editor: either already saved (has `id`) or newly chosen (has `file`). */
export interface MediaItem {
  key: string;
  id?: string;
  file?: File;
  previewUrl: string;
  storagePath: string | null;
  mime: string | null;
  size: number | null;
  isPrimary: boolean;
  error?: string;
}

export function fromRow(row: ProductMedia): MediaItem {
  return {
    key: row.id,
    id: row.id,
    previewUrl: row.public_url,
    storagePath: row.storage_path,
    mime: row.mime_type,
    size: row.size_bytes,
    isPrimary: row.is_primary
  };
}

export function fromFile(file: File): MediaItem {
  return {
    key: `new-${crypto.randomUUID()}`,
    file,
    previewUrl: URL.createObjectURL(file),
    storagePath: null,
    mime: file.type,
    size: file.size,
    isPrimary: false
  };
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}
