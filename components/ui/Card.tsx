// Cofoundee — the canonical white surface. CLIENT-SAFE.
//
// NO "use client" directive: pure markup, usable from server and client
// components. Nothing here is translated — it only renders children.
//
// ── THE CANONICAL SURFACE ─────────────────────────────────────────────────
// `bg-white border border-line`, sharp corners, with the padding scale the app
// actually ships (counted across ~70 hand-written card wrappers):
//
//   padding   class    real sites
//   xs        p-4        2
//   sm        p-5       15   list rows
//   md        p-6       24   DEFAULT: panels, form sections
//   lg        p-8       18   feature cards, dialogs
//   xl        p-12      11   full-width empty states (see EmptyState)
//   none      —          —   when the card owns its own inner padding
//
// `hoverable` adds `hover:border-navy transition-colors`, the treatment used by
// every card that is itself a link (browse results, matches, org list).
//
// SHAPE: 24px radius, NO border, and a 1px hairline shadow — measured off
// app.onfound.com's logged-in app, where the dominant content card is
// `radius 24px / border 0 / box-shadow 0 1px 2px rgb(0 0 0 / 0.05)` on the cream
// ground. That shadow value is byte-identical to Tailwind v4's `--shadow-xs`.
//
// The border is not simply dropped: the hairline shadow replaces it. White on
// cream alone is too weak a boundary; the shadow is what makes the card read as
// lifted rather than as an untinted patch.
//
// NOTE this is the APP card. Their MARKETING cards are a different treatment
// (22px WITH a 0.8px border), which is what app/(marketing) uses — do not
// unify the two, the split is deliberate on their side and ours.

import type { ComponentProps } from "react";
import { cn } from "./cn";

export type CardPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  xs: "p-4",
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
  xl: "p-12",
};

export type CardProps = ComponentProps<"div"> & {
  padding?: CardPadding;
  /** Link/button cards: lift on hover (there is no border to darken). */
  hoverable?: boolean;
};

export function Card({
  padding = "md",
  hoverable = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl shadow-xs",
        PADDING_CLASSES[padding],
        // no border to darken any more — lift the card instead
        hoverable && "hover:shadow-sm transition-shadow",
        className,
      )}
      {...rest}
    />
  );
}
