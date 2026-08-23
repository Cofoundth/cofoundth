// Cofoundee — landing page alternating two-column feature block.
//
// This mirrors Onfound's `.feat` section: a ~504px text column beside a ~504px
// visual panel, 64px apart, with consecutive instances flipping sides.
//
// NO "use client" and NO locale prop on purpose: every string arrives already
// translated from the caller. That keeps this a pure presentational server
// component and sidesteps the tServer()-inside-.map() trap this repo has hit
// before — the caller does its t() work synchronously and hands us plain text.
//
// `reverse` flips the columns with `lg:order-*` rather than reordering the DOM,
// so mobile (single column) and screen readers always get text-then-visual.

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export type FeatureBlockProps = {
  /** Small uppercase kicker above the title. ALREADY translated. */
  eyebrow: string;
  /** Section heading — renders as the <h2>. ALREADY translated. */
  title: string;
  /** Body copy, one <p> per entry. ALREADY translated. */
  paragraphs: string[];
  /** CTA text. ALREADY translated. Rendered only alongside `ctaHref`. */
  ctaLabel?: string;
  ctaHref?: string;
  /** The `.fv` panel — composed from real UI in CSS, never an image. */
  visual: ReactNode;
  /** true = visual on the LEFT, text on the RIGHT (lg+ only). */
  reverse?: boolean;
  className?: string;
};

export function FeatureBlock({
  eyebrow,
  title,
  paragraphs,
  ctaLabel,
  ctaHref,
  visual,
  reverse = false,
  className,
}: FeatureBlockProps) {
  return (
    <section className={cn("py-[100px]", className)}>
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text — always first in the DOM, visually flipped by `reverse`. */}
          <div
            className={cn(
              "max-w-[504px]",
              reverse ? "lg:order-2" : "lg:order-1",
            )}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {eyebrow}
            </p>
            <h2 className="text-d2 lg:text-d3 mb-4">
              {title}
            </h2>
            <div className="space-y-6">
              {paragraphs.map((p) => (
                <p key={p} className="text-ink-muted leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            {ctaLabel && ctaHref ? (
              <div className="mt-8">
                <LinkButton href={ctaHref} size="lg">
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </LinkButton>
              </div>
            ) : null}
          </div>

          {/* Visual panel */}
          <div
            className={cn(
              "w-full min-w-0",
              reverse ? "lg:order-1" : "lg:order-2",
            )}
          >
            {visual}
          </div>
        </div>
      </div>
    </section>
  );
}
