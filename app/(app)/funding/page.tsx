import Link from "next/link";
import { ArrowRight, Building2, Clock, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { INVESTOR_TYPE_LABELS } from "@/lib/investor";
import { Avatar } from "@/components/Avatar";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import { OrgCard, type OrgCardOrg } from "@/components/OrgCard";
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

    // Same columns /orgs selects — the investor browses companies through the
    // same OrgCard, so it needs the same signals (location, industry, what the
    // company offers, what it's looking for), not just a name and a tagline.
    const { data: orgs } = await admin
      .from("organizations")
      .select(
        "id, name, slug, tagline, logo_url, industry, location, capabilities, partnership_seeking, verified",
      )
      .order("created_at", { ascending: false })
      .limit(80);
    const orgList = (orgs ?? []) as OrgCardOrg[];
    const connectedOrgs = orgList.filter((o) => connByOrg.has(o.id));
    const discover = orgList.filter((o) => !connByOrg.has(o.id));

    // OrgCard takes already-translated labels — resolve them once, here, so the
    // card maps below stay synchronous.
    const offerLabel = await tServer("What we offer");
    const seekingLabel = await tServer("Looking for");
    const verifiedLabel = await tServer("Verified company");

    return (
      <Section>
        <div className="max-w-[640px] mb-8">
          <h1 className="text-d3 mb-2">{heading}</h1>
          <p className="text-ink">
            {await tServer("Companies you've connected with, and new ones to back.")}
          </p>
        </div>

        <section className="mb-14">
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {await tServer("Your companies")}
          </h2>
          {connectedOrgs.length === 0 ? (
            // KIND A — nothing here yet, and the fix is the list right below,
            // so the copy points at it rather than carrying a button. When
            // there is nothing below either, say that instead of sending
            // someone to an empty section.
            <EmptyState
              dense
              padding="lg"
              description={
                discover.length > 0
                  ? await tServer("No connections yet — find a company below.")
                  : await tServer(
                      "No connections yet. Companies you connect with show up here.",
                    )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {connectedOrgs.map((o) => {
                const c = connByOrg.get(o.id)!;
                const respondable =
                  c.status === "pending" && c.requested_by === "company";
                return (
                  <OrgCard
                    key={o.id}
                    org={o}
                    offerLabel={offerLabel}
                    seekingLabel={seekingLabel}
                    verifiedLabel={verifiedLabel}
                    footer={
                      c.status === "accepted" ? (
                        <Link
                          href={`/funding/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-navy mt-2 hover:text-gold-ink"
                        >
                          {viewTalksLabel}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : null
                    }
                    action={
                      <>
                        <StatusPill
                          status={c.status}
                          respondable={respondable}
                          accepted={acceptedLabel}
                          sent={sentLabel}
                          declined={declinedLabel}
                        />
                        {respondable && <FundingRespond connectionId={c.id} />}
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {await tServer("Discover companies")}
          </h2>
          {discover.length === 0 ? (
            orgList.length > 0 ? (
              // Every company on the platform is already a connection of
              // theirs — not "nothing exists", so don't say that.
              <EmptyState
                icon={Building2}
                title={await tServer("You're connected with every company")}
                description={await tServer(
                  "New companies show up here as they join.",
                )}
              />
            ) : (
              // KIND A — no companies exist yet. An investor cannot create one
              // (/orgs/new is founder-only) and every other in-app surface is
              // just as empty, so there is no CTA that would not be a dead end.
              <EmptyState
                icon={Building2}
                title={await tServer("No companies here yet")}
                description={await tServer(
                  "Founders create a company page when they're open to funding. You'll see them here as soon as they do.",
                )}
              />
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {discover.map((o) => (
                <OrgCard
                  key={o.id}
                  org={o}
                  offerLabel={offerLabel}
                  seekingLabel={seekingLabel}
                  verifiedLabel={verifiedLabel}
                  action={<FundingConnect targetId={o.id} />}
                />
              ))}
            </div>
          )}
        </section>
      </Section>
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
      <Section>
        <h1 className="text-d3 mb-8">{heading}</h1>
        {/* KIND A — this founder has no company yet, and creating one is the
            real next step. Founder-only branch, so /orgs/new is reachable. */}
        <EmptyState
          icon={Building2}
          title={await tServer("No company page yet")}
          description={await tServer(
            "Create a company to raise funding from investors.",
          )}
          action={
            <LinkButton href="/orgs/new">
              {await tServer("Create company")}{" "}
              <ArrowRight className="w-4 h-4" />
            </LinkButton>
          }
        />
      </Section>
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
    <Section>
      <div className="max-w-[640px] mb-8">
        <h1 className="text-d3 mb-2">{heading}</h1>
        <p className="text-ink">
          {await tServer("Investors who've reached out to your company.")}
        </p>
      </div>

      <section className="mb-14">
        <h2 className="text-lg font-bold tracking-normal mb-5">
          {await tServer("Your investors")}
        </h2>
        {connected.length === 0 ? (
          // KIND A — funding is investor-initiated, so there is deliberately no
          // "browse investors" CTA to offer here. The line says what the
          // company can actually influence instead.
          <EmptyState
            dense
            padding="lg"
            description={await tServer(
              "No investor interest yet. Investors discover and reach out to companies here — keep your company profile strong.",
            )}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {connected.map((i) => {
              const uid = i.user_id as string;
              const c = connByInvestor.get(uid)!;
              const respondable =
                c.status === "pending" && c.requested_by === "investor";
              return (
                <div
                  key={uid}
                  className="bg-white p-5 flex items-start gap-4 rounded-3xl shadow-xs"
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
    </Section>
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
      <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-ink-muted mb-1">
        <Clock className="w-3 h-3" /> {sent}
      </span>
    );
  }
  // A declined connection stays in the list — say so, don't render nothing.
  if (status === "declined") {
    return (
      <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-ink-muted border border-line bg-cream px-2 py-0.5 mb-1 rounded-full">
        <X className="w-3 h-3" /> {declined}
      </span>
    );
  }
  return null;
}
