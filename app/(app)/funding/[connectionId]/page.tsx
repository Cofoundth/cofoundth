import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { isUuid } from "@/lib/slug";
import { COFOUNDEE_CALENDLY_URL } from "@/lib/calendly";
import { EmptyState } from "@/components/ui";
import { FundingProposalForm } from "../FundingProposalForm";
import { FundingDealActions } from "../FundingDealActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  proposed: "Awaiting confirmation",
  confirmed: "Confirmed — with Cofoundee",
  admin_review: "With Cofoundee",
  signed: "Signed",
  declined: "Declined",
  cancelled: "Withdrawn",
};

// Terminal states read at a glance: signed is the win (filled gold), dead deals
// are struck through and muted, everything still in play keeps the navy outline.
const PILL_BASE =
  "text-xs uppercase tracking-wider px-2 py-0.5 shrink-0 border rounded-full";
function pillCls(status: string) {
  if (status === "signed") return `${PILL_BASE} bg-gold border-line text-navy`;
  if (status === "declined" || status === "cancelled") {
    return `${PILL_BASE} bg-cream border-line text-ink-muted line-through`;
  }
  return `${PILL_BASE} bg-cream border-navy text-navy`;
}

type Props = { params: Promise<{ connectionId: string }> };

export default async function FundingDetailPage({ params }: Props) {
  const { connectionId } = await params;
  if (!isUuid(connectionId)) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: conn } = await admin
    .from("investor_connections")
    .select("id, investor_id, org_id, status")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) notFound();

  // Which side is the viewer on?
  let side: "investor" | "company" | null = null;
  if ((conn.investor_id as string) === user.id) side = "investor";
  else {
    const { data: m } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", conn.org_id as string)
      .eq("user_id", user.id)
      .maybeSingle();
    if (m) side = "company";
  }
  if (!side) redirect("/funding");
  if (conn.status !== "accepted") redirect("/funding");

  // The other party's display name.
  let otherName = "";
  if (side === "investor") {
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", conn.org_id as string)
      .maybeSingle();
    otherName = (org?.name as string) ?? "Company";
  } else {
    const [{ data: ip }, { data: p }] = await Promise.all([
      admin
        .from("investor_profiles")
        .select("firm_name")
        .eq("user_id", conn.investor_id as string)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", conn.investor_id as string)
        .maybeSingle(),
    ]);
    otherName =
      (ip?.firm_name as string) || (p?.full_name as string) || "Investor";
  }

  // Deals on this connection (RLS-scoped to the parties).
  const { data: dealsRaw } = await supabase
    .from("investor_deals")
    .select(
      "id, proposer_side, equity_pct, monthly_amount, monthly_currency, contract_months, payment_terms, description, fee_amount, status, created_at",
    )
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false });
  const deals = dealsRaw ?? [];

  const dealsView = await Promise.all(
    deals.map(async (d) => ({
      id: d.id as string,
      statusLabel: await tServer(
        STATUS_LABELS[d.status as string] ?? (d.status as string),
      ),
      status: d.status as string,
      equity: d.equity_pct as number | null,
      monthly: d.monthly_amount as number | null,
      months: d.contract_months as number | null,
      payment: d.payment_terms as string | null,
      description: d.description as string | null,
      fee: d.fee_amount as number | null,
      // proposer side === viewer side → viewer can withdraw; else confirm
      actionRole:
        (d.proposer_side as string) === side
          ? ("withdraw" as const)
          : ("confirm" as const),
    })),
  );

  const equityLabel = await tServer("equity");
  const perMonthLabel = await tServer("/mo");
  const monthsLabel = await tServer("months");
  const feeLabel = await tServer("Cofoundee fee");
  const bookSigning = await tServer("Book your signing slot");

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-10 py-[88px]">
      <Link
        href="/funding"
        className="text-xs text-ink-muted hover:text-navy mb-3 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3 h-3" /> {await tServer("Funding")}
      </Link>
      <h1 className="text-d2 mb-1">{otherName}</h1>
      <p className="text-ink-muted mb-8">
        {await tServer("Agree on terms, then Cofoundee coordinates the signing.")}
      </p>

      {/* Propose */}
      <div className="bg-white p-6 mb-8 rounded-3xl shadow-xs">
        <h2 className="text-lg font-bold tracking-normal mb-5">
          {await tServer("Send a proposal")}
        </h2>
        <FundingProposalForm connectionId={connectionId} />
      </div>

      {/* Existing proposals */}
      <div>
        <h2 className="text-lg font-bold tracking-normal mb-5">
          {await tServer("Proposals")}
        </h2>
        {dealsView.length === 0 ? (
          // KIND A — a two-sided negotiation, so "neither of us has proposed
          // anything" is real information. The form that fixes it is directly
          // above, which is why there is no button here.
          <EmptyState
            dense
            padding="lg"
            description={await tServer(
              "No proposals yet — send the first one above.",
            )}
          />
        ) : (
          <div className="space-y-3">
            {dealsView.map((d) => (
              <div key={d.id} className="bg-white p-5 rounded-3xl shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-navy">
                    {d.equity != null && (
                      <span>
                        {Number(d.equity)}% {equityLabel}
                      </span>
                    )}
                    {d.monthly != null && (
                      <span>
                        {d.equity != null ? " · " : ""}฿
                        {Number(d.monthly).toLocaleString()}
                        {perMonthLabel}
                      </span>
                    )}
                    {d.months != null && (
                      <span>
                        {" · "}
                        {d.months} {monthsLabel}
                      </span>
                    )}
                  </div>
                  <span className={pillCls(d.status)}>{d.statusLabel}</span>
                </div>
                {d.payment && (
                  <div className="text-xs text-ink-muted mt-1">{d.payment}</div>
                )}
                {d.fee != null && (
                  <div className="text-xs text-gold-ink mt-1">
                    {feeLabel}: ฿{Number(d.fee).toLocaleString()}
                  </div>
                )}
                {d.description && (
                  <p className="text-sm text-ink mt-2 whitespace-pre-wrap">
                    {d.description}
                  </p>
                )}

                {d.status === "proposed" && (
                  <div className="mt-3">
                    <FundingDealActions dealId={d.id} role={d.actionRole} />
                  </div>
                )}
                {(d.status === "confirmed" || d.status === "admin_review") && (
                  <div className="mt-3">
                    <a
                      href={COFOUNDEE_CALENDLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-navy-dark text-white text-xs transition-colors rounded-full"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      {bookSigning}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
