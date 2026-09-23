// Cofoundee — the ONE renderer behind /privacy, /terms and /code-of-conduct.
// Server-safe: no hooks, no "use client", and it translates NOTHING. The page
// picks the locale, hands over the already-picked LegalDocument and the two
// chrome strings, exactly like the ui/ primitives.
//
// ── WHY ONE RENDERER ───────────────────────────────────────────────────────
// Three pages each carried their own copy of a `Section` helper, their own
// heading sizes and their own header block. They had already drifted from the
// design system together — `max-w-3xl` (a Tailwind preset CLAUDE.md says is
// not part of the system), a hand-typed `py-[88px]` instead of <Section>, and
// `text-xl` h2s, which is the CARD-TITLE register, not a heading one.
//
// ── THE READING COLUMN ─────────────────────────────────────────────────────
// <Section width="narrow"> = max-w-[640px], one of the system's only two page
// widths, and the right one for a document read top to bottom.
// rhythm="marketing" keeps these on the 88px editorial rhythm when logged out;
// signed in, the [data-shell="public"] block in globals.css rewrites that same
// .py-\[88px\] class to 56px so a legal page opened from the rail sits on the
// app offset like every other app surface. Nothing here branches on auth.
//
// ── TYPE SIZES ARE REGISTER CHOICES, NOT TASTE ─────────────────────────────
//   h1          text-d2 lg:text-d3   the marketing page-title pair
//   h2          text-d1 (26/1.3)     CLAUDE.md: "d1 is a section heading
//                                    inside marketing prose" — which is what a
//                                    numbered clause heading is. The old
//                                    text-xl was the card-title register.
//   contents    text-lg font-bold tracking-normal — the UI label register, and
//               both overrides are load-bearing: @layer base sets h1–h6 to 600
//               and -0.02em, so without them you silently get the wrong thing.
//   body        text-base (16px) leading-relaxed (1.625)
//
// Body was text-sm/1.43 on all three pages. 16px is the body floor for
// anything that can be Thai, and Thai wants ≥1.5 on wrapping text (CLAUDE.md
// measured the collision threshold at 1.28). This is long-form Thai legal
// prose — the worst possible place to run under the floor. No `leading-tight`
// or `leading-none` appears anywhere in this file, so the html[lang="th"]
// guard has nothing to correct.

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Section, Eyebrow } from "@/components/ui";
import type { LegalBlock, LegalDocument } from "@/content/legal/types";

// Links inside the documents. The pre-existing `text-navy hover:text-gold-ink`
// made them INVISIBLE until hover: `navy` and `ink` are the same #1B1A17, so a
// link in body copy was the exact colour of the body copy around it. The
// underline is the affordance; the hover stays as it was.
const LINK =
  "text-navy underline underline-offset-2 hover:text-gold-ink";

// ---------------------------------------------------------------------------
// Inline markup — see the contract in content/legal/types.ts.
//
//   **bold**              -> <strong>
//   [label](/internal)    -> <Link>      (client-side nav between legal pages)
//   [label](mailto:…)     -> <a>         (and anything else non-relative)
//
// Deliberately NOT a markdown parser: two forms, no nesting, no escapes. Any
// other punctuation is literal text, so a stray asterisk or bracket in legal
// copy cannot restructure a clause. The regex is built per call rather than
// kept at module scope, because a /g regex carries mutable lastIndex.
// ---------------------------------------------------------------------------
function inline(text: string): ReactNode {
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  const out: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index));

    const [raw, bold, label, href] = match;
    if (bold !== undefined) {
      out.push(
        <strong key={match.index} className="font-semibold text-navy">
          {bold}
        </strong>,
      );
    } else if (href!.startsWith("/")) {
      out.push(
        <Link key={match.index} href={href!} className={LINK}>
          {label}
        </Link>,
      );
    } else {
      out.push(
        <a key={match.index} href={href!} className={LINK}>
          {label}
        </a>,
      );
    }
    cursor = match.index + raw.length;
  }

  if (cursor === 0) return text; // no markup at all — the common case
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === "p") return <p>{inline(block.text)}</p>;

  if (block.type === "list") {
    return (
      <ul className="list-disc pl-5 space-y-2">
        {block.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>
    );
  }

  // `dl` — the term sits on its own line rather than inline with an em dash,
  // the way the English JSX set it. Thai has no capitalisation to mark where a
  // term ends, and the em dash is not Thai punctuation; a block term reads the
  // same in both scripts.
  return (
    <dl className="space-y-3">
      {block.items.map((item) => (
        <div key={item.term}>
          <dt className="font-semibold text-navy">{inline(item.term)}</dt>
          <dd className="mt-1">{inline(item.desc)}</dd>
        </div>
      ))}
    </dl>
  );
}

export type LegalDocumentViewProps = {
  doc: LegalDocument;
  /** Already translated. */
  backLabel: string;
  /**
   * Already translated. Present = render the linked section list under the
   * date line. All three documents take it: each runs past 2,800px even on EN
   * desktop, and past 3,900px in Thai on a phone, so a reader looking for one
   * clause should not have to scroll for it. Optional only because a short
   * legal page could legitimately skip it — measure before you do.
   */
  contentsLabel?: string;
};

export function LegalDocumentView({
  doc,
  backLabel,
  contentsLabel,
}: LegalDocumentViewProps) {
  return (
    <Section as="article" width="narrow" rhythm="marketing">
      {/* Both hidden inside the app shell (see insights/page.tsx): signed in,
          the rail is the way back and it already names the section, so the two
          of them only push this h1 off the 56px offset every app page shares. */}
      <Link
        href="/"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5 in-data-[shell=public]:hidden"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Link>

      <Eyebrow className="mb-6 in-data-[shell=public]:hidden">
        {doc.eyebrow}
      </Eyebrow>

      <h1 className="text-d2 lg:text-d3 mb-2">{doc.title}</h1>
      <p className="text-sm leading-relaxed text-ink-muted pb-8 mb-8 border-b border-line">
        {doc.updated}
      </p>

      {contentsLabel ? (
        <nav
          aria-label={contentsLabel}
          className="pb-8 mb-8 border-b border-line"
        >
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {contentsLabel}
          </h2>
          <ol className="space-y-2 text-base leading-relaxed">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={LINK}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="space-y-8 text-ink">
        {doc.sections.map((section) => (
          // scroll-mt clears the h-16 sticky mobile bar the app shell puts
          // above this page, so a contents link does not land under it.
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-d1 mb-5">{section.heading}</h2>
            <div className="space-y-3 text-base leading-relaxed">
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {doc.footnote ? (
        <p className="text-sm leading-relaxed text-ink-muted pt-8 mt-8 border-t border-line">
          {doc.footnote}
        </p>
      ) : null}
    </Section>
  );
}
