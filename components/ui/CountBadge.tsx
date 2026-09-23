// Cofoundee — the small navy count bubble. CLIENT-SAFE.
//
// Five byte-identical copies shipped (browse filter button, companies filter
// button, the notification bell, the sidebar rail, the mobile menu). Exactly
// one string, five places to forget it.
//
//   min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full
//   inline-flex items-center justify-center font-medium
//
// 11px is INSIDE the badge tier's Latin-and-digits rule: the content here is
// always a numeral (or "9+"), never translatable text. Do not reuse this for a
// word — that is the 12px `text-xs` chip.
//
// The absolute positioning (`absolute -top-1.5 -right-1.5`) belongs to the
// CALLER, not here: the three overlay sites each pin it differently, and the
// two rail sites do not pin it at all.

import { cn } from "./cn";

export type CountBadgeProps = {
  n: number;
  /** Cap the display at 9+, the rail/bell idiom. */
  cap?: boolean;
  className?: string;
};

export function CountBadge({ n, cap = false, className }: CountBadgeProps) {
  return (
    <span
      className={cn(
        "min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium",
        className,
      )}
    >
      {cap && n > 9 ? "9+" : n}
    </span>
  );
}
