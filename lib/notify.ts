import { createAdminClient } from "@/lib/supabase/admin";

type NotifInput = {
  actorId?: string | null;
  type: string;
  entityId?: string | null;
  data?: Record<string, string>;
};

// Insert one notification per recipient. Service-role: the notifications table
// has no client INSERT policy (rows come from definer triggers / server code).
export async function notifyUsers(
  userIds: string[],
  n: NotifInput,
): Promise<void> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  const admin = createAdminClient();
  const rows = ids.map((uid) => ({
    recipient_id: uid,
    actor_id: n.actorId ?? null,
    type: n.type,
    entity_id: n.entityId ?? null,
    data: n.data ?? {},
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) console.error("[notify]", error);
}

// Notify every member of an org (optionally excluding the actor).
export async function notifyOrgMembers(
  orgId: string,
  excludeUserId: string | null,
  n: NotifInput,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId);
  let ids = (data ?? []).map((m) => m.user_id as string);
  if (excludeUserId) ids = ids.filter((id) => id !== excludeUserId);
  await notifyUsers(ids, n);
}
