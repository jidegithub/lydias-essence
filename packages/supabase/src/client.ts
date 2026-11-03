import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type { SupabaseClient };

export interface SupabaseEnv {
  url?: string;
  anonKey?: string;
}

/**
 * Creates a browser client with the PUBLIC anon key only.
 * Never pass a service-role key here: authority comes from the signed-in user
 * plus Row Level Security, not from the key.
 */
export function createBrowserSupabase(env: SupabaseEnv, options?: { persistSession?: boolean }): SupabaseClient | null {
  if (!env.url || !env.anonKey) return null;
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: options?.persistSession ?? true,
      autoRefreshToken: options?.persistSession ?? true,
      detectSessionInUrl: false
    }
  });
}
