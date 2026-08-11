// Cofoundee — the editorial section label above a heading. CLIENT-SAFE.
//
// NO "use client" directive and NO useT() inside: pass already-translated
// children. Eyebrows sit at the top of server-rendered page sections, which
// translate with `await tServer(...)`.
//
// ── THE CANONICAL EYEBROW ─────────────────────────────────────────────────
//   text-xs uppercase tracking-[0.25em] text-gold-ink
//
// ~40 sites carry this. Roughly half still say `text-gold`, which is the
// pre-gold-ink spelling: gold as TEXT on cream/white only reaches ~2.9:1
// contrast, under AA (see the note in globals.css). This primitive is
// gold-ink only — migrating a `text-gold` eyebrow to <Eyebrow> darkens it
// slightly and is an intentional accessibility fix, not a regression.
//
// Thai is handled globally: `html[lang="th"] *` forces letter-spacing to
// normal, so the 0.25em tracking never smears Thai vowel/tone marks.
//
// `as` exists because the app renders eyebrows as <div>, <p> AND <h2>
// depending on whether the label is the section's real heading. Prefer "h2"
// when it labels a landmark section — headings get the serif + navy treatment
// from globals.css, which `text-gold-ink` then overrides for colour.

import type { ReactNode } from "react";
import { cn } from "./cn";

export type EyebrowAs = "div" | "p" | "span" | "h2" | "h3";

export type EyebrowProps = {
  children: ReactNode;
  as?: EyebrowAs;
  className?: string;
};

export function Eyebrow({ children, as: Tag = "div", className }: EyebrowProps) {
  return (
    <Tag
      className={cn(
        "text-xs uppercase tracking-[0.25em] text-gold-ink",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
