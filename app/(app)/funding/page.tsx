import Link from "next/link";
import { ArrowRight, Building2, Clock, Check, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { INVESTOR_TYPE_LABELS } from "@/lib/investor";
import { Avatar } from "@/components/Avatar";
import { FundingConnect, FundingRespond } from "./FundingActions";

export const dynamic = "force-dynamic";

type ConnRow = {
  id: string;
  investor_id: string;
  org_id: string;
  status: string;
  requested_by: string;
};

export default async function FundingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  const isInvestor = profile?.account_type === "investor";
  const admin = createAdminClient();

  const heading = await tServer("Funding");
  const acceptedLabel = await tServer("Connected");
  const sentLabel = await tServer("Request sent");
  const openLabel = await tServer("Open");
  const declinedLabel = await tServer("Declined");
  const viewTalksLabel = await tServer("View funding talks");

  // ===================================================================
  // INVESTOR VIEW — companies I've connected with + discover companies
  // ===================================================================
  if (isInvestor) {
    const { data: connsRaw } = await admin
      .from("investor_connections")
      .select("id, investor_id, org_id, status, requested_by")
      .eq("investor_id", user.id);
    const conns = (connsRaw ?? []) as ConnRow[];
    const connByOrg = new Map(conns.map((c) => [c.org_id, c]));

    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name, slug, tagline, logo_url, verified")
      .order("created_at", { ascending: false })
      .limit(80);
    const orgList = orgs ?? [];
    const connectedOrgs = orgList.filter((o) => connByOrg.has(o.id as string));
    const discover = orgList.filter((o) => !connByOrg.has(o.id as string));

    return (
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">{heading}</h1>
          <p className="text-ink">
            {await tServer("Companies you've connected with, and new ones to back.")}
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-4">
            {await tServer("Your companies")}
          </h2>
          {connectedOrgs.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {await tServer("No connections yet — find a company below.")}
            </p>
          ) : (
            <div className="space-y-3">
              {connectedOrgs.map((o) => {
                const c = connByOrg.get(o.id as string)!;
                const respondable =
                  c.status === "pending" && c.requested_by === "company";
                return (
                  <div
                    key={o.id as string}
                    className="bg-white border border-line p-5 flex items-start gap-4"
                  >
                    <OrgLogo
                      url={o.logo_url as string | null}
                      name={o.name as string}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orgs/${o.slug}`}
                          className="font-serif text-lg text-navy hover:text-gold-ink truncate"
                        >
                          {o.name as string}
                        </Link>
                        {o.verified && (
                          <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-ink-muted truncate">
                        {(o.tagline as string | null) ?? ""}
                      </div>
                      {c.status === "accepted" && (
                        <Link
                          href={`/funding/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-navy mt-2 hover:text-gold-ink"
                        >
                          {viewTalksLabel}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="shrink-0">
                      <StatusPill
                        status={c.status}
                        respondable={respondable}
                        accepted={acceptedLabel}
                        sent={sentLabel}
                        declined={declinedLabel}
                      />
                      {respondable && <FundingRespond connectionId={c.id} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-4">
            {await tServer("Discover companies")}
          </h2>
          {discover.length === 0 ? (
            <div className="bg-white border border-line p-12 text-center">
              <Building2 className="w-8 h-8 text-ink-muted mx-auto mb-3" />
              <p className="text-ink-muted">
                {await tServer("No companies to show yet — check back soon.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {discover.map((o) => (
                <div
                  key={o.id as string}
                  className="bg-white border border-line p-5 flex items-center gap-4"
                >
                  <OrgLogo
                    url={o.logo_url as string | null}
                    name={o.name as string}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orgs/${o.slug}`}
                        className="font-serif text-lg text-navy hover:text-gold-ink truncate"
                      >
                        {o.name as string}
                      </Link>
                      {o.verified && (
                        <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-ink-muted truncate">
                      {(o.tagline as string | null) ?? ""}
                    </div>
                  </div>
                  <FundingConnect targetId={o.id as string} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ===================================================================
  // COMPANY VIEW — investors connected with my company + discover investors
  // ===================================================================
  const { data: myMemberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);
  const myOrgIds = (myMemberships ?? []).map((m) => m.org_id as string);

  if (myOrgIds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="text-3xl mb-2">{heading}</h1>
        <div className="bg-white border border-line p-12 text-center mt-6">
          <p className="text-ink-muted mb-6">
            {await tServer("Create a company to raise funding from investors.")}
          </p>
          <Link
            href="/orgs/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            {await tServer("Create company")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { data: connsRaw } = await admin
    .from("investor_connections")
    .select("id, investor_id, org_id, status, requested_by")
    .in("org_id", myOrgIds);
  const conns = (connsRaw ?? []) as ConnRow[];
  const connByInvestor = new Map(conns.map((c) => [c.investor_id, c]));

  // Investor-initiated model: a company never browses investors — it only sees
  // the investors who reached out to it. So load just the connected investors,
  // never the full investor list (protects the scarce, privacy-sensitive side).
  const investorIds = [...new Set(conns.map((c) => c.investor_id))];
  const { data: investorRows } = investorIds.length
    ? await admin
        .from("investor_profiles")
        .select("user_id, investor_type, firm_name")
        .in("user_id", investorIds)
    : {
        data: [] as {
          user_id: string;
          investor_type: string | null;
          firm_name: string | null;
        }[],
      };
  const connected = investorRows ?? [];
  const { data: people } = investorIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", investorIds)
    : { data: [] as { id: string; full_name: string | null; photo_url: string | null }[] };
  const personById = new Map(
    (people ?? []).map((p) => [p.id as string, p]),
  );

  const investorName = (uid: string, firm: string | null) =>
    firm || (personById.get(uid)?.full_name as string) || "Investor";

  // Slug → translated label, resolved up front so the card map stays sync.
  const typeLabels: Record<string, string> = Object.fromEntries(
    await Promise.all(
      Object.entries(INVESTOR_TYPE_LABELS).map(
        async ([slug, en]) => [slug, await tServer(en)] as const,
      ),
    ),
  );

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">{heading}</h1>
        <p className="text-ink">
          {await tServer("Investors who've reached out to your company.")}
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-4">
          {await tServer("Your investors")}
        </h2>
        {connected.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {await tServer(
              "No investor interest yet. Investors discover and reach out to companies here — keep your company profile strong.",
            )}
          </p>
        ) : (
          <div className="space-y-3">
            {connected.map((i) => {
              const uid = i.user_id as string;
              const c = connByInvestor.get(uid)!;
              const respondable =
                c.status === "pending" && c.requested_by === "investor";
              return (
                <div
                  key={uid}
                  className="bg-white border border-line p-5 flex items-start gap-4"
                >
                  <Avatar
                    name={personById.get(uid)?.full_name as string}
                    url={(personById.get(uid)?.photo_url as string | null) ?? null}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-lg text-navy">
                      {investorName(uid, i.firm_name as string | null)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {i.investor_type
                        ? typeLabels[i.investor_type as string] ??
                          (i.investor_type as string)
                        : ""}
                    </div>
                    {c.status === "accepted" && (
                      <Link
                        href={`/funding/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs text-navy mt-2 hover:text-gold-ink"
                      >
                        {viewTalksLabel}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <div className="shrink-0">
                    <StatusPill
                      status={c.status}
                      respondable={respondable}
                      accepted={acceptedLabel}
                      sent={sentLabel}
                      declined={declinedLabel}
                    />
                    {respondable && <FundingRespond connectionId={c.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* No "discover investors" — funding is investor-initiated. Companies are
          discoverable to investors on the investor view; they manage inbound
          interest here, they don't browse or cold-contact investors. */}
      {/* openLabel reserved for deal states on the detail page */}
      <span className="hidden">{openLabel}</span>
    </div>
  );
}

function OrgLogo({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="w-12 h-12 object-cover border border-line shrink-0"
      />
    );
  }
  return (
    <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center shrink-0">
      <Building2 className="w-5 h-5 text-ink-muted" />
    </div>
  );
}

function StatusPill({
  status,
  respondable,
  accepted,
  sent,
  declined,
}: {
  status: string;
  respondable: boolean;
  accepted: string;
  sent: string;
  declined: string;
}) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gold-ink mb-1">
        <Check className="w-3.5 h-3.5" /> {accepted}
      </span>
    );
  }
  if (status === "pending" && !respondable) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-ink-muted mb-1">
        <Clock className="w-3 h-3" /> {sent}
      </span>
    );
  }
  // A declined connection stays in the list — say so, don't render nothing.
  if (status === "declined") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-ink-muted border border-line bg-cream px-2 py-0.5 mb-1">
        <X className="w-3 h-3" /> {declined}
      </span>
    );
  }
  return null;
}
