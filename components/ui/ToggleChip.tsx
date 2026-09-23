// Cofoundee — the selectable filter/option chip. CLIENT-SAFE (no hooks, no
// "use client"): it is a plain <button>, so a client parent can hand it an
// onClick and a server page can render a disabled/static one.
//
// ── WHY ────────────────────────────────────────────────────────────────────
// About nine copies shipped (browse filters, companies filters, meetup
// category toggles, the post-kind picker, onboarding role/industry pickers,
// the admin user filter, the profile editor). Exactly ONE of them set
// `aria-pressed`, so to a screen reader the other eight were unlabelled
// buttons whose selected state existed only as a colour.
//
//   selected    bg-navy border-navy text-white
//   unselected  bg-white border-line text-ink hover:border-navy
//   shared      border tracking-wide transition-colors
//
// `rounded-full` is explicit even though globals.css @layer base already pills
// every <button>: it documents the intent and survives anyone rendering the
// chip classes on a non-button one day.
//
// ── SIZES, counted off the call sites ──────────────────────────────────────
//   xs       px-2.5 py-1   text-xs    post-kind picker, compact browse chips
//   xs-wide  px-3 py-1.5   text-xs    admin user filter, verify toggle
//   sm       px-3 py-1.5   text-sm    browse filters, meetup categories
//   md       px-4 py-2     text-sm    onboarding (compact), profile editor
//   lg       px-4 py-3     text-sm    onboarding role tiles
//
// `tracking={false}` exists for the three sites that never had tracking-wide
// (admin user filter, the profile editor's toggles, the wizard's format
// picker) so they can migrate byte-identically instead of silently gaining
// 0.025em — which in the Thai locale is stripped anyway, but in EN is visible.

import type { ComponentProps, ComponentType } from "react";
import { cn } from "./cn";

export type ToggleChipSize = "xs" | "xs-wide" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ToggleChipSize, string> = {
  xs: "px-2.5 py-1 text-xs",
  "xs-wide": "px-3 py-1.5 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-3 text-sm",
};

export type ToggleChipProps = Omit<ComponentProps<"button">, "type"> & {
  selected: boolean;
  size?: ToggleChipSize;
  /** Lucide component, passed uninstantiated — the repo idiom. */
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Trailing ✕ for a chip that removes itself from a selected list. */
  removable?: boolean;
  /** false drops `tracking-wide` for the sites that never had it. */
  tracking?: boolean;
};

export function ToggleChip({
  selected,
  size = "sm",
  icon: Icon,
  removable = false,
  tracking = true,
  className,
  children,
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-full transition-colors",
        tracking && "tracking-wide",
        SIZE_CLASSES[size],
        selected
          ? "bg-navy border-navy text-white"
          : "bg-white border-line text-ink hover:border-navy",
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
      {children}
      {removable && <span aria-hidden="true">✕</span>}
    </button>
  );
}
