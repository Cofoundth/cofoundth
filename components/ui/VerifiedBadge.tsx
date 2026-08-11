// Cofoundee — the one verified mark. CLIENT-SAFE.
//
// NO "use client" directive and NO useT() inside: the accessible name arrives
// as an already-translated `label` prop. That is deliberate — the verified mark
// is rendered mostly from server components (profile page, org page, org list),
// which translate with t(en, locale) / tServer(). Server pages can pass
// tServer("Verified"); client components pass tr("Verified").
//
// ── ONE GLYPH, ONE COLOUR, ALWAYS NAMED ───────────────────────────────────
// The app shipped the same concept as two different lucide glyphs:
// BadgeCheck (browse, companies, profile, admin) and ShieldCheck (orgs,
// funding). ShieldCheck wins — it is what the org/browse-companies surfaces
// use, and a shield reads as "vetted" rather than "certified account".
//
// Gold is legal here because this is an ICON, not text (see globals.css:
// gold as text only reaches ~2.9:1; gold-ink exists for that case).
//
// Most existing call sites render the glyph with NO accessible name at all, so
// a screen reader announces nothing where a sighted user sees a trust signal.
// `label` is required for that reason — there is no default.
//
//   size   class      strokeWidth   real sites
//   sm     w-4 h-4     2            inline beside a name (list rows, cards)
//   md     w-5 h-5     2            org header
//   lg     w-6 h-6     1.5          profile hero

import { ShieldCheck } from "lucide-react";
import { cn } from "./cn";

export type VerifiedBadgeSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<VerifiedBadgeSize, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const STROKE_WIDTH: Record<VerifiedBadgeSize, number> = {
  sm: 2,
  md: 2,
  lg: 1.5,
};

export type VerifiedBadgeProps = {
  /** Already-translated accessible name, e.g. tServer("Verified"). Required. */
  label: string;
  size?: VerifiedBadgeSize;
  className?: string;
};

export function VerifiedBadge({
  label,
  size = "sm",
  className,
}: VerifiedBadgeProps) {
  return (
    <ShieldCheck
      role="img"
      aria-label={label}
      strokeWidth={STROKE_WIDTH[size]}
      className={cn(SIZE_CLASSES[size], "text-gold shrink-0", className)}
    />
  );
}
