// Cofoundee — the three text atoms a directory card is built from.
//
// Measured off app.onfound.com's founder card (2026-09-03), which is the layout
// /browse and /founders both follow:
//
//   label  12px / 600, sentence case, leading icon      "Working on"
//   chip   12px / 500, px-2 py-0.5, bg ink/10, NO border, rounded-full
//   pill   the chip at their 10px — raised to 12px here (see below)
//
// Onfound run the pill at 10px. We do not: Thai at 10px is illegible, and the
// app deliberately cleared every sub-12px size for that reason. The pill keeps
// its distinct role through weight and width instead of a smaller size.
//
// The label is sentence case with an icon, NOT the app's uppercase tracked
// eyebrow. An eyebrow is a section marker; these are field names inside a card,
// and at card scale the tracked caps read as louder than the name above them.
//
// CLIENT-SAFE and untranslated, like every other primitive in this barrel —
// callers pass already-translated strings.

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Banknote, Hammer, Lightbulb, TrendingUp } from "lucide-react";
import { cn } from "./cn";

/** Field name inside a card: "Working on", "Can help with". */
export function CardLabel({
  icon: Icon,
  children,
  className,
  ...rest
}: ComponentProps<"div"> & {
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-row gap-1.5 items-center text-xs font-semibold text-ink",
        className,
      )}
      {...rest}
    >
      {Icon && (
        <Icon className="w-3.5 h-3.5 shrink-0 text-gold-ink" strokeWidth={2} />
      )}
      {children}
    </div>
  );
}

/** A value chip. Borderless on a tinted ground — the border reads as noise at
 *  three-per-row, which is why Onfound's is transparent too. */
export function CardChip({
  className,
  ...rest
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5",
        "text-xs font-medium bg-navy/10 text-ink whitespace-nowrap shrink-0",
        className,
      )}
      {...rest}
    />
  );
}

/** The card's one status marker — intent on a founder, stage on a company.
 *  Same treatment as a chip at heavier weight, so one pill can lead a row of
 *  plain text without a second border competing with it. */
export function CardPill({
  className,
  ...rest
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5",
        "text-xs font-semibold bg-navy/10 text-ink whitespace-nowrap shrink-0",
        className,
      )}
      {...rest}
    />
  );
}

// ── STAGE EMBLEM ──────────────────────────────────────────────────────────
// Where a founder is, as a 32px disc in the card's top-right corner. Copied in
// PLACEMENT from Onfound, whose card puts the same marker in the same corner —
// but NOT in colour. Theirs is hue-coded per stage (tan #E7DAB4 for idea, green
// #CBDFD2 for early, blue #CCDCEC for active). This palette has deliberately no
// brand hue, so all four stages share the one tan accent surface and the ICON
// carries the distinction. Colour-only coding would fail a colour-blind reader
// anyway; four distinct glyphs do not.
//
// `bg-gold` is the accent SURFACE, which is the legal use of that token on a
// light ground (gold as TEXT on light measures ~1.3:1 and has shipped invisible
// before). gold-ink on gold measures ~4.4:1 — past the 3:1 floor for a 2px
// stroke at 16px.
//
// Sized by a FIXED BOX, never by line-height: the Thai guard in globals.css
// force-overrides leading-none/leading-tight, so a glyph sized that way would
// break in the default locale. Box-sized glyphs are immune.
//
// role="img" + aria-label, because a bare <div> with aria-label is not reliably
// announced — the icon carries meaning here and must have an accessible name.
const STAGE_ICONS: Record<
  string,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  exploring: Lightbulb,
  building: Hammer,
  traction: TrendingUp,
  raising: Banknote,
};

export function StageEmblem({
  stage,
  label,
  className,
}: {
  stage: string | null | undefined;
  /** Already translated — this file never translates (see the barrel header). */
  label: string;
  className?: string;
}) {
  const Icon = stage ? STAGE_ICONS[stage] : undefined;
  if (!Icon) return null;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "grid place-items-center h-8 w-8 shrink-0 rounded-full",
        "bg-gold text-gold-ink",
        className,
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
    </span>
  );
}

/** Sectors, as a marked attribute rather than a run of prose.
 *
 *  NOT chips, and that is measured, not taste: a chip costs ~20px in padding
 *  and border, so at this row's width chips fit ONE sector where text fits
 *  three. Onfound render the same field the same way — muted 12px with a small
 *  filled dot, chips reserved for "Can help with" — the difference is that they
 *  carry one sector per member and we allow ten, which is what turned our row
 *  into a wall of text.
 *
 *  Sliced and counted rather than joined and ellipsised. That reverses the
 *  earlier call here, because the row got wider: when stage was still an inline
 *  pill this row was ~183px, where slicing showed one name and truncating
 *  showed about one and a half. At the full 304px, slicing shows two whole
 *  names AND an accurate total, with no mid-word cut. */
export function SectorList({
  items,
  max = 2,
  className,
}: {
  items: string[];
  max?: number;
  className?: string;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-xs text-ink-muted",
        className,
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-gold-ink"
        aria-hidden="true"
      />
      <span className="min-w-0 truncate">{shown.join(" · ")}</span>
      {rest > 0 && <span className="shrink-0">+{rest}</span>}
    </span>
  );
}
