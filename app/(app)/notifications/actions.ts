"use server";

import { createClient } from "@/lib/supabase/server";

export type PolledNotif = {
  id: string;
  type: string;
  entityId: string | null;
  data: { actor_name?: string; post_title?: string } | null;
  readAt: string | null;
  createdAt: string;
  actorId: string | null;
};

// Server-side poll for the notification bell. Replaces the old client-side
// Supabase query so the browser never needs a readable session token (auth
// cookies are HttpOnly). The server reads the session from the HttpOnly cookie.
export async function fetchNotificationsAction(): Promise<{
  items: PolledNotif[];
  unread: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unread: 0 };

  const { data } = await supabase
    .from("notifications")
    .select("id, type, entity_id, data, read_at, created_at, actor_id")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const items: PolledNotif[] = (data ?? []).map((n) => ({
    id: n.id as string,
    type: n.type as string,
    entityId: (n.entity_id as string | null) ?? null,
    data:
      (n.data as { actor_name?: string; post_title?: string } | null) ?? null,
    readAt: (n.read_at as string | null) ?? null,
    createdAt: n.created_at as string,
    actorId: (n.actor_id as string | null) ?? null,
  }));
  return { items, unread: items.filter((i) => !i.readAt).length };
}

// Mark all of the current user's unread notifications as read. Called when the
// notification dropdown is opened (LinkedIn-style: opening = seen). RLS
// (notifications_update_own) scopes the update to the caller's own rows.
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
}

// Dismiss a single notification (RLS notifications_delete_own scopes it).
export async function dismissNotification(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("recipient_id", user.id);
}

// Clear all of the current user's notifications.
export async function clearAllNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notifications").delete().eq("recipient_id", user.id);
}
