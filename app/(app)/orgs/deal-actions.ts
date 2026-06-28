"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";
import { getActiveOrgId } from "@/lib/active-org";

export type DealFormState = { error?: string } | null;

const DEAL_TYPES = [
  "integration",
  "distribution",
  "white_label",
  "co_marketing",
  "vendor_supplier",
  "partnership",
  "other",
] as const;
const CURRENCIES = ["THB", "USD", "EUR"] as const;

// The org the viewer is acting as (active company cookie, else earliest-joined).
async function viewerOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  return getActiveOrgId(supabase, userId);
}

// ------------------------------------------------------------------
// PROPOSE a deal to a connected company. Both companies must already be
// connected (accepted org_connection).
// ------------------------------------------------------------------
export async function proposeDealAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const targetOrgId = String(formData.get("target_org") ?? "").trim();
  const targetSlug = String(formData.get("target_slug") ?? "").trim();
  const dealType = String(formData.get("deal_type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const valueRaw = String(formData.get("value_amount") ?? "").replace(/,/g, "").trim();
  const valueCurrency = String(formData.get("value_currency") ?? "").trim();
  const paymentTerms = String(formData.get("payment_terms") ?? "").trim();
  const timeline = String(formData.get("timeline") ?? "").trim();

  if (!(DEAL_TYPES as readonly string[]).includes(dealType)) {
    return { error: "Pick a deal type." };
  }
  if (title.length < 2 || title.length > 100) {
    return { error: "Title must be 2–100 characters." };
  }
  if (description.length < 20 || description.length > 5000) {
    return { error: "Describe the deal (20–5000 characters)." };
  }
  const valueAmount = valueRaw ? Number(valueRaw) : null;
  if (
    valueAmount !== null &&
    (!isFinite(valueAmount) ||
      valueAmount < 0 ||
      valueAmount > 9_999_999_999_999)
  ) {
    return { error: "Invalid deal value." };
  }
  if (valueAmount !== null && !(CURRENCIES as readonly string[]).includes(valueCurrency)) {
    return { error: "Pick a currency for the deal value." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const myOrg = await viewerOrg(supabase, user.id);
  if (!myOrg) return { error: "You need a company to propose a deal." };
  if (myOrg === targetOrgId) return { error: "That's your own company." };
  if (!isUuid(targetOrgId)) return { error: "Invalid company." };

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("org_connections")
    .select("id, status")
    .or(
      `and(requester_org.eq.${myOrg},target_org.eq.${targetOrgId}),and(requester_org.eq.${targetOrgId},target_org.eq.${myOrg})`,
    )
    .maybeSingle();
  if (!conn || conn.status !== "accepted") {
    return { error: "Connect with this company first." };
  }

  const { error } = await admin.from("org_deals").insert({
    connection_id: conn.id,
    proposer_org: myOrg,
    responder_org: targetOrgId,
    proposed_by: user.id,
    deal_type: dealType,
    title,
    description,
    value_amount: valueAmount,
    value_currency: valueAmount !== null ? valueCurrency : null,
    payment_terms: paymentTerms || null,
    timeline: timeline || null,
    status: "proposed",
  });
  if (error) {
    console.error("[deals.propose]", error);
    return { error: "Couldn't send the proposal. Try again." };
  }

  revalidatePath("/orgs");
  redirect(targetSlug ? `/orgs/${targetSlug}` : "/orgs");
}

// Helper: is the caller a member of `orgId`?
async function isMemberOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// The responder company confirms → both agreed → goes to admin.
export async function confirmDealAction(
  dealId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("org_deals")
    .select("id, responder_org, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal || deal.status !== "proposed") return { error: "Proposal not found." };
  if (!(await isMemberOf(supabase, deal.responder_org as string, user.id))) {
    return { error: "Not allowed." };
  }

  // Atomic guard: the update only applies while still 'proposed', so a
  // double-confirm / TOCTOU race can't double-fire. Empty result = lost the race.
  const { data: updated, error } = await admin
    .from("org_deals")
    .update({
      status: "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", deal.id)
    .eq("status", "proposed")
    .select("id");
  if (error) {
    console.error("[deals.confirm]", error);
    return { error: "Couldn't confirm. Try again." };
  }
  if (!updated?.length) return { error: "This proposal was already handled." };
  revalidatePath("/orgs");
  return {};
}

// The responder declines a pending proposal.
export async function declineDealAction(
  dealId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("org_deals")
    .select("id, responder_org, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal || deal.status !== "proposed") return { error: "Proposal not found." };
  if (!(await isMemberOf(supabase, deal.responder_org as string, user.id))) {
    return { error: "Not allowed." };
  }

  const { data: updated, error } = await admin
    .from("org_deals")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", deal.id)
    .eq("status", "proposed")
    .select("id");
  if (error) {
    console.error("[deals.decline]", error);
    return { error: "Couldn't decline. Try again." };
  }
  if (!updated?.length) return { error: "This proposal was already handled." };
  revalidatePath("/orgs");
  return {};
}

// The proposer withdraws their own still-pending proposal.
export async function cancelDealAction(
  dealId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("org_deals")
    .select("id, proposer_org, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal || deal.status !== "proposed") return { error: "Proposal not found." };
  if (!(await isMemberOf(supabase, deal.proposer_org as string, user.id))) {
    return { error: "Not allowed." };
  }

  const { data: updated, error } = await admin
    .from("org_deals")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", deal.id)
    .eq("status", "proposed")
    .select("id");
  if (error) {
    console.error("[deals.cancel]", error);
    return { error: "Couldn't withdraw. Try again." };
  }
  if (!updated?.length) return { error: "This proposal was already handled." };
  revalidatePath("/orgs");
  return {};
}
