"use server";

import { createClient } from "@/lib/supabase/server";

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
