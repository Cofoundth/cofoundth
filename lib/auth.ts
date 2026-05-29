// Cached user/profile fetchers — React.cache() dedupes calls within a single
// request so the same Supabase roundtrip doesn't happen N times when the
// layout, sub-layout, and page each ask for the current user.

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Page-level auth guard. The (app) layout redirects logged-out users, but
// layouts + pages render concurrently in the App Router — so a page that
// dereferences `user.id` will still crash on a logged-out request before
// the layout redirect resolves. Calling requireUser() at the top of each
// guarded page converts that crash into a clean redirect. cache() dedupes
// the underlying getUser() call, so this adds no extra roundtrip.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

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
