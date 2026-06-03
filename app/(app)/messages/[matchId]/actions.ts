"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // No email on every message — the recipient still gets an in-app bell
  // notification (created by DB trigger). Emails fire only for interest +
  // mutual match (see app/(app)/profile/[id]/actions.ts).

  revalidatePath(`/messages/${matchId}`);
  return null;
}

// Start an instant video room: the client generates a unique Jitsi room URL
// (so it can open it synchronously, dodging popup blockers) and we post that
// link into the chat so the other founder can tap and join the same room.
export async function postMeetLinkAction(
  matchId: string,
  url: string,
): Promise<{ error?: string } | null> {
  if (!/^https:\/\/meet\.jit\.si\/cofoundee-[a-z0-9-]+$/i.test(url)) {
    return { error: "Bad room link." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!match) return { error: "Conversation not found." };

  const { data: prof } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const label = prof?.locale === "en" ? "Video call" : "ห้องประชุม";

  const { error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: user.id, content: `📹 ${label}: ${url}` });
  if (error) {
    console.error("[postMeetLink] insert failed", error);
    return { error: "Couldn't start the call. Try again." };
  }

  revalidatePath(`/messages/${matchId}`);
  return null;
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

  const now = new Date().toISOString();
  await supabase
    .from("messages")
    .update({ read_at: now })
    .eq("match_id", matchId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  // Also clear the bell's "new message" notification for this conversation.
  await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("recipient_id", user.id)
    .eq("type", "message")
    .eq("entity_id", matchId)
    .is("read_at", null);

  revalidatePath(`/messages/${matchId}`);
}
