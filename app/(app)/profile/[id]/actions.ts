"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  sendInterestReceivedEmail,
  sendMutualMatchEmail,
} from "@/lib/email";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export type InterestState = { error?: string; ok?: boolean } | null;
export type ReportState = { error?: string; ok?: boolean } | null;

export async function reportProfileAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const targetId = String(formData.get("targetId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!targetId) return { error: "Missing target." };
  if (reason.length < 5) return { error: "Reason must be at least 5 chars." };
  if (reason.length > 1000)
    return { error: "Reason must be 1000 chars or less." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_kind: "profile",
    target_id: targetId,
    reason,
  });

  if (error) {
    if (error.code === "42P01") {
      return {
        error:
          "Reports table not ready. Apply supabase/migrations/0002_community_forum.sql first.",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}

export async function expressInterestAction(
  _prev: InterestState,
  formData: FormData,
): Promise<InterestState> {
  const toId = String(formData.get("toId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!toId) return { error: "Missing target profile." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (user.id === toId) {
    return { error: "You can’t express interest in your own profile." };
  }

  const { error } = await supabase.from("interests").insert({
    from_profile_id: user.id,
    to_profile_id: toId,
    note: note || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You’ve already expressed interest in this founder." };
    }
    return { error: error.message };
  }

  // After insert, the DB trigger may have created a match if reciprocal interest existed.
  // Fire notification emails (best effort; never block the action on email).
  void notifyAboutInterest(user.id, toId, note);

  revalidatePath(`/profile/${toId}`);
  return { ok: true };
}

async function notifyAboutInterest(
  fromId: string,
  toId: string,
  note: string,
) {
  try {
    // Need admin client to read auth.users emails (server-only secret key)
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!adminUrl || !serviceKey) {
      console.log("[notify skipped — no SUPABASE_SECRET_KEY]");
      return;
    }
    const admin = createAdminClient(adminUrl, serviceKey);

    // Fetch the two user records (emails) + profile names
    const [{ data: fromUser }, { data: toUser }, { data: profiles }] =
      await Promise.all([
        admin.auth.admin.getUserById(fromId),
        admin.auth.admin.getUserById(toId),
        admin
          .from("profiles")
          .select("id, full_name")
          .in("id", [fromId, toId]),
      ]);

    const fromProfile = profiles?.find((p) => p.id === fromId);
    const toProfile = profiles?.find((p) => p.id === toId);

    // Check whether a match exists now (= reciprocal interest had been present)
    const a = fromId < toId ? fromId : toId;
    const b = fromId < toId ? toId : fromId;
    const { data: match } = await admin
      .from("matches")
      .select("id")
      .eq("profile_a_id", a)
      .eq("profile_b_id", b)
      .maybeSingle();

    if (match) {
      // Mutual: notify both
      await Promise.all([
        toUser?.user?.email &&
          sendMutualMatchEmail({
            toEmail: toUser.user.email,
            toName: (toProfile?.full_name as string) ?? "Founder",
            otherName: (fromProfile?.full_name as string) ?? "A founder",
            matchId: match.id as string,
          }),
        fromUser?.user?.email &&
          sendMutualMatchEmail({
            toEmail: fromUser.user.email,
            toName: (fromProfile?.full_name as string) ?? "Founder",
            otherName: (toProfile?.full_name as string) ?? "A founder",
            matchId: match.id as string,
          }),
      ]);
    } else if (toUser?.user?.email) {
      await sendInterestReceivedEmail({
        toEmail: toUser.user.email,
        toName: (toProfile?.full_name as string) ?? "Founder",
        fromName: (fromProfile?.full_name as string) ?? "A founder",
        note: note || null,
      });
    }
  } catch (e) {
    console.error("[notifyAboutInterest failed]", e);
  }
}
