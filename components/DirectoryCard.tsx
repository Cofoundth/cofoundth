// Cofoundee — THE directory card. One component, both directories.
//
// CLIENT-SAFE: no "use client", no hooks, no translation inside. Every string
// arrives already translated, so /founders (a server component, translating
// with t(en, locale)) and /browse (a client component, translating with useT())
// render the identical card. Same contract as components/ui — this lives
// outside that barrel only because it is a composition of those primitives
// rather than a primitive itself.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
// The card was written twice, once per page, and the copies drifted: two body
// blocks against three, a footer of icon-plus-truncated-text against a labeled
// chips block, 222px against 249px. Re-syncing them by hand took six commits.
// Change the card HERE and both directories move together.
//
// ── THE SKELETON (measured against app.onfound.com, and shared) ────────────
//   header  48px   avatar | name 14/600 + meta | stage glyph in the corner
//   body    gap-4  three blocks, each at a RESERVED height, so the rows land
//                  on the same y on every card: 80 / 117 / 194, card 254px
//     1  pill + tags + sector dot   h-[21px]
//     2  label + blurb, 2 lines     min-h-[39px] — line-clamp CLAMPS but does
//                                   not RESERVE, which is what made this block
//                                   41px on some cards and 61px on others
//     3  label + chips, mt-auto     h-[22px]
//
// Reserving those heights is also why these pages measure CLS 0.00: nothing
// moves on load, because nothing was ever sized by its content.

import Link from "next/link";
import { Building2, MapPin, Rocket } from "lucide-react";
import type { ComponentType } from "react";
import { Avatar } from "@/components/Avatar";
import {
  Card,
  CardChip,
  CardLabel,
  CardPill,
  SectorList,
  StageEmblem,
  VerifiedBadge,
} from "@/components/ui";

export type DirectoryCardProps = {
  href: string;
  /** Display name — a company profile passes its company name. */
  name: string;
  photoUrl?: string | null;
  /** Avatar colour seed. Company cards keep the person's name here so the
   *  colour stays stable when the display name switches to the company. */
  avatarSeed?: string;
  /** Already localised, e.g. provinceLabel(...). */
  location?: string | null;
  verified?: boolean;
  /** Accessible name for the verified mark. Required when `verified`. */
  verifiedLabel?: string;
  isCompany?: boolean;
  /** Short marker beside the location, e.g. "New". Already translated. */
  flag?: string | null;

  /** Raw stage key — selects the corner glyph. */
  stage?: string | null;
  /** Translated stage name. Names the glyph AND fills the sector row when a
   *  profile has no sectors, so that reserved row is never a blank hole. */
  stageLabel?: string;

  /** Leading pill on the first body row. Already translated. */
  pill?: string | null;
  /** Muted text between the pill and the sector dot. Already translated. */
  tags?: string[];
  tagMax?: number;
  sectors?: string[];
  sectorMax?: number;

  blurb?: string | null;
  /** Already translated, e.g. tr("Working on"). */
  blurbLabel: string;

  /** Already translated, e.g. tr("Role") or tr("Looking for"). */
  chipsLabel: string;
  chipsIcon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Already translated. */
  chips?: string[];

  /** h2 where the page heading is the only thing above it; h3 where a section
   *  heading sits between. Weight and tracking come from the h1-h6 base rule
   *  either way. */
  as?: "h2" | "h3";
};

export function DirectoryCard({
  href,
  name,
  photoUrl,
  avatarSeed,
  location,
  verified,
  verifiedLabel,
  isCompany,
  flag,
  stage,
  stageLabel,
  pill,
  tags = [],
  tagMax = 2,
  sectors = [],
  sectorMax = 2,
  blurb,
  blurbLabel,
  chipsLabel,
  chipsIcon: ChipsIcon,
  chips = [],
  as: Heading = "h3",
}: DirectoryCardProps) {
  return (
    // min-w-0 is load-bearing: a grid item defaults to min-width:auto and will
    // not shrink below its content's min-content width, so without it the card
    // laid out at 1157px inside a 342px track on a phone and the document
    // scrolled 792px sideways. truncate INSIDE the card cannot fix a card that
    // was never constrained.
    <Link href={href} className="group block h-full min-w-0">
      <Card hoverable padding="xs" className="h-full flex flex-col">
        {/* HEADER — the avatar shares a 48px row with the name, and nothing
            below it is indented past the avatar. */}
        <div className="shrink-0 flex gap-3 items-center">
          <Avatar name={avatarSeed ?? name} url={photoUrl ?? null} size="md" />
          <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
            <Heading className="flex items-center gap-1.5 text-sm font-semibold leading-none group-hover:text-gold-ink transition-colors">
              <span className="truncate">{name}</span>
              {verified && verifiedLabel && (
                <VerifiedBadge label={verifiedLabel} />
              )}
              {isCompany && (
                <Building2
                  className="w-3.5 h-3.5 text-gold-ink shrink-0"
                  strokeWidth={2}
                />
              )}
            </Heading>
            {(location || flag) && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted overflow-hidden">
                {location && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                )}
                {flag && <span className="shrink-0 text-gold-ink">{flag}</span>}
              </div>
            )}
          </div>
          {/* Stage in the corner, the way Onfound mark it. As an inline pill it
              cost up to 97px of the row below, and that row is the only place
              sectors can go. */}
          <StageEmblem stage={stage} label={stageLabel ?? ""} />
        </div>

        {/* BODY — three reserved rows. */}
        <div className="mt-4 flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex h-[21px] items-center gap-2 overflow-hidden">
            {pill && <CardPill>{pill}</CardPill>}
            {/* The dot inside SectorList marks where identity ends and sector
                begins — merged into one run they read as a single taxonomy. */}
            {tags.length > 0 && (
              <span className="min-w-0 truncate text-xs text-ink-muted">
                {tags.slice(0, tagMax).join(" · ")}
              </span>
            )}
            <SectorList
              items={sectors}
              max={sectorMax}
              fallback={stageLabel || undefined}
            />
          </div>

          {blurb && (
            <div className="flex flex-col gap-1.5 min-w-0">
              <CardLabel icon={Rocket}>{blurbLabel}</CardLabel>
              <p className="text-xs leading-relaxed line-clamp-2 text-ink-muted min-h-[39px]">
                {blurb}
              </p>
            </div>
          )}

          {chips.length > 0 && (
            <div className="mt-auto flex flex-col gap-1.5 min-w-0">
              <CardLabel icon={ChipsIcon}>{chipsLabel}</CardLabel>
              <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
                {chips.slice(0, 3).map((c) => (
                  <CardChip key={c}>{c}</CardChip>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
