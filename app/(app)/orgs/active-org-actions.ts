"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";

// Persist which company the user is acting as (validated against membership).
export async function setActiveOrgAction(
  orgId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return { error: "Not allowed." };

  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return {};
}
