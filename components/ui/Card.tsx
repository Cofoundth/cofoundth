// Cofoundee — the canonical content surface. CLIENT-SAFE.
//
// NO "use client" directive: pure markup, usable from server and client
// components. Nothing here is translated — it only renders children.
//
// ── SHAPE ──────────────────────────────────────────────────────────────────
// 24px radius (`rounded-3xl`), NO border, and a 1px hairline shadow
// (`shadow-xs`) — measured off app.onfound.com's logged-in app, where the
// dominant content card is `radius 24px / border 0 / box-shadow
// 0 1px 2px rgb(0 0 0 / 0.05)` on the cream ground. That shadow value is
// byte-identical to Tailwind v4's `--shadow-xs`.
//
// The border is not simply dropped: the hairline shadow REPLACES it. White on
// cream alone is too weak a boundary; the shadow is what makes the card read
// as lifted rather than as an untinted patch. Never border AND shadow.
//
// NOTE this is the APP card. MARKETING cards are a different treatment (22px
// WITH a 0.8px border and no shadow) — do not unify, the split is deliberate
// on Onfound's side and ours.
//
// ── PADDING ────────────────────────────────────────────────────────────────
//   padding      class        real sites
//   xs           p-4            2
//   sm           p-5           15   dense list rows
//   md           p-6           24   DEFAULT: panels, form sections
//   lg           p-8           18   feature cards, page-level panels
//   responsive   p-6 lg:p-8     9   dialogs, banners, the wide single panels
//   xl           p-12          11   full-width empty states (see EmptyState)
//   none         —              —   when the card owns its own inner padding
//
// Off-tier pads (`lg:p-10`, `lg:p-12`) stay as className. They are breakpoint
// variants, which never conflict with the base pad, so they compose cleanly.
//
// ── TONE ───────────────────────────────────────────────────────────────────
// The background is SWAPPED OUT of the base string, never layered on top of
// it. `<Card className="bg-cream">` used to be a no-op — Tailwind emits
// `.bg-cream` BEFORE `.bg-white`, so the base won regardless of what the call
// site wrote. (cn() now merges, so it would work; swapping is still the honest
// API, and it is what keeps `shadow-xs` off the tinted tones.)
//
//   white   bg-white + shadow-xs   DEFAULT — the lifted content card
//   cream   bg-cream               tinted panel, flat: it is a recess, not a lift
//   navy    bg-navy text-white     dark panel. Per the dark-panel subsystem the
//                                  border is decided per site — pass
//                                  `className="border border-gold/50"` where the
//                                  panel needs one. `text-gold` is legal here
//                                  and ONLY here.
//   danger  bg-danger-surface + border border-danger-line
//
// `hoverable` adds `hover:shadow-sm transition-shadow`: there is no border to
// darken any more, so a link card lifts instead.
//
// `cardClasses()` mirrors `buttonClasses()` for the surfaces that cannot BE a
// Card: a `<Link>` card, and Paginated (whose pager renders OUTSIDE the class-
// carrying div, so wrapping it in <Card> would pull the pager inside).

import type { ComponentProps, ElementType } from "react";
import { cn } from "./cn";

export type CardPadding =
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "responsive"
  | "lg"
  | "xl";

export type CardTone = "white" | "cream" | "navy" | "danger";

/** Elements a card legitimately renders as. No polymorphic `Link`: typing that
 *  is not worth it — use `cardClasses()` on the <Link> instead. */
export type CardAs =
  | "div"
  | "section"
  | "article"
  | "header"
  | "aside"
  | "form"
  | "li";

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  xs: "p-4",
  sm: "p-5",
  md: "p-6",
  responsive: "p-6 lg:p-8",
  lg: "p-8",
  xl: "p-12",
};

const TONE_CLASSES: Record<CardTone, string> = {
  white: "bg-white shadow-xs",
  cream: "bg-cream",
  navy: "bg-navy text-white",
  danger: "bg-danger-surface border border-danger-line",
};

type CardStyleProps = {
  padding?: CardPadding;
  tone?: CardTone;
  /** Link/button cards: lift on hover (there is no border to darken). */
  hoverable?: boolean;
};

export function cardClasses({
  padding = "md",
  tone = "white",
  hoverable = false,
  className,
}: CardStyleProps & { className?: string }): string {
  return cn(
    "rounded-3xl",
    TONE_CLASSES[tone],
    PADDING_CLASSES[padding],
    hoverable && "hover:shadow-sm transition-shadow",
    className,
  );
}

export type CardProps = ComponentProps<"div"> &
  CardStyleProps & {
    as?: CardAs;
    /** Only meaningful with `as="form"` — a server action or an action URL. */
    action?: ComponentProps<"form">["action"];
  };

export function Card({
  padding,
  tone,
  hoverable,
  as = "div",
  className,
  ...rest
}: CardProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={cardClasses({ padding, tone, hoverable, className })}
      {...rest}
    />
  );
}
