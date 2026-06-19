"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  if (thesis.length > 600) {
    return { error: "Keep your thesis under 600 characters." };
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

  revalidatePath("/investor");
  redirect("/investor");
}
