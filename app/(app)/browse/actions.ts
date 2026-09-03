"use server";

// Save/unsave a founder — the heart on the browse card. Runs on the user's
// RLS client: profile_saves policies scope every row to the saver, so no
// service role is involved and nobody is notified.

import { createClient } from "@/lib/supabase/server";

export async function toggleSaveAction(
  profileId: string,
  save: boolean,
): Promise<{ error?: string; saved?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (user.id === profileId) return { error: "That's you." };

  if (save) {
    const { error } = await supabase
      .from("profile_saves")
      .upsert(
        { user_id: user.id, profile_id: profileId },
        { onConflict: "user_id,profile_id" },
      );
    if (error) return { error: "Couldn't save. Try again." };
  } else {
    const { error } = await supabase
      .from("profile_saves")
      .delete()
      .eq("user_id", user.id)
      .eq("profile_id", profileId);
    if (error) return { error: "Couldn't update. Try again." };
  }
  return { saved: save };
}
