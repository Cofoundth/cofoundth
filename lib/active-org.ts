import { cookies } from "next/headers";
import type { createClient } from "./supabase/server";

export const ACTIVE_ORG_COOKIE = "active_org";

type SBClient = Awaited<ReturnType<typeof createClient>>;

// All orgs the user belongs to, earliest-joined first.
export async function getUserOrgs(
  supabase: SBClient,
  userId: string,
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, joined_at, organizations(id, name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  return (data ?? [])
    .map((r) => {
      const o = r.organizations as unknown as { id: string; name: string } | null;
      return o ? { id: o.id, name: o.name } : null;
    })
    .filter((o): o is { id: string; name: string } => !!o);
}

// The company the user is currently acting as: the one chosen via the
// active_org cookie (if they're still a member), else their earliest-joined.
export async function getActiveOrgId(
  supabase: SBClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  const orgIds = (data ?? []).map((m) => m.org_id as string);
  if (orgIds.length === 0) return null;
  const chosen = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  if (chosen && orgIds.includes(chosen)) return chosen;
  return orgIds[0];
}
