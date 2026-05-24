// Service-role Supabase client — bypasses RLS. NEVER expose to the browser.
// Use only in server actions / route handlers that have already validated
// admin permissions via isAdminEmail() or equivalent.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY — required for admin writes.",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
