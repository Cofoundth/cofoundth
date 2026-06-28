"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";
import { DEAL_DESCRIPTION_MAX } from "@/lib/limits";
import { cofoundeeFee, COFOUNDEE_FEE_CURRENCY } from "@/lib/fee";
import { notifyUsers, notifyOrgMembers } from "@/lib/notify";

export type FundingFormState = { error?: string } | null;

type SBClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

async function isInvestor(supabase: SBClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  return data?.account_type === "investor";
}

// Which side of a connection is the caller on? Checks membership of THIS
// connection's specific org, so it is correct regardless of how many companies
// the user belongs to.
async function callerSide(
  supabase: SBClient,
  admin: AdminClient,
  connectionId: string,
  userId: string,
): Promise<{
  conn: {
    id: string;
    investor_id: string;
    org_id: string;
    status: string;
    requested_by: string;
  };
  side: "investor" | "company";
} | null> {
  const { data: conn } = await admin
    .from("investor_connections")
    .select("id, investor_id, org_id, status, requested_by")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) return null;
  if ((conn.investor_id as string) === userId)
    return { conn: conn as never, side: "investor" };
  const { data: m } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", conn.org_id as string)
    .eq("user_id", userId)
    .maybeSingle();
  if (m) return { conn: conn as never, side: "company" };
  return null;
}

