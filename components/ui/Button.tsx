// Cofoundee — canonical button primitives (Button + LinkButton). CLIENT-SAFE.
//
// NO "use client" directive on purpose. These hold no state and call no hooks,
// so they render from BOTH server components (page CTAs, form submit buttons)
// and client components (onClick handlers). Nothing here is translated: pass
// already-translated children, exactly like the hand-written buttons do today
// with t() / tServer() / useT().
//
// ── THE CANONICAL SCALE ───────────────────────────────────────────────────
// Derived by counting every hand-written navy CTA in the app
// (`bg-navy hover:bg-navy-dark`, ~60 sites) so migrating a call site is a
// pixel-for-pixel no-op rather than a redesign:
//
//   size   padding       text                    gap      real sites
//   xs     px-3 py-1.5   text-xs                 gap-1.5    13  inline row actions
//   sm     px-4 py-2     text-sm tracking-wide   gap-1.5    15  card actions
//   md     px-6 py-3     text-sm tracking-wide   gap-2      18  DEFAULT: forms, page CTAs
//   lg     px-8 py-4     text-sm tracking-wide   gap-2      10  auth, hero, onboarding
//
// NOT in the scale on purpose: `px-5 py-2.5` (7 sites) and `px-5 py-3` (4)
// sit between sm and md. When migrating those, use the nearest size AND pass
// className="px-5 py-2.5" if the exact pixels matter — do not silently resize.
// Since cn() merges, such an override now wins in BOTH directions; before it
// only worked upward, which is why the migration notes list per-site pixel
// deltas for the sizes that had to round up.
//
// Disabled state was three different opacities in the wild (40 / 50 / 60);
// `disabled:opacity-50` is now the single answer, always applied.
//
// ⚠️ TRACKING IS NOT PART OF THAT "SINGLE ANSWER". sm/md/lg carry
// `tracking-wide`, which a hand-rolled button often did NOT have. The sweep's
// standing rule (set in B1, held in B2a and B2b) is: if the site had no
// tracking utility at HEAD, pass `className="tracking-normal"` so the
// migration stays a pixel no-op. `tracking-wide` is EN-only — the
// `html[lang="th"] * { letter-spacing: normal !important }` kill-switch in
// globals.css strips it — so a gained tracking never shows in the default
// locale and will not be caught by testing in Thai. Converging every button
// onto the tracked face is a deliberate, EN-visible restyle; it belongs in
// B5 with D4/D5, not in a call-site batch.
//
// PILL CORNERS ALWAYS (`rounded-full`, part of BASE). @layer base already
// rounds every <button>; BASE carries it explicitly so LinkButton — an <a>,
// which the base rule does not match — comes out identical.
//
// ⚠️ `type` defaults to "button" (matching the app's dominant idiom: 97 of 141
// buttons already write type="button" explicitly). A submit button MUST pass
// type="submit" — otherwise the form silently stops submitting.

import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "inverse"
  | "danger-outline";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

// ⚠️ A destructive button must pass variant="danger" rather than appending
// `className="bg-danger-ink"` to the default primary. cn() now merges, so an
// appended background would in fact win — but the variant is still the only
// honest way to say it, because a variant also swaps the TEXT and HOVER
// colours, which a single appended `bg-*` does not.
//
// ── THE SIX VARIANTS, AND THE TWO THAT WERE DELIBERATELY NOT ADDED ─────────
//   primary         the navy CTA (~63 hand-rolled sites)
//   secondary       hairline outline (41 sites). ALSO the home for the 3
//                   `outline-navy` buttons — decision D5 merged them here
//                   rather than adding a seventh variant for three call sites.
//   ghost           text-only actions
//   danger          solid destructive (4 sites)
//   inverse         white-on-navy CTA, for a button sitting ON a dark panel
//                   (4 sites). Decision D4 merged the 2 gold-on-navy `accent`
//                   buttons into this rather than keeping a gold variant: gold
//                   is a SURFACE token, and the two faces were doing one job.
//   danger-outline  the quiet destructive (5 sites) — and the home for the 2
//                   "secondary that turns red on hover" buttons (D5).
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-navy hover:bg-navy-dark text-white",
  secondary: "bg-transparent border border-line hover:border-navy text-navy",
  ghost: "bg-transparent text-ink hover:text-navy",
  danger: "bg-danger-ink hover:bg-danger-ink-dark text-white",
  inverse: "bg-white text-navy hover:bg-cream",
  "danger-outline":
    "bg-transparent border border-danger-line text-danger-ink hover:bg-danger-surface",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "gap-1.5 px-3 py-1.5 text-xs",
  sm: "gap-1.5 px-4 py-2 text-sm tracking-wide",
  md: "gap-2 px-6 py-3 text-sm tracking-wide",
  lg: "gap-2 px-8 py-4 text-sm tracking-wide",
};

const BASE =
  "inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width (`w-full`) — the auth/onboarding pattern. */
  fullWidth?: boolean;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: StyleProps & { className?: string }): string {
  return cn(
    BASE,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ComponentProps<"button"> & StyleProps;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}

// Same styling, rendered as a next/link — a large share of the app's CTAs are
// navigations rather than actions. There is no `disabled` here on purpose: a
// disabled link is not a thing. Render a <Button disabled> instead.
export type LinkButtonProps = ComponentProps<typeof Link> & StyleProps;

export function LinkButton({
  variant,
  size,
  fullWidth,
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}
