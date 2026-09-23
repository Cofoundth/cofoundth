"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBlockedEitherWay } from "@/lib/blocking";
import { EDIT_WINDOW_MS, UNSEND_WINDOW_MS } from "./windows";

export type ConvMessage = {
  id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  edited_at: string | null;
  unsent_at: string | null;
};

// Server-side message fetch for the live-poll in <MessageThread>. Runs as the
// authenticated server client (reads the HttpOnly auth cookie), so RLS scopes
// the rows to this conversation's participants. Replaces the old browser-client
// query/realtime, which broke once auth tokens became HttpOnly (the browser
// client has no readable session to authorize the socket/REST call).
export async function fetchMessagesAction(
  matchId: string,
): Promise<ConvMessage[]> {
  if (!matchId) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // A block closes the conversation in BOTH directions, and the poll is the
  // one path that would keep serving it: RLS still lets a party read their own
  // match, and "they blocked me" is RLS-invisible, so the gate has to run here
  // on the service role. Empty list, not an error — same shape the UI already
  // handles, and it degrades to "nothing new" rather than a broken thread.
  const { data: convMatch } = await supabase
    .from("matches")
    .select("profile_a_id, profile_b_id")
    .eq("id", matchId)
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!convMatch) return [];
  const otherId =
    (convMatch.profile_a_id as string) === user.id
      ? (convMatch.profile_b_id as string)
      : (convMatch.profile_a_id as string);
  if (await isBlockedEitherWay(user.id, otherId)) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, read_at, created_at, edited_at, unsent_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[fetchMessages] query failed", error);
    return [];
  }
  return (data ?? []) as ConvMessage[];
}

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
    .select("id, profile_a_id, profile_b_id")
    .eq("id", matchId)
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!match) return { error: "Conversation not found." };

  // Blocked either way: the thread stays readable as history but takes no new
  // messages. Distinct copy from "not found" — the conversation exists, it is
  // just closed — and deliberately says nothing about who blocked whom.
  const otherId =
    (match.profile_a_id as string) === user.id
      ? (match.profile_b_id as string)
      : (match.profile_a_id as string);
  if (await isBlockedEitherWay(user.id, otherId)) {
    return { error: "This conversation isn’t available." };
  }

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
    .select("id, profile_a_id, profile_b_id")
    .eq("id", matchId)
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!match) return { error: "Conversation not found." };

  // Blocked either way: the thread stays readable as history but takes no new
  // messages. Distinct copy from "not found" — the conversation exists, it is
  // just closed — and deliberately says nothing about who blocked whom.
  const otherId =
    (match.profile_a_id as string) === user.id
      ? (match.profile_b_id as string)
      : (match.profile_a_id as string);
  if (await isBlockedEitherWay(user.id, otherId)) {
    return { error: "This conversation isn’t available." };
  }

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
  // Also revalidate the LAYOUT, not just this page. The sidebar's unread
  // badge is fetched in app/(app)/layout.tsx, and Next does not re-render a
  // shared layout on client-side navigation — a page-scoped revalidate
  // leaves the badge showing a count the user has already cleared.
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Edit + unsend.
//
// Both mirror sendMessageAction: same (prev, FormData) => SendMessageState
// signature, so a bubble's inline form can drive them with useActionState
// exactly the way the composer does, and both revalidate the thread AND
// /matches (the conversation list shows a last-message preview, which an edit
// rewrites and an unsend replaces with a tombstone).
//
// Every check below is REDONE here even though migration 0074's trigger
// enforces the same rules in Postgres. The trigger is the wall; this is the
// part that can say why in a sentence a founder can read. The order matters —
// ownership, then window, then the thing itself — so the error a client gets
// never distinguishes "someone else's message" from "a message that does not
// exist".
// ---------------------------------------------------------------------------

// Shared preamble: who is calling, is this their own message, and is the
// conversation open. Returns the row on success so the caller can check its
// clock without a second round-trip.
async function loadOwnMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  messageId: string,
  userId: string,
): Promise<
  | { error: string }
  | {
      row: {
        id: string;
        match_id: string;
        sender_id: string;
        content: string;
        created_at: string;
        unsent_at: string | null;
      };
    }
