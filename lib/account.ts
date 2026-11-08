import type { createClient } from "./supabase/server";
import { type AccountRole, parseAccountRole } from "./roles";

type SBClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Read this account's role. ONE query shape for the whole app, and the one
 * place a DB string crosses into the AccountRole type.
 *
 * Resolves to "founder" when the row is missing, the column was not selected,
 * or the value is unrecognised — see parseAccountRole for why that direction.
 *
 * NEW CODE SHOULD CALL THIS, then the can* predicates from lib/roles.ts:
 *
 *   const role = await getAccountRole(supabase, user.id);
 *   if (!canPostThread(role)) return { error: "…" };
 *
 * Not `!isInvestorAccount(...)`. That negation is how a third role silently
 * inherited the full founder write ladder: "not an investor" quietly meant
 * "may write anything", and an explorer answered false to it everywhere. Gate
 * on the CAPABILITY, so adding a fourth role fails closed and loudly instead of
 * open and silently.
 */
export async function getAccountRole(
  supabase: SBClient,
  userId: string,
): Promise<AccountRole> {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  return parseAccountRole(data?.account_type);
}

/**
 * True only for an investor account.
 *
 * KEPT, and still correct where "investor" is genuinely the subject — editing
 * an investor_profiles row, the /funding and /investor surfaces. Those accounts
 * are live in production and their gates must not move.
 *
 * Do NOT use it as a stand-in for "may write" — prefer getAccountRole plus a
 * can* predicate, per the note above.
 */
export async function isInvestorAccount(
  supabase: SBClient,
  userId: string,
): Promise<boolean> {
  return (await getAccountRole(supabase, userId)) === "investor";
}
