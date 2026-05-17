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

  const { error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: user.id, content });

  if (error) return { error: error.message };

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
