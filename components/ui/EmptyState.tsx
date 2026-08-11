// Cofoundee — the carded "nothing here yet" state. CLIENT-SAFE.
//
// NO "use client" directive, and NO useT() inside: `title` / `description` /
// `action` arrive already translated. That is what keeps this usable from the
// server pages where most empty states live (matches, funding, companies,
// admin), which translate with `await tServer(...)`.
//
// ── COPIED FROM THE ~20 HAND-WRITTEN EMPTY STATES ─────────────────────────
//   wrapper      bg-white border border-line p-12 text-center   (12 sites;
//                p-8 is the dense variant, 8 sites)
//   icon         w-8 h-8 text-ink-muted mx-auto mb-4, strokeWidth={1}
//   title        <h3 className="text-2xl mb-2">   (h3 picks up the serif +
//                navy heading styles from globals.css)
//   description  text-ink-muted leading-relaxed max-w-md mx-auto
//   action       mt-6 — identical spacing to the old `mb-6` on the paragraph
//
// `dense` drops the description to text-sm, matching the p-8 variants that
// render as a single muted line with no icon and no title.
//
// SHARP CORNERS ALWAYS — never add a rounded-* utility here.

import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn";
import { Card, type CardPadding } from "./Card";

export type EmptyStateProps = {
  /** Repo idiom for icon props: a lucide component, passed uninstantiated. */
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Already-translated heading. Omit for the single-line dense variant. */
  title?: string;
  /** Already-translated body copy. */
  description?: ReactNode;
  /** Already-translated CTA — usually a <LinkButton> or <Button>. */
  action?: ReactNode;
  /** Defaults to the full-width `p-12`; pass "lg" for the dense `p-8` look. */
  padding?: CardPadding;
  /** Smaller muted body copy, for the compact p-8 states. */
  dense?: boolean;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  padding = "xl",
  dense = false,
  className,
}: EmptyStateProps) {
  return (
    <Card padding={padding} className={cn("text-center", className)}>
      {Icon && (
        <Icon className="w-8 h-8 text-ink-muted mx-auto mb-4" strokeWidth={1} />
      )}
      {title && <h3 className="text-2xl mb-2">{title}</h3>}
      {description && (
        <p
          className={cn(
            "text-ink-muted leading-relaxed max-w-md mx-auto",
            dense && "text-sm",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
