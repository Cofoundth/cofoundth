"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInvestorAccount } from "@/lib/account";
import { LONG_TEXT_MAX } from "@/lib/limits";

export type InvestorFormState = { error?: string } | null;

const TYPES = [
  "angel",
  "vc",
  "corporate",
  "family_office",
  "syndicate",
  "other",
] as const;

function parseList(raw: string, maxItems = 12, maxLen = 40): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.slice(0, maxLen)),
    ),
  ].slice(0, maxItems);
}

export async function saveInvestorProfileAction(
  _prev: InvestorFormState,
  formData: FormData,
): Promise<InvestorFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // THE ONE PLACE isInvestorAccount IS THE RIGHT PREDICATE, USED POSITIVELY.
  // Everywhere else in the app the question is "may this role write X", which
  // is a can* predicate from lib/roles.ts; here the subject genuinely IS the
  // investor role, because this writes an investor_profiles row.
  //
  // Without it, authentication was the only check: ANY account could upsert its
  // own investor_profiles row and — worse — hit the `onboarded: true` write
  // below. That flag is the one app/onboarding/actions.ts and
  // app/(app)/settings/actions.ts refuse a gated role precisely because it
  // trips 0046's set_profile_complete trigger and makes a row look like a
  // founder to every query that does not pin account_type. This was a second,
  // independent door to it.
  //
  // Deliberately NOT behind FEATURES.investorSignup: that flag hides the signup
  // OPTION, and the real investor accounts in production must keep editing
  // their own profile while it is false.
  if (!(await isInvestorAccount(supabase, user.id))) {
    return { error: "Only investor accounts can do this." };
  }

  const investorType = String(formData.get("investor_type") ?? "").trim();
  const firmName = String(formData.get("firm_name") ?? "").trim();
  const ticketSize = String(formData.get("ticket_size") ?? "").trim();
  const thesis = String(formData.get("thesis") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const focusIndustries = parseList(
    String(formData.get("focus_industries") ?? ""),
  );
  const stages = parseList(String(formData.get("stages") ?? ""));

  if (!(TYPES as readonly string[]).includes(investorType)) {
    return { error: "Pick your investor type." };
  }
  if (thesis.length > LONG_TEXT_MAX) {
    return { error: "Your thesis is too long." };
  }

  // RLS (investor_profiles_*_self) enforces user_id = the caller.
  const { error } = await supabase.from("investor_profiles").upsert(
    {
      user_id: user.id,
      investor_type: investorType,
      firm_name: firmName || null,
      focus_industries: focusIndustries,
      stages,
      ticket_size: ticketSize || null,
      thesis: thesis || null,
      location: location || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[investor.save]", error);
    return { error: "Couldn't save. Try again." };
  }

  // Mark onboarded so an investor isn't treated as a half-set-up account.
  await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);

  revalidatePath("/investor");
  redirect("/investor");
}
