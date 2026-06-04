// Admin moderation: two sources, either grants admin.
//   1. ADMIN_EMAILS env allow-list (comma-separated), e.g.
//      ADMIN_EMAILS=alice@cofoundee.co,bob@cofoundee.co
//   2. profiles.is_admin DB flag — set per-user without a redeploy.

import type { SupabaseClient } from "@supabase/supabase-js";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

// Sync check when the caller already has the profile's is_admin flag.
export function isAdmin(opts: {
  email?: string | null;
  isAdminFlag?: boolean | null;
}): boolean {
  return isAdminEmail(opts.email) || !!opts.isAdminFlag;
}

// Async check: env allow-list first, else look up profiles.is_admin.
export async function isAdminUser(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null } | null | undefined,
): Promise<boolean> {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return !!data?.is_admin;
}
