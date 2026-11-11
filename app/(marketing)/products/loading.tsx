// Suspense fallback for /products, and it exists because a route-group
// `loading.tsx` wraps every nested segment that lacks its own. Without this
// file the shelf inherited app/(marketing)/loading.tsx — the LANDING HERO
// skeleton (eyebrow, wordmark, a 68px two-line headline, two CTA blocks and the
// founders card with its offset outline), which that file mirrors block-for-
// block by its own admission. Its `in-data-[shell=public]:hidden` escape only
// covers SIGNED-IN members, so an anonymous visitor — the audience /products was
// opened up for — would get a flash of the landing page before the deck painted,
// on every single request (the page is `dynamic = "force-dynamic"`).
//
// A nearest-ancestor loading.tsx wins, so this one file fixes both audiences.
//
// It mirrors the real page, ./ProductShelf.tsx: ONE column on the deck's 360px
// at every width — the category filter's line of chips, the deck, its Skip and
// Try buttons, and the supply CTA under them. No title: the page has no visible
// one. The CTA is drawn even though an investor gets none, because three of
// the four audiences do, and without it the footer — inside the first viewport
// at 1024x800 — jumped 61px down when the page arrived (measured as a
// layout-shift entry on the footer, 718.8 -> 780). The padding is the page's
// own, `pt-6 pb-12 lg:pt-8` on rhythm={false}, copied from ProductShelf.tsx's
// `sectionClass`: change the two together, or the deck jumps when it arrives.
//
// Purely decorative: aria-hidden keeps screen readers on the route announcement
// rather than reading a wall of empty boxes. No copy, so nothing to translate —
// and a `loading.tsx` must render synchronously, which rules out `tServer`.
//
// Heights, not text. The chip row WRAPS (./ProductFilters.tsx), so its height
// depends on how many categories have products; the placeholder draws five
// chips at their Thai widths, which wrap the way the dev shelf's seven do on a
// phone (two lines) and sit on one line on a desktop, plus the row's 12px
// margin. The stage's height is the same calc as STAGE_HEIGHT in ./ProductDeck.tsx, written
// out because a server file cannot read a value out of a client module: change
// the two together, for the same reason.
//
// The card face is the deck's: the 3:2 image box, then the description (four
// 24px lines, drawn as four bars on that pitch) and the footer row with the
// rating and the comment count pinned to the bottom. No name, no maker — the
// card has neither.
import type { CSSProperties } from "react";
import { Card, Section } from "@/components/ui";

const CARD =
  "absolute inset-x-0 top-0 bottom-5 flex origin-bottom flex-col overflow-hidden border border-line shadow-lg [transform:translateY(calc(var(--depth)_*_10px))_scale(calc(1_-_var(--depth)_*_0.04))]";

/** One description line: a 16px bar centred in the 24px line box. */
const LINE = "h-4 bg-line/50";

/** Chip widths in px, roughly the Thai labels at ToggleChip `sm`: "ทั้งหมด",
 *  "เกม", "การเงิน", "เรียนรู้", "ไลฟ์สไตล์". */
const CHIP_WIDTHS = [72, 52, 74, 70, 84];

export default function Loading() {
  return (
    <Section
      rhythm={false}
      className="pt-6 pb-12 lg:pt-8 animate-pulse motion-reduce:animate-none"
    >
      <div aria-hidden="true" className="mx-auto w-full max-w-[360px]">
        {/* The category filter: wrapping chips, 34px each (ToggleChip `sm`),
            centred, with the real row's gap. Four fit one line in this 327-360px
            column; the fifth wraps to a second line below lg, which is what
            the real row does on a phone, and is dropped from lg up, where the
            real row has the Section's width and fits on one line. */}
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {CHIP_WIDTHS.map((w, i) => (
            <div
              key={i}
              className={`h-[34px] shrink-0 rounded-full ${i === 0 ? "bg-line/70" : "bg-line/50"} ${i === 4 ? "lg:hidden" : ""}`}
              style={{ width: w }}
            />
          ))}
        </div>

        <div className="@container w-full">
          <div className="relative [height:calc(66.6667cqw_+_12rem)]">
            {[2, 1].map((depth) => (
              <Card
                key={depth}
                padding="none"
                className={CARD}
                style={{ "--depth": depth } as CSSProperties}
              />
            ))}
            <Card
              padding="none"
              className={CARD}
              style={{ "--depth": 0 } as CSSProperties}
            >
              <div className="aspect-[3/2] w-full shrink-0 bg-line/50" />
              <div className="flex min-h-0 flex-1 flex-col p-5">
                <div className="flex flex-col gap-2 pt-1">
                  <div className={`${LINE} w-full`} />
                  <div className={`${LINE} w-full`} />
                  <div className={`${LINE} w-11/12`} />
                  <div className={`${LINE} w-2/3`} />
                </div>
                {/* The footer row: "★ 4.3 (12)" and the comment count. */}
                <div className="mt-auto flex items-center gap-4 pt-3">
                  <div className="h-5 w-20 rounded-full bg-line/70" />
                  <div className="h-5 w-10 rounded-full bg-line/50" />
                </div>
              </div>
            </Card>
          </div>
          {/* Skip and Try. */}
          <div className="mt-3 flex gap-3">
            <div className="h-[46px] flex-1 rounded-full bg-line/50" />
            <div className="h-[46px] flex-1 rounded-full bg-line/70" />
          </div>
        </div>

        {/* The supply CTA: a small secondary button, centred. */}
        <div className="mx-auto mt-6 h-[38px] w-48 rounded-full bg-line/50" />
      </div>
    </Section>
  );
}
