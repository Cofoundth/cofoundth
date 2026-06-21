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

export default async function AdminDealsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  if (!(await isAdminUser(supabase, user))) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: dealRows } = await admin
    .from("org_deals")
    .select(
      "id, title, deal_type, status, value_amount, value_currency, proposer_org, responder_org, confirmed_at",
    )
    .in("status", ["confirmed", "admin_review", "signed"])
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

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
        {await tServer("Admin")}
      </p>
      <h1 className="font-serif text-3xl text-navy leading-tight mb-1">
        {await tServer("Deals")}
      </h1>
      <p className="text-ink-muted mb-8">
        {await tServer(
          "Agreed deals waiting for Cofoundee to coordinate the contract signing.",
        )}
      </p>

      {dealsView.length === 0 ? (
        <div className="bg-white border border-line p-8 text-center text-ink-muted">
          {await tServer("No agreed deals yet.")}
        </div>
      ) : (
        <div className="bg-white border border-line divide-y divide-line">
          {dealsView.map((d) => (
            <div key={d.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-serif text-lg text-navy">{d.title}</div>
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
      )}
    </div>
  );
}
