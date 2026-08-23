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
// ROUNDED ALWAYS (`rounded-xl` = 14px, part of the base class list). Card
// renders a <div>, which no @layer base geometry rule matches, so the radius
// has to live here — a call site can still override it via className.

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
  /** Link/button cards: navy border on hover. */
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
        "bg-white border border-line rounded-xl",
        PADDING_CLASSES[padding],
        hoverable && "hover:border-navy transition-colors",
        className,
      )}
      {...rest}
    />
  );
}
