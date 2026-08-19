import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import { AdminTabs } from "@/components/AdminTabs";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  integration: "Integration",
  distribution: "Distribution",
  white_label: "White label",
  co_marketing: "Co-marketing",
  vendor_supplier: "Vendor / supplier",
  partnership: "Partnership",
  other: "Other",
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed — needs coordination",
  admin_review: "In progress",
  signed: "Signed",
};
const OPEN_STATES = ["confirmed", "admin_review", "signed"];

export default async function AdminDealsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  if (!(await isAdminUser(supabase, user))) redirect("/dashboard");

  const admin = createAdminClient();

  // ---- B2B (company ↔ company) deals --------------------------------------
  const { data: dealRows } = await admin
    .from("org_deals")
    .select(
      "id, title, deal_type, status, value_amount, value_currency, proposer_org, responder_org, confirmed_at",
    )
    .in("status", OPEN_STATES)
    .order("confirmed_at", { ascending: false, nullsFirst: false });
  const deals = dealRows ?? [];
  const orgIds = [
    ...new Set(
      deals.flatMap((d) => [d.proposer_org as string, d.responder_org as string]),
    ),
  ];
  const { data: orgs } = orgIds.length
    ? await admin.from("organizations").select("id, name, slug").in("id", orgIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const orgMap = new Map(
    (orgs ?? []).map((o) => [o.id as string, o as { name: string; slug: string }]),
  );

  const dealsView = await Promise.all(
    deals.map(async (d) => ({
      id: d.id as string,
      title: d.title as string,
      typeLabel: await tServer(
        TYPE_LABELS[d.deal_type as string] ?? (d.deal_type as string),
      ),
      statusLabel: await tServer(
        STATUS_LABELS[d.status as string] ?? (d.status as string),
      ),
      proposer: orgMap.get(d.proposer_org as string),
      responder: orgMap.get(d.responder_org as string),
      value:
        d.value_amount != null
          ? `${Number(d.value_amount).toLocaleString()} ${d.value_currency ?? ""}`.trim()
          : null,
    })),
  );

  // ---- Investor ↔ company funding deals -----------------------------------
  const { data: fundingRows } = await admin
    .from("investor_deals")
    .select(
      "id, connection_id, status, equity_pct, monthly_amount, monthly_currency, contract_months, fee_amount, confirmed_at",
    )
    .in("status", OPEN_STATES)
    .order("confirmed_at", { ascending: false, nullsFirst: false });
  const funding = fundingRows ?? [];
  const connIds = [...new Set(funding.map((f) => f.connection_id as string))];
  const { data: fconns } = connIds.length
    ? await admin
        .from("investor_connections")
        .select("id, org_id, investor_id")
        .in("id", connIds)
    : { data: [] as { id: string; org_id: string; investor_id: string }[] };
  const connMap = new Map((fconns ?? []).map((c) => [c.id as string, c]));
  const fOrgIds = [...new Set((fconns ?? []).map((c) => c.org_id as string))];
  const fInvIds = [...new Set((fconns ?? []).map((c) => c.investor_id as string))];
  const { data: fOrgs } = fOrgIds.length
    ? await admin.from("organizations").select("id, name, slug").in("id", fOrgIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const fOrgMap = new Map(
    (fOrgs ?? []).map((o) => [o.id as string, o as { name: string; slug: string }]),
  );
  const [{ data: fFirms }, { data: fPeople }] = await Promise.all([
    fInvIds.length
      ? admin.from("investor_profiles").select("user_id, firm_name").in("user_id", fInvIds)
      : Promise.resolve({ data: [] as { user_id: string; firm_name: string | null }[] }),
    fInvIds.length
      ? admin.from("profiles").select("id, full_name").in("id", fInvIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);
  const fFirmMap = new Map(
    (fFirms ?? []).map((i) => [i.user_id as string, i.firm_name as string | null]),
  );
  const fNameMap = new Map(
    (fPeople ?? []).map((p) => [p.id as string, p.full_name as string | null]),
  );

  const equityW = await tServer("equity");
  const moW = await tServer("/mo");
  const monthsW = await tServer("months");
  const investorW = await tServer("Investor");
  const feeW = await tServer("Cofoundee fee");

  const fundingView = await Promise.all(
    funding.map(async (f) => {
      const conn = connMap.get(f.connection_id as string);
      const org = conn ? fOrgMap.get(conn.org_id as string) : undefined;
      const invName = conn
        ? fFirmMap.get(conn.investor_id as string) ||
          fNameMap.get(conn.investor_id as string) ||
          "Investor"
        : "Investor";
      const terms = [
        f.equity_pct != null ? `${Number(f.equity_pct)}% ${equityW}` : null,
        f.monthly_amount != null
          ? `${Number(f.monthly_amount).toLocaleString()} ${f.monthly_currency}${moW}`
          : null,
        f.contract_months != null ? `${f.contract_months} ${monthsW}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        id: f.id as string,
        org,
        invName,
        statusLabel: await tServer(
          STATUS_LABELS[f.status as string] ?? (f.status as string),
        ),
        terms,
        fee: f.fee_amount as number | null,
      };
    }),
  );

  const empty = dealsView.length === 0 && fundingView.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-2">
        {await tServer("Admin")}
      </p>
      <h1 className="font-serif text-d2 lg:text-d3 text-navy leading-tight mb-1">
        {await tServer("Deals")}
      </h1>
      <p className="text-ink-muted mb-8">
        {await tServer(
          "Agreed deals waiting for Cofoundee to coordinate the contract signing.",
        )}
      </p>

      {empty ? (
        <div className="bg-white border border-line p-8 text-center text-ink-muted">
          {await tServer("No agreed deals yet.")}
        </div>
      ) : (
        <div className="space-y-10">
          {dealsView.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
                {await tServer("Partnership deals")}
              </h2>
              <div className="bg-white border border-line divide-y divide-line">
                {dealsView.map((d) => (
                  <div key={d.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-serif text-lg text-navy">
                          {d.title}
                        </div>
                        <div className="text-sm text-ink-muted mt-0.5">
                          {d.proposer?.slug ? (
                            <Link
                              href={`/orgs/${d.proposer.slug}`}
                              className="hover:text-navy"
                            >
                              {d.proposer?.name}
                            </Link>
                          ) : (
                            d.proposer?.name
                          )}{" "}
                          ↔{" "}
                          {d.responder?.slug ? (
                            <Link
                              href={`/orgs/${d.responder.slug}`}
                              className="hover:text-navy"
                            >
                              {d.responder?.name}
                            </Link>
                          ) : (
                            d.responder?.name
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] uppercase tracking-wider text-navy border border-navy bg-cream px-2 py-0.5 shrink-0">
                        {d.statusLabel}
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted mt-2">
                      {d.typeLabel}
                      {d.value ? ` · ${d.value}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {fundingView.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
                {await tServer("Funding deals")}
              </h2>
              <div className="bg-white border border-line divide-y divide-line">
                {fundingView.map((f) => (
                  <div key={f.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-serif text-lg text-navy">
                          {f.org?.slug ? (
                            <Link
                              href={`/orgs/${f.org.slug}`}
                              className="hover:text-gold"
                            >
                              {f.org?.name}
                            </Link>
                          ) : (
                            (f.org?.name ?? "Company")
                          )}
                        </div>
                        <div className="text-sm text-ink-muted mt-0.5">
                          {investorW}: {f.invName}
                        </div>
                      </div>
                      <span className="text-[11px] uppercase tracking-wider text-navy border border-navy bg-cream px-2 py-0.5 shrink-0">
                        {f.statusLabel}
                      </span>
                    </div>
                    {f.terms && (
                      <div className="text-xs text-ink-muted mt-2">{f.terms}</div>
                    )}
                    {f.fee != null && (
                      <div className="text-xs text-gold mt-1">
                        {feeW}: ฿{Number(f.fee).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
