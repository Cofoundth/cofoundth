// Cofoundee — the page container. CLIENT-SAFE (no hooks, no "use client"), so
// it renders from server and client components alike, like every other ui/
// primitive.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// `max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]` was hand-typed verbatim
// across ~33 files. Changing the gutter was therefore a multi-file sweep, and
// every new page re-typed the string from memory — which is how 15 pages ended
// up on Tailwind's max-w-2xl/3xl/4xl presets instead of the system's two widths.
//
// ── TWO WIDTHS ─────────────────────────────────────────────────────────────
//   width="wide"   max-w-[1120px]   a grid, or main + aside
//   width="narrow" max-w-[640px]    a single column: forms, editors, settings
//
// Gutter is px-6 lg:px-10 (24 → 40px) in every case. Horizontal spacing is NOT
// on the Fibonacci vertical scale and never was — it follows the container
// system, so do not "correct" 40 to 34.
//
// ── TWO RHYTHMS, AND THE DEFAULT IS THE APP ONE ────────────────────────────
// The 88px section rhythm was measured off Onfound's MARKETING pages and then
// applied to app routes too, which was never checked. Measured against their
// actual app on 2026-09-03:
//
//                        Onfound app     Cofoundee (before)
//   heading top          42px            88px
//   content padding      16px (py-4)     88px
//
// More than double. Marketing pages want the big rhythm; a product surface a
// member visits every day does not. So:
//
//   rhythm="app"        py-14 (56px)     DEFAULT — every app route
//   rhythm="marketing"  py-[88px]        landing, legal, editorial
//   rhythm={false}      none             chat and article pages, which own
//                                        their own vertical space
//
// 56 rather than their 42 on purpose: our page titles are 42px against their
// 28px, and a larger heading wants proportionally more air above it. 56-over-42
// sits close to their 42-over-28. It is also the Fibonacci 55 step, so it stays
// on the same scale as the rest of the vertical rhythm.

import type { ReactNode } from "react";
import { cn } from "./cn";

export type SectionProps = {
  children: ReactNode;
  /** "wide" = grid or main+aside. "narrow" = single column. */
  width?: "wide" | "narrow";
  /**
   * "app" (default) = py-14. "marketing" = py-[88px]. false = none, for chat
   * and article pages that own their own spacing.
   */
  rhythm?: "app" | "marketing" | false;
  className?: string;
  /** Rendered element. Use "section" inside a page, "div" as the page root. */
  as?: "div" | "section" | "main" | "article";
};

const RHYTHM = {
  app: "py-14",
  marketing: "py-[88px]",
} as const;

export function Section({
  children,
  width = "wide",
  rhythm = "app",
  className,
  as: Tag = "div",
}: SectionProps) {
  return (
    <Tag
      className={cn(
        width === "wide" ? "max-w-[1120px]" : "max-w-[640px]",
        "mx-auto px-6 lg:px-10",
        rhythm && RHYTHM[rhythm],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
