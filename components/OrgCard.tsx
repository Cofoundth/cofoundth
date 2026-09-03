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
import {
  Card,
  CardChip,
  CardLabel,
  SectorList,
  VerifiedBadge,
} from "@/components/ui";

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
  const target = href ?? `/orgs/${org.slug}`;
  // Whole-card link → the title tracks the card's hover. Action card → the
  // title IS the link, so it owns its own hover.
  const titleCls = action
    ? "font-serif text-lg text-navy truncate transition-colors"
    : "font-serif text-lg text-navy truncate group-hover:text-gold-ink transition-colors";

  // The directory-card skeleton /browse and /founders run: a 48px header row
  // (logo | name + meta | right cluster) with NOTHING below it indented past
  // the logo, then full-width body rows at RESERVED heights so every card in
  // a row shares one y-grid. The old shape put the logo in a left column and
  // indented every row beside it — the same notch anatomy the founder cards
  // dropped.
  const body = (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex gap-3 items-center">
        <OrgLogo org={org} />
        <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-none">
            {action ? (
              <Link
                href={target}
                className="truncate hover:text-gold-ink transition-colors"
              >
                {org.name}
              </Link>
            ) : (
              <span className={`truncate ${titleCls.includes("group-hover") ? "group-hover:text-gold-ink transition-colors" : ""}`}>
                {org.name}
              </span>
            )}
            {org.verified && <VerifiedBadge label={verifiedLabel} />}
            {role && (
              <span className="text-xs normal-case tracking-normal text-ink-muted border border-line px-1.5 py-0.5 shrink-0 rounded-full">
                {role}
              </span>
            )}
          </h3>
          {org.location && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted overflow-hidden">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{org.location}</span>
            </div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="mt-4 flex flex-col gap-4 flex-1 min-h-0">
        {/* Sectors as the marked dot-run, reserved even when empty. */}
        <div className="flex h-[21px] items-center overflow-hidden">
          <SectorList items={org.industry ?? []} />
        </div>

        {org.tagline && (
          <p className="text-xs leading-relaxed text-ink-muted line-clamp-2 min-h-[39px]">
            {org.tagline}
          </p>
        )}

        {(org.capabilities ?? []).length > 0 && (
          <div className="flex flex-col gap-1.5 min-w-0">
            <CardLabel>{offerLabel}</CardLabel>
            <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
              {(org.capabilities ?? []).slice(0, 3).map((c) => (
                <CardChip key={c}>{c}</CardChip>
              ))}
            </div>
          </div>
        )}

        {(org.partnership_seeking ?? []).length > 0 && (
          <div className="mt-auto flex flex-col gap-1.5 min-w-0">
            <CardLabel>{seekingLabel}</CardLabel>
            <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
              {(org.partnership_seeking ?? []).slice(0, 3).map((c) => (
                <CardChip key={c}>{c}</CardChip>
              ))}
            </div>
          </div>
        )}

        {footer}
      </div>
    </div>
  );

  // min-w-0 on BOTH roots: this card is a grid item on /orgs, and a grid item
  // defaults to min-width:auto — it refuses to shrink below its content's
  // min-content width. Measured at 390px the card laid out at 400px inside a
  // 342px track and the page scrolled 34px sideways; truncate INSIDE the card
  // cannot fix a card that was never constrained. Same root cause as the
  // /founders and dashboard column fixes.
  if (action) {
    return (
      <Card padding="sm" className="min-w-0">
        {body}
      </Card>
    );
  }

  return (
    <Link
      href={target}
      className="block min-w-0 bg-white rounded-3xl shadow-xs p-5 hover:shadow-sm transition-shadow group"
    >
      {body}
    </Link>
  );
}
