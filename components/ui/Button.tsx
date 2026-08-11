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
//
// Disabled state was three different opacities in the wild (40 / 50 / 60);
// `disabled:opacity-50` is now the single answer, always applied.
//
// SHARP CORNERS ALWAYS — never add a rounded-* utility here or via className.
//
// ⚠️ `type` defaults to "button" (matching the app's dominant idiom: 97 of 141
// buttons already write type="button" explicitly). A submit button MUST pass
// type="submit" — otherwise the form silently stops submitting.

import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-navy hover:bg-navy-dark text-white",
  secondary: "bg-transparent border border-line hover:border-navy text-navy",
  ghost: "bg-transparent text-ink hover:text-navy",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "gap-1.5 px-3 py-1.5 text-xs",
  sm: "gap-1.5 px-4 py-2 text-sm tracking-wide",
  md: "gap-2 px-6 py-3 text-sm tracking-wide",
  lg: "gap-2 px-8 py-4 text-sm tracking-wide",
};

const BASE =
  "inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

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
