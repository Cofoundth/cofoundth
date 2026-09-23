import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { isInvestorAccount } from "@/lib/account";
import { tServer } from "@/lib/i18n-server";
import { OrgCard, OrgLogo, type OrgCardOrg } from "@/components/OrgCard";
import {
  Card,
  EmptyState,
  LinkButton,
  Section,
  SectionHeading,
  Tabs,
} from "@/components/ui";
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
  // TWO different empties, and they need opposite answers:
  //   directory.length === 0      nothing is listed at all → invite them to
  //                               list the first one (or, for an investor who
  //                               cannot, point at the founder directory).
  //   filteredDirectory empty     the TAB filtered everything out → the data
  //                               exists, so offer the way back to "All".
  //                               Never "create the first one" here.
  //
  // `directory` excludes the viewer's OWN companies, so "be the first to list
  // one" is only true for someone who has none — a founder who created the
  // only company on the platform must not be told to create it again.
  const canListFirst = !isInvestor && myOrgs.length === 0;
  const createCompanyLabel = await tServer("Create company");
  const emptyDirectoryTitle = await tServer("No companies yet");
  let emptyDirectoryBodyEn: string;
  if (canListFirst) {
    emptyDirectoryBodyEn =
      "Be the first to list one. Add your company and other founders will see what you're building.";
  } else if (isInvestor) {
    emptyDirectoryBodyEn =
      "Companies list themselves here as they join. The founder directory is where to see who's building right now.";
  } else {
    emptyDirectoryBodyEn =
      "Yours is the only one so far. More list themselves as the community grows — the founder directory is where to meet people meanwhile.";
  }
  const emptyDirectoryBody = await tServer(emptyDirectoryBodyEn);
  const browseFoundersLabel = await tServer("Browse founders");
  const noneInTab = await tServer("No companies in this tab yet.");
  const seeAllLabel = await tServer("See all");
  const directoryTabs = [
    { key: "all", label: tabAll, href: "/orgs" },
    { key: "partner", label: tabPartner, href: "/orgs?tab=partner" },
    { key: "funding", label: tabFunding, href: "/orgs?tab=funding" },
  ];

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
    <Section>
      <div className="flex items-end justify-between mb-8">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="text-d2 truncate">{await tServer("Companies")}</h1>
          <span className="shrink-0 text-sm text-ink-muted">
            {directory.length}{" "}
            {await tServer(directory.length === 1 ? "company" : "companies")}
          </span>
        </div>
        {!isInvestor && (
          // px-5 py-2.5 is the documented off-scale pad (between sm and md) —
          // kept as an override so the migration is a pixel no-op. `hidden
          // sm:inline-flex` replaces the primitive's base `inline-flex`.
          <LinkButton
            href="/orgs/new"
            className="hidden sm:inline-flex px-5 py-2.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {await tServer("Create company")}
          </LinkButton>
        )}
      </div>

      {/* Pending invites */}
      {!isInvestor && invites.length > 0 && (
        <section className="mb-14">
          <SectionHeading title={await tServer("Invitations")} />
          <div className="space-y-3">
            {invites.map((inv) => (
              <Card
                key={inv.id}
                padding="sm"
                className="flex items-center justify-between gap-4"
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
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Your companies (founders only) */}
      {!isInvestor && (
        <section className="mb-14">
          <SectionHeading title={await tServer("Your companies")} />
        {myOrgs.length === 0 ? (
          <EmptyState
            padding="lg"
            icon={Building2}
            title={await tServer("Add your company")}
            description={await tServer(
              "Create a company profile to show what you offer, invite your team, and connect with other companies here.",
            )}
            action={
              <LinkButton href="/orgs/new" size="sm">
                <Plus className="w-4 h-4" />
                {createCompanyLabel}
              </LinkButton>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
        <SectionHeading title={await tServer("All companies")} />
        <Tabs
          items={directoryTabs}
          value={activeTab}
          className="mb-5"
          aria-label={await tServer("All companies")}
        />
        {filteredDirectory.length === 0 ? (
          directory.length === 0 ? (
            <EmptyState
              padding="lg"
              icon={Building2}
              title={emptyDirectoryTitle}
              description={emptyDirectoryBody}
              action={
                canListFirst ? (
                  <LinkButton href="/orgs/new" size="sm">
                    <Plus className="w-4 h-4" />
                    {createCompanyLabel}
                  </LinkButton>
                ) : (
                  <LinkButton
                    href={isInvestor ? "/founders" : "/browse"}
                    size="sm"
                    variant="secondary"
                  >
                    {browseFoundersLabel}
                  </LinkButton>
                )
              }
            />
          ) : (
            <EmptyState
              dense
              padding="lg"
              description={noneInTab}
              action={
                <LinkButton href="/orgs" size="sm" variant="secondary">
                  {seeAllLabel}
                </LinkButton>
              }
            />
          )
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
    </Section>
  );
}
