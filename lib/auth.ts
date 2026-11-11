// Cached user/profile fetchers — React.cache() dedupes calls within a single
// request so the same Supabase roundtrip doesn't happen N times when the
// layout, sub-layout, and page each ask for the current user.

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authHref } from "@/lib/auth-href";
import { safeNextPath } from "@/lib/safe-next";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Where a signed-out request for an app page is sent: /login with the page as
// `next`, so signing in brings them back to it (signInAction and the OAuth
// callback follow it once lib/safe-next.ts accepts it). Only the pathname is
// known — x-pathname, set by proxy.ts — so a query is dropped, as it is on the
// onboarding bounce in app/(app)/layout.tsx. /dashboard is the sign-in's own
// default, so it is left off the URL. The ONE spelling of this redirect: the
// (app) layout, requireUser and the settings page all use it, because layout
// and page render concurrently and whichever redirects first wins.
export async function loginHref(): Promise<string> {
  const pathname = (await headers()).get("x-pathname") ?? "";
  return pathname !== "/dashboard" && safeNextPath(pathname)
    ? authHref("/login", pathname)
    : "/login";
}

// Page-level auth guard. The (app) layout redirects logged-out users, but
// layouts + pages render concurrently in the App Router — so a page that
// dereferences `user.id` will still crash on a logged-out request before
// the layout redirect resolves. Calling requireUser() at the top of each
// guarded page converts that crash into a clean redirect. cache() dedupes
// the underlying getUser() call, so this adds no extra roundtrip.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect(await loginHref());
  return user;
}

export const getOwnProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, photo_url, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, why_this, skills, location, age, onboarded, verified",
    )
    .eq("id", user.id)
    .single();
  return data;
});
