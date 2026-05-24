"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendNewMessageEmail } from "@/lib/email";

export type SendMessageState = { error?: string } | null;

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const matchId = String(formData.get("matchId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!matchId) return { error: "Missing match." };
  if (!content) return { error: "Message can't be empty." };
  if (content.length > 4000)
    return { error: "Message is too long (max 4000 chars)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify the caller is a party to this match before inserting. RLS would
  // catch a bad insert too, but surfacing the raw Postgres error to the UI
  // leaks policy internals — explicit pre-check + generic error is cleaner
  // and defends against any future RLS regression.
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!match) return { error: "Conversation not found." };

  const { error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: user.id, content });

  if (error) {
    console.error("[sendMessage] insert failed", error);
    return { error: "Couldn't send your message. Try again." };
  }

  // Notify the other party (best-effort)
  void notifyNewMessage(matchId, user.id, content);

  revalidatePath(`/messages/${matchId}`);
  return null;
}

async function notifyNewMessage(
  matchId: string,
  senderId: string,
  content: string,
) {
  try {
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!adminUrl || !serviceKey) return;

    const admin = createAdminClient(adminUrl, serviceKey);
    const { data: match } = await admin
      .from("matches")
      .select("profile_a_id, profile_b_id")
      .eq("id", matchId)
      .single();
    if (!match) return;

    const recipientId =
      match.profile_a_id === senderId
        ? (match.profile_b_id as string)
        : (match.profile_a_id as string);

    const [{ data: recipient }, { data: profiles }] = await Promise.all([
      admin.auth.admin.getUserById(recipientId),
      admin
        .from("profiles")
        .select("id, full_name")
        .in("id", [senderId, recipientId]),
    ]);
    if (!recipient?.user?.email) return;

    const sender = profiles?.find((p) => p.id === senderId);
    const recipientProfile = profiles?.find((p) => p.id === recipientId);

    await sendNewMessageEmail({
      toEmail: recipient.user.email,
      toName: (recipientProfile?.full_name as string) ?? "Founder",
      fromName: (sender?.full_name as string) ?? "A founder",
      matchId,
      preview: content,
    });
  } catch (e) {
    console.error("[notifyNewMessage failed]", e);
  }
}

// Fire-and-forget: client mounts the conversation and calls this to mark
// the other party's messages as read. Decoupled from the page render so
// browser prefetch (which doesn't run client effects) can't accidentally
// mark messages read before the user actually sees them.
export async function markConversationRead(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  revalidatePath(`/messages/${matchId}`);
}
