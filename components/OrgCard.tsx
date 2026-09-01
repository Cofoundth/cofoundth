// Cofoundee — the one company card. SERVER-SAFE.
//
// NO "use client" directive and NO useT() inside: every label arrives already
// translated (`offerLabel`, `seekingLabel`, `verifiedLabel`, `role`), so this
// renders from the server pages that own company lists — /orgs and the
// investor side of /funding — which translate with `await tServer(...)`.
// A client component may still pass `tr(...)` for the same props.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
// The app had two company-browse surfaces that disagreed: /orgs rendered a
// rich card (logo/initial, location, industry, capability + partnership tags,
// verified mark) while the investor's /funding rendered a bare row (logo, name,
// truncated tagline, Connect). Same object, two levels of information — and the
// side that actually needs to judge a company got the poorer one. Markup here
// is the /orgs card copied verbatim; /funding adopts it and passes its Connect
// button / status pill through `action`.
//
// ── THE TWO SHAPES ────────────────────────────────────────────────────────
// Without `action` the whole card is one <Link> (the /orgs behaviour, kept
// byte-for-byte). With `action` it CANNOT be: a <button> inside an <a> is
// invalid HTML and every Connect click would also navigate. So the wrapper
// becomes a plain Card and the company name carries the link instead.
//
// SHARP CORNERS ALWAYS — never add a rounded-* utility here.

import Link from "next/link";
import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Card, VerifiedBadge } from "@/components/ui";

export type OrgCardOrg = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  industry: string[] | null;
  location: string | null;
  capabilities: string[] | null;
  partnership_seeking: string[] | null;
  seeking?: string[] | null;
  verified?: boolean | null;
};

export function OrgLogo({
  org,
}: {
  org: { name: string; logo_url: string | null };
}) {
  if (org.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logo_url}
        alt={org.name}
        className="w-12 h-12 object-cover border border-line shrink-0 rounded-xl"
      />
    );
  }
  return (
    <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center shrink-0 rounded-xl">
      <span className="font-serif text-lg text-navy">
        {org.name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}

function CardTags({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <div className="mt-2.5">
      <div className="text-[10px] uppercase tracking-wider text-gold-ink mb-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <span
            key={c}
            className="text-[11px] text-ink border border-line bg-cream px-2 py-0.5 rounded-full"
          >
            {c}
          </span>
        ))}
        {extra > 0 && (
          <span className="text-[11px] text-ink-muted self-center">+{extra}</span>
        )}
      </div>
    </div>
  );
}

export type OrgCardProps = {
  org: OrgCardOrg;
  /** Already-translated membership role pill, e.g. tServer("Owner"). */
  role?: string;
  /** Already-translated, e.g. tServer("What we offer"). */
  offerLabel: string;
  /** Already-translated, e.g. tServer("Looking for"). */
  seekingLabel: string;
  /** Already-translated accessible name for the verified mark. */
  verifiedLabel: string;
  /**
   * Right-hand affordance — the Connect button on the investor's discover list,
   * the status pill + accept/decline on their connected list. Presence of this
   * switches the card off the whole-card-link shape (see header note).
   */
  action?: ReactNode;
  /**
   * Extra content under the tags, inside the text column: /funding uses it for
   * the "View funding talks" link, which belongs with the company's details
   * rather than in the action column.
   */
  footer?: ReactNode;
  /** Overrides the default `/orgs/{slug}` destination. */
  href?: string;
};

export function OrgCard({
  org,
  role,
  offerLabel,
  seekingLabel,
  verifiedLabel,
  action,
  footer,
  href,
}: OrgCardProps) {
  const hasMeta = org.location || org.industry?.length;
  const target = href ?? `/orgs/${org.slug}`;
  // Whole-card link → the title tracks the card's hover. Action card → the
  // title IS the link, so it owns its own hover.
  const titleCls = action
    ? "font-serif text-lg text-navy truncate transition-colors"
    : "font-serif text-lg text-navy truncate group-hover:text-gold-ink transition-colors";

  const body = (
    <div className="flex items-start gap-4">
      <OrgLogo org={org} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={titleCls}>
            {action ? (
              <Link
                href={target}
                className="hover:text-gold-ink transition-colors"
              >
                {org.name}
              </Link>
            ) : (
              org.name
            )}
          </h3>
          {org.verified && <VerifiedBadge label={verifiedLabel} />}
          {role && (
            <span className="text-[10px] uppercase tracking-wider text-ink-muted border border-line px-1.5 py-0.5 shrink-0 rounded-full">
              {role}
            </span>
          )}
        </div>
        {org.tagline && (
          <p className="text-sm text-ink mt-1 line-clamp-2">{org.tagline}</p>
        )}
        {hasMeta && (
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
            {org.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gold-ink" />
                {org.location}
              </span>
            )}
            {org.industry?.length ? (
              <span className="truncate">{org.industry.join(" · ")}</span>
            ) : null}
          </div>
        )}
        <CardTags label={offerLabel} items={org.capabilities ?? []} />
        <CardTags label={seekingLabel} items={org.partnership_seeking ?? []} />
        {footer}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );

  if (action) {
    return <Card padding="sm">{body}</Card>;
  }

  return (
    <Link
      href={target}
      className="block bg-white rounded-3xl shadow-xs p-5 hover:shadow-sm transition-shadow group"
    >
      {body}
    </Link>
  );
}
