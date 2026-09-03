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
