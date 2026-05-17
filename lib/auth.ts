// Cached user/profile fetchers — React.cache() dedupes calls within a single
// request so the same Supabase roundtrip doesn't happen N times when the
// layout, sub-layout, and page each ask for the current user.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getOwnProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, photo_url, email, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, why_this, skills, location, age, onboarded, verified",
    )
    .eq("id", user.id)
    .single();
  return data;
});
