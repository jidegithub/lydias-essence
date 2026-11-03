import type { MediaKind, ProductMedia } from "@lydias-essence/types";
import { extensionForType } from "@lydias-essence/utils";
import type { SupabaseClient } from "./client";
import { FriendlyError, toFriendlyError } from "./errors";

export const PRODUCT_BUCKET = "product-images";
export const SITE_BUCKET = "site-media";

const MEDIA_COLUMNS = "id, product_id, kind, storage_path, public_url, alt_text, sort_order, is_primary, mime_type, size_bytes, created_at";

export async function listProductMedia(client: SupabaseClient, productId: string): Promise<ProductMedia[]> {
  const { data, error } = await client
    .from("product_media")
    .select(MEDIA_COLUMNS)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw toFriendlyError(error, "We couldn’t load this product’s images.");
  return (data ?? []) as ProductMedia[];
}

export async function listFrames360(client: SupabaseClient, productId: string): Promise<string[]> {
  const { data, error } = await client
    .from("product_media")
    .select("public_url, sort_order")
    .eq("product_id", productId)
    .eq("kind", "frame_360")
    .order("sort_order", { ascending: true });
  if (error) throw toFriendlyError(error);
  return (data ?? []).map((r: { public_url: string }) => r.public_url);
}

export function publicUrlFor(client: SupabaseClient, bucket: string, path: string): string {
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function newObjectPath(folder: string, file: { type: string }): string {
  return `${folder}/${crypto.randomUUID()}.${extensionForType(file.type)}`;
}

/** Uploads one file; never overwrites (upsert: false). */
export async function uploadFile(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const { error } = await client.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "31536000"
  });
  if (error) throw toFriendlyError(error, `“${file.name}” couldn’t be uploaded.`);
  return { path, publicUrl: publicUrlFor(client, bucket, path) };
}

export interface NewMediaRow {
  product_id: string;
  kind: MediaKind;
  storage_path: string | null;
  public_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary?: boolean;
  mime_type?: string | null;
  size_bytes?: number | null;
}

export async function insertMediaRow(client: SupabaseClient, row: NewMediaRow): Promise<ProductMedia> {
  const { data, error } = await client
    .from("product_media")
    .insert({ alt_text: "", is_primary: false, ...row })
    .select(MEDIA_COLUMNS)
    .single();
  if (error) throw toFriendlyError(error, "The image was uploaded but couldn’t be linked to the product.");
  return data as ProductMedia;
}

/** Removes a storage object only when no media row still points at it. */
export async function removeStorageIfUnreferenced(client: SupabaseClient, bucket: string, path: string | null): Promise<boolean> {
  if (!path) return false;
  const { count, error } = await client.from("product_media").select("id", { count: "exact", head: true }).eq("storage_path", path);
  if (error) return false;
  if ((count ?? 0) > 0) return false;
  const { error: rmError } = await client.storage.from(bucket).remove([path]);
  return !rmError;
}

export async function deleteMediaRows(client: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await client.from("product_media").delete().in("id", ids);
  if (error) throw toFriendlyError(error, "The image couldn’t be removed.");
}

/**
 * Persists order and primary image for rows that already exist.
 * Done in phases because only one image per product may be primary.
 */
export async function applyMediaOrder(
  client: SupabaseClient,
  productId: string,
  images: string[],
  primaryId: string | null,
  frames: string[]
): Promise<void> {
  const clear = await client.from("product_media").update({ is_primary: false }).eq("product_id", productId).eq("is_primary", true);
  if (clear.error) throw toFriendlyError(clear.error, "The image order couldn’t be saved.");

  const updates = [
    ...images.map((id, i) => client.from("product_media").update({ sort_order: i }).eq("id", id)),
    ...frames.map((id, i) => client.from("product_media").update({ sort_order: i }).eq("id", id))
  ];
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw toFriendlyError(failed.error, "The image order couldn’t be saved.");

  const target = primaryId ?? images[0] ?? null;
  if (target) {
    const { error } = await client.from("product_media").update({ is_primary: true }).eq("id", target);
    if (error) throw toFriendlyError(error, "The main image couldn’t be saved.");
  }
}

/**
 * Gives a duplicated product its own copies of every stored file so that deleting
 * or replacing media on one product can never affect the other.
 */
export async function duplicateMedia(client: SupabaseClient, sourceProductId: string, newProductId: string): Promise<void> {
  const source = await listProductMedia(client, sourceProductId);
  const copiedPaths: string[] = [];
  try {
    for (const m of source) {
      let storagePath: string | null = null;
      let publicUrl = m.public_url;
      if (m.storage_path) {
        const ext = m.storage_path.split(".").pop() ?? "jpg";
        storagePath = `${newProductId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await client.storage.from(PRODUCT_BUCKET).copy(m.storage_path, storagePath);
        if (error) throw toFriendlyError(error, "The images couldn’t be copied.");
        copiedPaths.push(storagePath);
        publicUrl = publicUrlFor(client, PRODUCT_BUCKET, storagePath);
      }
      await insertMediaRow(client, {
        product_id: newProductId,
        kind: m.kind,
        storage_path: storagePath,
        public_url: publicUrl,
        alt_text: m.alt_text,
        sort_order: m.sort_order,
        is_primary: m.is_primary,
        mime_type: m.mime_type,
        size_bytes: m.size_bytes
      });
    }
  } catch (err) {
    if (copiedPaths.length) await client.storage.from(PRODUCT_BUCKET).remove(copiedPaths);
    throw err instanceof FriendlyError ? err : toFriendlyError(err);
  }
}