> {
  const { data: row } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, content, created_at, unsent_at")
    .eq("id", messageId)
    .maybeSingle();
  // RLS already scopes this select to conversations the caller is in, so a
  // miss is either "no such message" or "not yours to see" — one answer for
  // both, deliberately.
  if (!row) return { error: "Message not found." };
  if ((row.sender_id as string) !== userId)
    return { error: "You can only change your own messages." };

  const { data: match } = await supabase
    .from("matches")
    .select("id, profile_a_id, profile_b_id")
    .eq("id", row.match_id as string)
    .or(`profile_a_id.eq.${userId},profile_b_id.eq.${userId}`)
    .maybeSingle();
  if (!match) return { error: "Conversation not found." };

  const otherId =
    (match.profile_a_id as string) === userId
      ? (match.profile_b_id as string)
      : (match.profile_a_id as string);
  if (await isBlockedEitherWay(userId, otherId)) {
    return { error: "This conversation isn’t available." };
  }

  return {
    row: {
      id: row.id as string,
      match_id: row.match_id as string,
      sender_id: row.sender_id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      unsent_at: (row.unsent_at as string | null) ?? null,
    },
  };
}

export async function editMessageAction(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const messageId = String(formData.get("messageId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!messageId) return { error: "Missing message." };
  if (!content) return { error: "Message can't be empty." };
  // Same ceiling as the composer — an edit is still a message.
  if (content.length > 4000)
    return { error: "Message is too long (max 4000 chars)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const loaded = await loadOwnMessage(supabase, messageId, user.id);
  if ("error" in loaded) return loaded;
  const { row } = loaded;

  if (row.unsent_at) return { error: "This message was unsent." };

  // The clock is the SERVER's and the row's, never the client's — the form
  // carries no timestamp precisely so there is nothing to forge.
  if (Date.now() - new Date(row.created_at).getTime() > EDIT_WINDOW_MS) {
    return { error: "The 15-minute window to edit this message has passed." };
  }

  // Nothing changed: opened the editor, decided the wording was fine, pressed
  // Save. The DB refuses that update on purpose — 0074's guard raises
  // "edited_at only moves together with content", because stamping the marker
  // over unchanged words is a lie — and every update error collapses into one
  // opaque string below, so the founder would get a failure for an operation
  // that did nothing wrong, and would get it again on every retry. A no-op is
  // a successful no-op: close the editor, stamp nothing, write nothing.
  if (content === row.content) return null;

  const { error } = await supabase
    .from("messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    console.error("[editMessage] update failed", error);
    return { error: "Couldn't save your edit. Try again." };
  }

  revalidatePath(`/messages/${row.match_id}`);
  revalidatePath("/matches");
  return null;
}

export async function unsendMessageAction(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const messageId = String(formData.get("messageId") ?? "");
  if (!messageId) return { error: "Missing message." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const loaded = await loadOwnMessage(supabase, messageId, user.id);
  if ("error" in loaded) return loaded;
  const { row } = loaded;

  // Already a tombstone: nothing to do, and saying so is friendlier than an
  // error for the one case this happens — two tabs, or a double tap.
  if (row.unsent_at) return null;

  if (Date.now() - new Date(row.created_at).getTime() > UNSEND_WINDOW_MS) {
    return { error: "The 24-hour window to unsend this message has passed." };
  }

  // content is emptied, not blanked in the UI: after this the words are gone
  // from the row, from every API reply, and from the other founder's next
  // poll. The row survives so the conversation keeps its shape.
  const { error } = await supabase
    .from("messages")
    .update({ content: "", unsent_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    console.error("[unsendMessage] update failed", error);
    return { error: "Couldn't unsend this message. Try again." };
  }

  revalidatePath(`/messages/${row.match_id}`);
  revalidatePath("/matches");
  return null;
}