// ---- Connect: investor → company ----------------------------------------
export async function investorConnectAction(
  orgId: string,
): Promise<{ error?: string }> {
  if (!isUuid(orgId)) return { error: "Invalid company." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (!(await isInvestor(supabase, user.id)))
    return { error: "Only investor accounts can do this." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("investor_connections")
    .select("id, status")
    .eq("investor_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (existing) return { error: "You already have a request with this company." };

  const { error } = await admin.from("investor_connections").insert({
    investor_id: user.id,
    org_id: orgId,
    status: "pending",
    requested_by: "investor",
    created_by: user.id,
  });
  if (error) {
    console.error("[funding.investorConnect]", error);
    return { error: "Couldn't send the request. Try again." };
  }
  revalidatePath("/funding");
  return {};
}

// ---- Respond to a connection request (the side that didn't request) ------
export async function respondInvestorConnectionAction(
  connectionId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  if (!isUuid(connectionId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const resolved = await callerSide(supabase, admin, connectionId, user.id);
  if (!resolved) return { error: "Not allowed." };
  const { conn, side } = resolved;
  if (conn.status !== "pending") return { error: "Already handled." };
  // Only the side that did NOT request may respond.
  if (conn.requested_by === side)
    return { error: "Waiting on the other side to respond." };

  const { data: updated, error } = await admin
    .from("investor_connections")
    .update({
      status: accept ? "accepted" : "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id)
    .eq("status", "pending")
    .select("id");
  if (error) {
    console.error("[funding.respondConnection]", error);
    return { error: "Couldn't update. Try again." };
  }
  if (!updated?.length) return { error: "Already handled." };
  revalidatePath("/funding");
  return {};
}

// ---- Propose a funding deal (either side, once connected) ----------------
export async function proposeInvestorDealAction(
  _prev: FundingFormState,
  formData: FormData,
): Promise<FundingFormState> {
  const connectionId = String(formData.get("connection_id") ?? "").trim();
  const equityRaw = String(formData.get("equity_pct") ?? "").trim();
  const monthlyRaw = String(formData.get("monthly_amount") ?? "")
    .replace(/,/g, "")
    .trim();
  const monthsRaw = String(formData.get("contract_months") ?? "").trim();
  const paymentTerms = String(formData.get("payment_terms") ?? "")
    .trim()
    .slice(0, 500);
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, DEAL_DESCRIPTION_MAX);

  if (!isUuid(connectionId)) return { error: "Invalid conversation." };

  const equity = equityRaw ? Number(equityRaw) : null;
  if (equity !== null && (!isFinite(equity) || equity < 0 || equity > 100))
    return { error: "Equity must be between 0 and 100%." };
  const monthly = monthlyRaw ? Number(monthlyRaw) : null;
  if (monthly !== null && (!isFinite(monthly) || monthly < 0))
    return { error: "Invalid monthly amount." };
  const months = monthsRaw ? Number(monthsRaw) : null;
  if (
    months !== null &&
    (!Number.isInteger(months) || months < 1 || months > 600)
  )
    return { error: "Contract length must be 1–600 months." };
  if (equity === null && monthly === null)
    return { error: "Add at least equity % or a monthly amount." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const resolved = await callerSide(supabase, admin, connectionId, user.id);
  if (!resolved) return { error: "Not allowed." };
  if (resolved.conn.status !== "accepted")
    return { error: "Connect first, then send a proposal." };

  const feeAmount = cofoundeeFee(monthly, months);

  const { error } = await admin.from("investor_deals").insert({
    connection_id: connectionId,
    proposed_by: user.id,
    proposer_side: resolved.side,
    equity_pct: equity,
    monthly_amount: monthly,
    monthly_currency: "THB",
    contract_months: months,
    payment_terms: paymentTerms || null,
    description: description || null,
    fee_amount: feeAmount,
    fee_currency: COFOUNDEE_FEE_CURRENCY,
    fee_type: "standard",
    status: "proposed",
  });
  if (error) {
    console.error("[funding.propose]", error);
    return { error: "Couldn't send the proposal. Try again." };
  }

  // Notify the other side that a funding proposal arrived.
  const conn = resolved.conn;
  if (resolved.side === "company") {
    const { data: co } = await admin
      .from("organizations")
      .select("name")
      .eq("id", conn.org_id)
      .maybeSingle();
    await notifyUsers([conn.investor_id], {
      actorId: user.id,
      type: "funding_proposed",
      entityId: connectionId,
      data: { actor_name: (co?.name as string) ?? "" },
    });
  } else {
    const [{ data: ip }, { data: p }] = await Promise.all([
      admin
        .from("investor_profiles")
        .select("firm_name")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    await notifyOrgMembers(conn.org_id, user.id, {
      actorId: user.id,
      type: "funding_proposed",
      entityId: connectionId,
      data: {
        actor_name:
          (ip?.firm_name as string) || (p?.full_name as string) || "",
      },
    });
  }

  revalidatePath("/funding");
  return {};
}

// ---- Confirm / decline / cancel a proposal -------------------------------
async function dealParty(
  supabase: SBClient,
  admin: AdminClient,
  dealId: string,
  userId: string,
): Promise<{
  deal: { id: string; status: string; proposer_side: string };
  side: "investor" | "company";
} | null> {
  const { data: deal } = await admin
    .from("investor_deals")
    .select("id, connection_id, status, proposer_side")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return null;
  const resolved = await callerSide(
    supabase,
    admin,
    deal.connection_id as string,
    userId,
  );
  if (!resolved) return null;
  return { deal: deal as never, side: resolved.side };
}

export async function confirmInvestorDealAction(
  dealId: string,
): Promise<{ error?: string }> {
  if (!isUuid(dealId)) return { error: "Invalid proposal." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const admin = createAdminClient();
  const p = await dealParty(supabase, admin, dealId, user.id);
  if (!p) return { error: "Not allowed." };
  if (p.deal.status !== "proposed") return { error: "Already handled." };
  // The side that didn't propose confirms.
  if (p.deal.proposer_side === p.side)
    return { error: "Waiting on the other side to confirm." };

  const { data: updated, error } = await admin
    .from("investor_deals")
    .update({
      status: "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId)
    .eq("status", "proposed")
    .select("id");
  if (error) {
    console.error("[funding.confirm]", error);
    return { error: "Couldn't confirm. Try again." };
  }
  if (!updated?.length) return { error: "Already handled." };
  revalidatePath("/funding");
  return {};
}

export async function declineInvestorDealAction(
  dealId: string,
): Promise<{ error?: string }> {
  if (!isUuid(dealId)) return { error: "Invalid proposal." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const admin = createAdminClient();
  const p = await dealParty(supabase, admin, dealId, user.id);
  if (!p) return { error: "Not allowed." };
  if (p.deal.status !== "proposed") return { error: "Already handled." };
  if (p.deal.proposer_side === p.side)
    return { error: "You proposed this — withdraw it instead." };

  const { data: updated, error } = await admin
    .from("investor_deals")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", dealId)
    .eq("status", "proposed")
    .select("id");
  if (error) {
    console.error("[funding.decline]", error);
    return { error: "Couldn't decline. Try again." };
  }
  if (!updated?.length) return { error: "Already handled." };
  revalidatePath("/funding");
  return {};
}

export async function cancelInvestorDealAction(
  dealId: string,
): Promise<{ error?: string }> {
  if (!isUuid(dealId)) return { error: "Invalid proposal." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const admin = createAdminClient();
  const p = await dealParty(supabase, admin, dealId, user.id);
  if (!p) return { error: "Not allowed." };
  if (p.deal.status !== "proposed") return { error: "Already handled." };
  if (p.deal.proposer_side !== p.side)
    return { error: "Only the side that proposed can withdraw." };

  const { data: updated, error } = await admin
    .from("investor_deals")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", dealId)
    .eq("status", "proposed")
    .select("id");
  if (error) {
    console.error("[funding.cancel]", error);
    return { error: "Couldn't withdraw. Try again." };
  }
  if (!updated?.length) return { error: "Already handled." };
  revalidatePath("/funding");
  return {};
}
