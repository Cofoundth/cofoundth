// Cofoundee — the page container. CLIENT-SAFE (no hooks, no "use client"), so
// it renders from server and client components alike, like every other ui/
// primitive.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// `max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]` was hand-typed verbatim
// across ~25 files, with a further ~60 partial spellings. Changing the page
// gutter was therefore a multi-file sweep, and every new page re-typed the
// string from memory — which is how 15 pages ended up on Tailwind's
// max-w-2xl/3xl/4xl presets instead of the system's two widths.
//
// The design system defines exactly two page widths and one vertical rhythm:
//
//   width="wide"   max-w-[1120px]   a grid, or main + aside
//   width="narrow" max-w-[640px]    a single column: forms, editors, settings
//   rhythm={false}                  chat and article pages, which own their
//                                   own vertical space
//
// Gutter is px-6 lg:px-10 (24 -> 40px) in every case. Horizontal spacing is
// NOT on the Fibonacci vertical scale and never was — it follows the container
// system, so do not "correct" 40 to 34.

import type { ReactNode } from "react";
import { cn } from "./cn";

export type SectionProps = {
  children: ReactNode;
  /** "wide" = grid or main+aside. "narrow" = single column. */
  width?: "wide" | "narrow";
  /** Drop the py-[88px] rhythm — chat and article pages own their spacing. */
  rhythm?: boolean;
  className?: string;
  /** Rendered element. Use "section" inside a page, "div" as the page root. */
  as?: "div" | "section" | "main" | "article";
};

export function Section({
  children,
  width = "wide",
  rhythm = true,
  className,
  as: Tag = "div",
}: SectionProps) {
  return (
    <Tag
      className={cn(
        width === "wide" ? "max-w-[1120px]" : "max-w-[640px]",
        "mx-auto px-6 lg:px-10",
        rhythm && "py-[88px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
