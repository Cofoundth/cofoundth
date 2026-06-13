import Link from "next/link";
import { Building2, MapPin, Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { InviteActions } from "./InviteActions";

export const dynamic = "force-dynamic";

type OrgLite = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  industry: string[] | null;
  location: string | null;
  verified?: boolean | null;
};

function OrgLogo({ org }: { org: { name: string; logo_url: string | null } }) {
  if (org.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logo_url}
        alt=""
        className="w-12 h-12 object-cover border border-line shrink-0"
      />
    );
  }
  return (
    <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center shrink-0">
      <span className="font-serif text-lg text-navy">
        {org.name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}

function OrgCard({ org, role }: { org: OrgLite; role?: string }) {
  return (
    <Link
      href={`/orgs/${org.slug}`}
      className="block bg-white border border-line p-5 hover:border-navy transition-colors group"
    >
      <div className="flex items-start gap-4">
        <OrgLogo org={org} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg text-navy truncate group-hover:text-gold transition-colors">
              {org.name}
            </h3>
            {org.verified && (
              <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
            )}
            {role && (
              <span className="text-[10px] uppercase tracking-wider text-ink-muted border border-line px-1.5 py-0.5 shrink-0">
                {role}
              </span>
            )}
          </div>
          {org.tagline && (
            <p className="text-sm text-ink mt-1 line-clamp-2">{org.tagline}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
            {org.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gold" />
                {org.location}
              </span>
            )}
            {org.industry?.length ? (
              <span className="truncate">{org.industry.join(" · ")}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function OrgsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const myEmail = (user.email ?? "").toLowerCase();

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
          "role, organizations(id, name, slug, tagline, logo_url, industry, location, verified)",
        )
        .eq("user_id", user.id),
      supabase
        .from("organizations")
        .select(
          "id, name, slug, tagline, logo_url, industry, location, verified",
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

  const invitedAsTpl = await tServer("Invited you as {role}");

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
            {await tServer("B2B")}
          </p>
          <h1 className="font-serif text-3xl text-navy leading-tight">
            {await tServer("Companies")}
          </h1>
          <p className="text-ink-muted mt-1">
            {await tServer(
              "Create your company, invite your team, and connect with other companies.",
            )}
          </p>
        </div>
        <Link
          href="/orgs/new"
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          {await tServer("Create company")}
        </Link>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
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
                      {invitedAsTpl.replace("{role}", inv.role)}
                    </p>
                  </div>
                </div>
                <InviteActions inviteId={inv.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your companies */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
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
          <div className="grid sm:grid-cols-2 gap-4">
            {myOrgs.map((m) => (
              <OrgCard key={m.org!.id} org={m.org!} role={m.role} />
            ))}
          </div>
        )}
      </section>

      {/* Directory */}
      {directory.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
            {await tServer("All companies")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {directory.map((o) => (
              <OrgCard key={o.id} org={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
