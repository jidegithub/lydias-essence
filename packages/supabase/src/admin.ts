import type { SupabaseClient } from "./client";

/** Asks the database whether the signed-in user is on the administrator allow-list. */
export async function checkIsAdmin(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_admin");
  if (error) return false;
  return data === true;
}
