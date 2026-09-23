// Cofoundee — the "nothing here yet" state. CLIENT-SAFE.
//
// NO "use client" directive, and NO useT() inside: `eyebrow` / `title` /
// `description` / `action` arrive already translated. That is what keeps this
// usable from the server pages where most empty states live (matches, funding,
// companies, admin), which translate with `await tServer(...)`.
//
// ── THE RECIPE ─────────────────────────────────────────────────────────────
//   wrapper      a <Card> — 24px radius, no border, hairline shadow. `p-12`
//                is the full-width default; `padding="lg"` is the dense p-8.
//   icon         w-8 h-8 mx-auto mb-4, strokeWidth={1}
//   eyebrow      <Eyebrow> — optional editorial label above the title
//   title        <h3 className="text-xl mb-2">  (the h3 picks up the heading
//                face + weight 600 / -0.02em from globals.css @layer base)
//   description  text-ink-muted max-w-md mx-auto leading-relaxed  (order matters)
//   action       mt-6
//
// TITLE SIZE — decision D7, 2026-09. This was `text-2xl` (24px) on all 39
// sites. CLAUDE.md bans text-2xl and text-3xl for text: neither is a register
// step, and 24 blurs the boundary between the card-title register (20px) and
// `text-d1` (26px). An empty-state title is a CARD TITLE, so it belongs at
// `text-xl`. This shrinks every empty state's heading by 4px — an approved,
// deliberate visual change, not a no-op.
//
// `dense` drops the description to text-sm, matching the p-8 variants that
// render as a single muted line with no icon and no title.
//
// ── TONE / ALIGN / BARE ────────────────────────────────────────────────────
// `tone="navy"` puts the state on a dark panel and switches the WHOLE
// vocabulary per the dark-panel subsystem: white title, white/70 body,
// `text-gold` eyebrow. The title override is load-bearing — @layer base paints
// every h1-h6 `--color-navy`, so an unstyled h3 on bg-navy is navy on navy,
// i.e. invisible.
//
// `align="start"` left-aligns and drops the auto-centring on the icon and the
// description. `bare` drops the Card entirely for states that sit inside an
// existing panel (a message thread, an org chat) and would otherwise be a card
// inside a card.

import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn";
import { Card, type CardPadding } from "./Card";
import { Eyebrow } from "./Eyebrow";

export type EmptyStateTone = "white" | "navy";
export type EmptyStateAlign = "center" | "start";

export type EmptyStateProps = {
  /** Repo idiom for icon props: a lucide component, passed uninstantiated. */
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Already-translated editorial label above the title. */
  eyebrow?: string;
  /** Already-translated heading. Omit for the single-line dense variant. */
  title?: string;
  /** Already-translated body copy. */
  description?: ReactNode;
  /** Already-translated CTA — usually a <LinkButton> or <Button>. */
  action?: ReactNode;
  /** Defaults to the full-width `p-12`; pass "lg" for the dense `p-8` look. */
  padding?: CardPadding;
  /** Dark panel. Switches title/body/eyebrow to the dark-panel vocabulary. */
  tone?: EmptyStateTone;
  /** "start" left-aligns the block instead of centring it. */
  align?: EmptyStateAlign;
  /** Drop the Card wrapper — for a state nested inside an existing panel. */
  bare?: boolean;
  /** Smaller muted body copy, for the compact p-8 states. */
  dense?: boolean;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  padding = "xl",
  tone = "white",
  align = "center",
  bare = false,
  dense = false,
  className,
}: EmptyStateProps) {
  const dark = tone === "navy";
  const centred = align === "center";

  const body = (
    <>
      {Icon && (
        <Icon
          className={cn(
            "w-8 h-8 mb-4",
            dark ? "text-white/70" : "text-ink-muted",
            centred && "mx-auto",
          )}
          strokeWidth={1}
        />
      )}
      {eyebrow && (
        // isDarkContext() now recognises a LITERAL `tone="navy"` — that is what
        // retired the six call-site markers this one outlived. Here the wrapper
        // is `<Card tone={tone}>`, known only at runtime, so this marker stays:
        // the last of its kind, a tone forwarded from a caller.
        // design-ok: `dark` means tone="navy", so this eyebrow is ON bg-navy,
        // where text-gold is the correct accent (~13.4:1).
        <Eyebrow className={cn("mb-2", dark && "text-gold")}>{eyebrow}</Eyebrow>
      )}
      {title && (
        <h3 className={cn("text-xl mb-2", dark && "text-white")}>{title}</h3>
      )}
      {description && (
        <p
          className={cn(
            "max-w-md",
            dark ? "text-white/70" : "text-ink-muted",
            centred && "mx-auto",
            dense && "text-sm",
            // LAST, and after the size, on purpose. tailwind-merge models a
            // Tailwind v4 `text-<size>` as ALSO setting a line-height, so a
            // `leading-*` written BEFORE a size is deleted from the output —
            // `dense` was silently dropping this to 1.43. See cn.ts.
            "leading-relaxed",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </>
  );

  if (bare) {
    return (
      <div className={cn("py-12", centred && "text-center", className)}>
        {body}
      </div>
    );
  }

  return (
    <Card
      padding={padding}
      tone={tone}
      className={cn(centred && "text-center", className)}
    >
      {body}
    </Card>
  );
}
