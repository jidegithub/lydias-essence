import type { Product } from "@lydias-essence/types";
import type { SupabaseClient } from "./client";
import { FriendlyError, toFriendlyError } from "./errors";
import { PRODUCT_BUCKET, duplicateMedia, listProductMedia, removeStorageIfUnreferenced } from "./media";
import { deleteProductRow, insertProduct, productToWrite } from "./products";

/** Deletes a product, then removes only the stored files that no other product still uses. */
export async function deleteProductAndMedia(client: SupabaseClient, id: string): Promise<void> {
  const media = await listProductMedia(client, id);
  await deleteProductRow(client, id); // media rows cascade
  for (const m of media) await removeStorageIfUnreferenced(client, PRODUCT_BUCKET, m.storage_path);
}

/** Creates an unpublished copy with its own copies of every image. */
export async function duplicateProductFull(client: SupabaseClient, source: Product): Promise<Product> {
  const newId = crypto.randomUUID();
  let created: Product | null = null;
  let slug = `${source.slug}-copy`.slice(0, 80);

  for (let attempt = 0; attempt < 4 && !created; attempt++) {
    try {
      created = await insertProduct(client, newId, {
        ...productToWrite(source),
        name: `${source.name} (copy)`.slice(0, 120),
        slug,
        published: false,
        is_featured: false
      });
    } catch (err) {
      const e = toFriendlyError(err);
      if (e.kind !== "conflict") throw e;
      slug = `${source.slug}-copy-${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
    }
  }
  if (!created) throw new FriendlyError("A copy couldn’t be created. Please try again.", "conflict");

  try {
    await duplicateMedia(client, source.id, newId);
  } catch (err) {
    await deleteProductRow(client, newId).catch(() => undefined);
    throw err;
  }
  return created;
}
