// Blocking — Settings > Privacy & safety. "Members you've blocked won't see
// you": the exclusion is SYMMETRIC and server-side only. RLS keeps a block
// list private to its owner, so the reverse direction (who blocked the
// viewer) is deliberately unreadable from the client — every helper here
// runs on the service role and must stay on the server.

import { createAdminClient } from "@/lib/supabase/admin";

// Everyone the viewer must not see and must not be seen by — both directions
// merged into one Set for pool filtering (browse, dashboard, tickers).
export async function getBlockedIds(userId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  // A silent failure here would quietly UN-hide every blocked pair in the
  // feeds, so it gets logged even though the caller still receives whatever
  // rows did come back (a partial list is the safe direction for a filter).
  if (error) console.error("[blocking.getBlockedIds]", error);
  const out = new Set<string>();
  for (const r of data ?? []) {
    out.add(
      (r.blocker_id as string) === userId
        ? (r.blocked_id as string)
        : (r.blocker_id as string),
    );
  }
  return out;
}

// Pair check for point interactions (open a profile, express interest).
export async function isBlockedEitherWay(
  a: string,
  b: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profile_blocks")
    .select("blocker_id", { count: "exact", head: true })
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`,
    );
  // FAIL CLOSED. This gate decides whether two people may reach each other;
  // an unreadable answer must read as "blocked", never as "go ahead" — the
  // cost of a false positive is one refused action, the cost of a false
  // negative is a block that silently stopped working.
  if (error) {
    console.error("[blocking.isBlockedEitherWay]", error);
    return true;
  }
  return (count ?? 0) > 0;
}
