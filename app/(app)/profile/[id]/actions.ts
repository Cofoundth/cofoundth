"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendInterestReceivedEmail,
  sendMutualMatchEmail,
} from "@/lib/email";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isBlockedEitherWay } from "@/lib/blocking";

export type InterestState = { error?: string; ok?: boolean } | null;
export type ReportState = { error?: string; ok?: boolean } | null;
export type BlockState = { error?: string; ok?: boolean } | null;

// Block / unblock. The block ROW is written on the user's client (RLS scopes
// it to their own rows); the cleanup afterwards is service-role, because it
// touches rows the other party owns. The symmetric hiding happens at read
// time (lib/blocking).
export async function blockProfileAction(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId) return { error: "Missing target." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (user.id === targetId) return { error: "You can’t block yourself." };

  // ON CONFLICT DO NOTHING, not DO UPDATE. profile_blocks deliberately has no
  // UPDATE policy (0069) — a block is insert-or-delete — so the DO UPDATE form
  // an ordinary upsert emits is refused by RLS the second time you block the
  // same person. ignoreDuplicates makes a re-block the no-op it should be.
  const { error } = await supabase
    .from("profile_blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: targetId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  if (error) return { error: error.message };

  // Clean up what the block leaves dangling. Both run on the service role:
  // the rows belong to the OTHER party as much as to this one, so the user's
  // RLS client can't reach all of them.
  const admin = createAdminClient();
  // (a) Pending interest in EITHER direction — an invitation neither side can
  // act on any more.
  await admin
    .from("interests")
    .delete()
    .eq("status", "pending")
    .or(
      `and(from_profile_id.eq.${user.id},to_profile_id.eq.${targetId}),and(from_profile_id.eq.${targetId},to_profile_id.eq.${user.id})`,
    );
  // (b) Unread messages FROM the blocked member in the pair's own matches.
  // The conversation is now unreachable, so leaving them unread leaves the
  // sidebar's Connections badge counting rows the user can never open.
  const { data: pairMatches } = await admin
    .from("matches")
    .select("id")
    .or(
      `and(profile_a_id.eq.${user.id},profile_b_id.eq.${targetId}),and(profile_a_id.eq.${targetId},profile_b_id.eq.${user.id})`,
    );
  const matchIds = (pairMatches ?? []).map((m) => m.id as string);
  if (matchIds.length) {
    await admin
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("match_id", matchIds)
      .eq("sender_id", targetId)
      .is("read_at", null);
  }

  revalidatePath("/", "layout");
  // The server navigates, not the client: this profile page 404s for the pair
  // from here on, so a success branch rendered in place would be a dead page
  // waiting for the user to notice.
  redirect("/browse");
}

export async function unblockProfileAction(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId) return { error: "Missing target." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("profile_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

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

  // Blocked in either direction = the pair can't open new interest. The
  // check runs on service role because "they blocked me" is RLS-invisible.
  if (await isBlockedEitherWay(user.id, toId)) {
    return { error: "This member isn’t available." };
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
  // Also revalidate the LAYOUT, not just this page. The sidebar's unread
  // badge is fetched in app/(app)/layout.tsx, and Next does not re-render a
  // shared layout on client-side navigation — a page-scoped revalidate
  // leaves the badge showing a count the user has already cleared.
  revalidatePath("/", "layout");
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
    const admin = createSupabaseClient(adminUrl, serviceKey);

    // Fetch the two user records (emails) + profile names
    const [{ data: fromUser }, { data: toUser }, { data: profiles }] =
      await Promise.all([
        admin.auth.admin.getUserById(fromId),
        admin.auth.admin.getUserById(toId),
        admin
          .from("profiles")
          .select("id, full_name, locale")
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
            locale: (toProfile?.locale as "en" | "th") ?? "en",
          }),
        fromUser?.user?.email &&
          sendMutualMatchEmail({
            toEmail: fromUser.user.email,
            toName: (fromProfile?.full_name as string) ?? "Founder",
            otherName: (toProfile?.full_name as string) ?? "A founder",
            matchId: match.id as string,
            locale: (fromProfile?.locale as "en" | "th") ?? "en",
          }),
      ]);
    } else if (toUser?.user?.email) {
      await sendInterestReceivedEmail({
        toEmail: toUser.user.email,
        toName: (toProfile?.full_name as string) ?? "Founder",
        fromName: (fromProfile?.full_name as string) ?? "A founder",
        note: note || null,
        locale: (toProfile?.locale as "en" | "th") ?? "en",
      });
    }
  } catch (e) {
    console.error("[notifyAboutInterest failed]", e);
  }
}
