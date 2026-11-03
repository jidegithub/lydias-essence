import { createBrowserSupabase } from "@lydias-essence/supabase";

/** Public anon key only. What an admin may do is decided by their login + database policies. */
export const supabase = createBrowserSupabase({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
});
