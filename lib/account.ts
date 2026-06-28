import type { createClient } from "./supabase/server";

type SBClient = Awaited<ReturnType<typeof createClient>>;

// Investors are read-first members of the founder community: they can browse and
// like, but not post or comment (it stays a founder space). Founder-only write
// actions call this to fail closed, and the UI hides the composers for them.
export async function isInvestorAccount(
  supabase: SBClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  return data?.account_type === "investor";
}
