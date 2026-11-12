// Cofoundee — the app's 18px section-heading register. CLIENT-SAFE.
//
// NO "use client" and NO useT(): `title`, `action.label` and `meta` arrive
// already translated, so a server page can pass `await tServer(...)`.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// `text-lg font-bold tracking-normal` appears 46 times in 17 files, and BOTH
// overrides are load-bearing: globals.css @layer base sets every h1-h6 to
// weight 600 and letter-spacing -0.02em, so a bare `text-lg` h2 renders
// 600/-0.02em — it LOOKS converted in the source and is wrong on screen.
// design-lint Rule 3 exists solely to catch that, which is the strongest
// possible argument for a primitive that cannot get it wrong.
//
// 18px is OUR size for Onfound's label role (they run it at 14px/600). It is
// deliberately OFF the display ladder: these are labels, not display type.
//
// ── THE SHAPES IT COVERS ───────────────────────────────────────────────────
//   plain          <h2> + mb-5                       (most sites)
//   with action    heading ... "See all ->" row
//   with meta      heading ... muted count, baseline-aligned (matches)
//   divider        border-b border-line pb-2         (settings, CreateOrgForm)
//   tone="danger"  border-danger-line + text-danger-ink (settings danger zone)
//
// Do NOT use it for the HostMeetupWizard step headers — those are a different
// shape (a numbered step label, not a section register).

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export type SectionHeadingTone = "default" | "danger";

export type SectionHeadingProps = {
  /** Already translated. */
  title: string;
  as?: "h2" | "h3";
  /** A "See all ->" link on the right of the row. `label` already translated. */
  action?: { href: string; label: string };
  /** Muted trailing content — switches the row to baseline alignment. */
  meta?: ReactNode;
  /** The underlined form: border-b border-line pb-2. */
  divider?: boolean;
  tone?: SectionHeadingTone;
  /** Row spacing. Defaults to the rhythm's `mb-5`; pass "mb-4" to keep a site
   *  byte-identical while migrating. */
  className?: string;
};

export function SectionHeading({
  title,
  as: Tag = "h2",
  action,
  meta,
  divider = false,
  tone = "default",
  className,
}: SectionHeadingProps) {
  const danger = tone === "danger";

  // No action and no meta: the heading IS the row, so the divider and the
  // spacing live on it directly rather than on a wrapper that would add a
  // second box for nothing.
  if (!action && !meta) {
    return (
      <Tag
        className={cn(
          "text-lg font-bold tracking-normal",
          danger && "text-danger-ink",
          divider && "border-b pb-2",
          divider && (danger ? "border-danger-line" : "border-line"),
          className ?? "mb-5",
        )}
      >
        {title}
      </Tag>
    );
  }

  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        meta ? "items-baseline" : "items-center",
        divider && "border-b pb-2",
        divider && (danger ? "border-danger-line" : "border-line"),
        className ?? "mb-5",
      )}
    >
      <Tag
        className={cn(
          "text-lg font-bold tracking-normal",
          danger && "text-danger-ink",
        )}
      >
        {title}
      </Tag>
      {meta}
      {action && (
        <Link
          href={action.href}
          className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
        >
          {action.label}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
