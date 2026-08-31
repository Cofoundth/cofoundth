"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInvestorAccount } from "@/lib/account";

export type RsvpResult = { error?: string; going?: boolean; count?: number };

// Toggle the caller's RSVP for a meetup. Runs on the user's RLS client:
// meetup_rsvps_insert_self / _delete_self enforce that a member can only touch
// their OWN row, so no service role is needed here.
export async function rsvpAction(
  meetupId: string,
  going: boolean,
): Promise<RsvpResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Investors read the founder community but do not act in it — the same rule
  // the forum composer follows. Routing already hides the button; this is the
  // boundary that actually holds.
  if (await isInvestorAccount(supabase, user.id)) {
    return { error: "Not authenticated." };
  }

  // RLS hides drafts; a cancelled or already-passed meetup can't be joined.
  const { data: meetup } = await supabase
    .from("meetups")
    .select("id, slug, status, starts_at, capacity")
    .eq("id", meetupId)
    .maybeSingle();
  if (!meetup) return { error: "Meetup not found." };
  if (meetup.status === "cancelled") return { error: "This meetup was cancelled." };
  if (new Date(meetup.starts_at as string).getTime() < Date.now()) {
    return { error: "This meetup has already happened." };
  }

  if (going) {
    // Advisory capacity check. A race at the very last seat is possible and
    // acceptable at this scale; the (meetup_id,user_id) PK makes a double-RSVP
    // an idempotent upsert rather than a duplicate.
    if (meetup.capacity != null) {
      const [{ count: goingCount }, { data: mine }] = await Promise.all([
        supabase
          .from("meetup_rsvps")
          .select("user_id", { count: "exact", head: true })
          .eq("meetup_id", meetupId),
        supabase
          .from("meetup_rsvps")
          .select("user_id")
          .eq("meetup_id", meetupId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!mine && (goingCount ?? 0) >= (meetup.capacity as number)) {
        return { error: "This meetup is full." };
      }
    }
    const { error } = await supabase.from("meetup_rsvps").upsert(
      { meetup_id: meetupId, user_id: user.id, status: "going" },
      { onConflict: "meetup_id,user_id" },
    );
    if (error) {
      console.error("[meetups.rsvp]", error);
      return { error: "Couldn't RSVP. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("meetup_rsvps")
      .delete()
      .eq("meetup_id", meetupId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[meetups.rsvp.cancel]", error);
      return { error: "Couldn't update your RSVP. Try again." };
    }
  }

  const { count } = await supabase
    .from("meetup_rsvps")
    .select("user_id", { count: "exact", head: true })
    .eq("meetup_id", meetupId);

  revalidatePath("/meetups");
  revalidatePath(`/meetups/${meetup.slug as string}`);
  return { going, count: count ?? 0 };
}
