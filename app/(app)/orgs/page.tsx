import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { isInvestorAccount } from "@/lib/account";
import { tServer } from "@/lib/i18n-server";
import { OrgCard, OrgLogo, type OrgCardOrg } from "@/components/OrgCard";
import { InviteActions } from "./InviteActions";

export const dynamic = "force-dynamic";

// The card itself now lives in components/OrgCard.tsx so the investor's
// company browse on /funding renders the same company, the same way.
type OrgLite = OrgCardOrg;

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "partner" || tab === "funding" ? tab : "all";
  const user = await requireUser();
  const supabase = await createClient();
  const myEmail = (user.email ?? "").toLowerCase();
  // Investors browse companies for deal flow — they don't create or join one.
  const isInvestor = await isInvestorAccount(supabase, user.id);

  const [{ data: inviteRows }, { data: memberRows }, { data: allOrgs }] =
    await Promise.all([
      supabase
        .from("org_invites")
        .select("id, role, organizations(id, name, slug, tagline)")
        .eq("email", myEmail)
        .eq("status", "pending"),
      supabase
        .from("org_members")
        .select(
          "role, organizations(id, name, slug, tagline, logo_url, industry, location, capabilities, partnership_seeking, verified)",
        )
        .eq("user_id", user.id),
      supabase
        .from("organizations")
        .select(
          "id, name, slug, tagline, logo_url, industry, location, capabilities, partnership_seeking, seeking, verified",
        )
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

  const invites = (inviteRows ?? [])
    .map((r) => ({
      id: r.id as string,
      role: r.role as string,
      org: r.organizations as unknown as OrgLite | null,
    }))
    .filter((r) => r.org);

  const myOrgs = (memberRows ?? [])
    .map((r) => ({
      role: r.role as string,
      org: r.organizations as unknown as OrgLite | null,
    }))
    .filter((r) => r.org);
  const myOrgIds = new Set(myOrgs.map((m) => m.org!.id));

  const directory = ((allOrgs ?? []) as OrgLite[]).filter(
    (o) => !myOrgIds.has(o.id),
  );
  const filteredDirectory =
    activeTab === "all"
      ? directory
      : directory.filter((o) => (o.seeking ?? []).includes(activeTab));

  const tabAll = await tServer("All");
  const tabPartner = await tServer("Want a partner");
  const tabFunding = await tServer("Want funding");
  const noneInTab = await tServer("No companies in this tab yet.");
  const noneYet = await tServer("No companies yet — check back soon.");
  // Empty directory → the tabs still render; only the grid swaps for a card.
  const directoryEmptyMsg = directory.length === 0 ? noneYet : noneInTab;
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
      active
        ? "border-navy text-navy font-medium"
        : "border-transparent text-ink-muted hover:text-navy"
    }`;

  const invitedAsTpl = await tServer("Invited you as {role}");
  const offerLabel = await tServer("What we offer");
  const seekingLabel = await tServer("Looking for");
  const verifiedLabel = await tServer("Verified company");
  const roleLabels: Record<string, string> = {
    owner: await tServer("Owner"),
    admin: await tServer("Admin"),
    member: await tServer("Member"),
  };
  const roleLabel = (r: string) => roleLabels[r] ?? r;

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]">
      <div className="flex items-end justify-between mb-8">
        <div className="max-w-[640px]">
          <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-2">
            {await tServer(isInvestor ? "Discover" : "B2B")}
          </p>
          <h1 className="font-serif text-d2 text-navy leading-tight">
            {await tServer("Companies")}
          </h1>
          <p className="text-ink-muted mt-1">
            {await tServer(
              isInvestor
                ? "Browse Thai startups — see what they're building and who's raising."
                : "Create your company, invite your team, and connect with other companies.",
            )}
          </p>
        </div>
        {!isInvestor && (
          <Link
            href="/orgs/new"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            {await tServer("Create company")}
          </Link>
        )}
      </div>

      {/* Pending invites */}
      {!isInvestor && invites.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-4">
            {await tServer("Invitations")}
          </h2>
          <div className="space-y-3">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="bg-white border border-gold/40 p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <OrgLogo org={{ name: inv.org!.name, logo_url: null }} />
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-navy truncate">
                      {inv.org!.name}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {invitedAsTpl.replace("{role}", roleLabel(inv.role))}
                    </p>
                  </div>
                </div>
                <InviteActions inviteId={inv.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your companies (founders only) */}
      {!isInvestor && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-4">
            {await tServer("Your companies")}
          </h2>
        {myOrgs.length === 0 ? (
          <div className="bg-white border border-line p-8 text-center">
            <Building2 className="w-8 h-8 text-ink-muted mx-auto mb-3" />
            <p className="text-ink-muted mb-4">
              {await tServer("You're not part of any company yet.")}
            </p>
            <Link
              href="/orgs/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
            >
              <Plus className="w-4 h-4" />
              {await tServer("Create company")}
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myOrgs.map((m) => (
              <OrgCard
                key={m.org!.id}
                org={m.org!}
                role={roleLabel(m.role)}
                offerLabel={offerLabel}
                seekingLabel={seekingLabel}
                verifiedLabel={verifiedLabel}
              />
            ))}
          </div>
        )}
        </section>
      )}

      {/* Directory */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-4">
          {await tServer("All companies")}
        </h2>
        <nav className="flex items-center gap-1 mb-5 border-b border-line">
          <Link href="/orgs" className={tabCls(activeTab === "all")}>
            {tabAll}
          </Link>
          <Link
            href="/orgs?tab=partner"
            className={tabCls(activeTab === "partner")}
          >
            {tabPartner}
          </Link>
          <Link
            href="/orgs?tab=funding"
            className={tabCls(activeTab === "funding")}
          >
            {tabFunding}
          </Link>
        </nav>
        {filteredDirectory.length === 0 ? (
          <div className="bg-white border border-line p-8 text-center">
            <Building2 className="w-8 h-8 text-ink-muted mx-auto mb-3" />
            <p className="text-ink-muted">{directoryEmptyMsg}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDirectory.map((o) => (
              <OrgCard
                key={o.id}
                org={o}
                offerLabel={offerLabel}
                seekingLabel={seekingLabel}
                verifiedLabel={verifiedLabel}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
