import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getLocale, tServer } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { STAGE_LABELS } from "@/lib/matching";
import { Avatar } from "@/components/Avatar";
import { ManagePanel, type PanelMember } from "./ManagePanel";
import { LeaveButton } from "./LeaveButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("name, tagline")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Company" };
  return {
    title: data.name as string,
    description:
      (data.tagline as string | null) ?? `${data.name} on Cofoundee`,
  };
}

const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2 };

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <span
          key={c}
          className="text-xs text-ink border border-line bg-cream px-2.5 py-1"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, tagline, about, website, logo_url, industry, capabilities, partnership_seeking, stage, location, verified",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!org) notFound();

  const { data: memberRows } = await supabase
    .from("org_members")
    .select("role, profiles(id, full_name, photo_url, slug)")
    .eq("org_id", org.id);

  const members = (memberRows ?? [])
    .map((r) => {
      const p = r.profiles as unknown as {
        id: string;
        full_name: string | null;
        photo_url: string | null;
        slug: string | null;
      } | null;
      return {
        role: r.role as "owner" | "admin" | "member",
        id: p?.id ?? "",
        name: (p?.full_name as string) || "—",
        photo_url: p?.photo_url ?? null,
        slug: p?.slug ?? null,
      };
    })
    .filter((m) => m.id)
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  const myRole = members.find((m) => m.id === user.id)?.role ?? null;
  const isManager = myRole === "owner" || myRole === "admin";
  const isMember = myRole !== null;

  // Admins can read all the org's invites (RLS); others get nothing useful.
  let pendingInvites: { id: string; email: string; role: string }[] = [];
  if (isManager) {
    const { data: invRows } = await supabase
      .from("org_invites")
      .select("id, email, role")
      .eq("org_id", org.id)
      .eq("status", "pending");
    pendingInvites = (invRows ?? []).map((r) => ({
      id: r.id as string,
      email: r.email as string,
      role: r.role as string,
    }));
  }

  const industry = (org.industry as string[] | null) ?? [];
  const capabilities = (org.capabilities as string[] | null) ?? [];
  const seeking = (org.partnership_seeking as string[] | null) ?? [];
  const stageLabel = org.stage
    ? t(STAGE_LABELS[org.stage as string] ?? (org.stage as string), locale)
    : null;

  const panelMembers: PanelMember[] = members.map((m) => ({
    userId: m.id,
    name: m.name,
    role: m.role,
  }));

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/orgs"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {await tServer("Companies")}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logo_url as string}
            alt=""
            className="w-20 h-20 object-cover border border-line shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-cream border border-line flex items-center justify-center shrink-0">
            <span className="font-serif text-3xl text-navy">
              {(org.name as string).trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-3xl text-navy leading-tight">
              {org.name as string}
            </h1>
            {org.verified && <ShieldCheck className="w-5 h-5 text-gold" />}
            {stageLabel && (
              <span className="text-[11px] uppercase tracking-wider text-navy border border-navy bg-cream px-2 py-0.5">
                {stageLabel}
              </span>
            )}
          </div>
          {org.tagline && (
            <p className="text-lg text-ink mt-1.5">{org.tagline as string}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-ink-muted">
            {org.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gold" />
                {org.location as string}
              </span>
            )}
            {org.website && (
              <a
                href={org.website as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-navy"
              >
                <ExternalLink className="w-4 h-4 text-gold" />
                {await tServer("Website")}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {org.about && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                {await tServer("About")}
              </h2>
              <p className="text-ink leading-relaxed whitespace-pre-wrap">
                {org.about as string}
              </p>
            </section>
          )}

          {industry.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                {await tServer("Industry")}
              </h2>
              <Chips items={industry} />
            </section>
          )}

          {capabilities.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                {await tServer("What we offer")}
              </h2>
              <Chips items={capabilities} />
            </section>
          )}

          {seeking.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                {await tServer("Partnerships we're seeking")}
              </h2>
              <Chips items={seeking} />
            </section>
          )}
        </div>

        {/* Aside — team */}
        <aside className="space-y-4">
          <div className="bg-white border border-line p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
              {(await tServer("Team ({n})")).replace(
                "{n}",
                String(members.length),
              )}
            </h2>
            <ul className="space-y-3">
              {members.map((m) => {
                const inner = (
                  <>
                    <Avatar name={m.name} url={m.photo_url} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm text-navy truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                        {m.role}
                      </div>
                    </div>
                  </>
                );
                return (
                  <li key={m.id}>
                    {m.slug ? (
                      <Link
                        href={`/profile/${m.slug}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {isMember && !isManager && (
            <LeaveButton orgId={org.id as string} userId={user.id} />
          )}
        </aside>
      </div>

      {/* Manage (owner/admin) */}
      {isManager && (
        <div className="mt-10">
          <ManagePanel
            orgId={org.id as string}
            members={panelMembers}
            invites={pendingInvites}
            myUserId={user.id}
          />
          {myRole !== "owner" && (
            <div className="mt-4">
              <LeaveButton orgId={org.id as string} userId={user.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
