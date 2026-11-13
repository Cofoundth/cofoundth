"use server";

// Connections: answering a request with "Not interested".
//
// QUIET, ON PURPOSE (the owner's call, 2026-11-13). The row goes to the status
// the schema has had since 0001 ('declined'), which takes it off the
// recipient's Requests and off the rail's Connections badge (both read
// status = 'pending'). The SENDER is told nothing: no notification fires (the
// interest trigger is AFTER INSERT only, 0028), their profile view of the
// recipient still reads "outgoing" (it keys on the row existing), and their
// "Waiting to hear back" list keeps it (app/(app)/matches/page.tsx reads
// pending OR declined there). A visible "declined" is a public rejection in a
// community this small, and in Thai social terms a loss of face for both
// sides; the LinkedIn "Ignore" pattern avoids it.
//
// Not final either: the recipient can still express interest back from the
// sender's profile, which still offers it, and the mutual-interest trigger
// matches the pair as it always has.
//
// Through the member's OWN client: RLS "interests_update_recipient" (0001)
// lets only the recipient update the row, and the filters below narrow it to
// a pending request addressed to them, so a stale or forged id changes
// nothing.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function declineInterestAction(interestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("interests")
    .update({ status: "declined" })
    .eq("id", interestId)
    .eq("to_profile_id", user.id)
    .eq("status", "pending");
  if (error) {
    console.error("[interests.decline]", error.message);
    return;
  }

  revalidatePath("/matches");
  // The rail's Connections badge lives in the layout, which a page
  // revalidation does not re-render.
  revalidatePath("/", "layout");
}
