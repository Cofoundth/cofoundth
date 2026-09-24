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
// `justify-center` is in BASE for the same reason Button.tsx's BASE carries it,
// and it is a FIX, not a preference. Every one of the hand-rolled chips this
// primitive replaced was a plain <button>, and the UA stylesheet gives a
// <button> `text-align: center`. `inline-flex` re-parents the label into an
// anonymous flex item, and with no `justify-content` the flex algorithm packs
// it at flex-start — so the centring the UA had been doing silently vanished.
// It is invisible at a chip that is shrink-to-fit (no free space to
// distribute), which is every chip in a flex row: that is why it survived the
// sweep. It is very visible the moment a chip is STRETCHED. Onboarding's
// ChoiceButton tiles are CSS grid items (`justify-items: stretch`), so a
// 191px tile held a 67px label: at 5c563c9 the label sat 62.36px from each
// edge, after the migration 16.8px from the left and 107.94px from the right.
// Seven grids across onboarding steps 1-3 — the first screens a new user sees.
//
// Fixed HERE rather than at ChoiceButton because ChoiceButton is not what
// broke: it passed no geometry override before the migration and passes none
// now. A call-site patch would leave the primitive still dropping a property
// that all nine of its ancestors had, armed for the next caller who stretches
// a chip. Measured inert at every other call site (browse + companies filter
// groups, admin user filter, VerifyToggle, investor stages, meetup wizard
// format, meetups list/map, settings profile chips, post composer, onboarding
// status tags) at 1440px AND 375px, including two non-wrapping rows squeezed
// until they overflowed: 0.00px of movement, 0.00px of size change. cn()
// merges, so a chip that genuinely wants a different main-axis alignment
// still overrides it from the call site.
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
        "inline-flex items-center justify-center gap-1.5 border rounded-full transition-colors",
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
