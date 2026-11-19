// Suspense fallback for /products, and it exists because a route-group
// `loading.tsx` wraps every nested segment that lacks its own. Without this
// file the shelf inherited app/(marketing)/loading.tsx — the LANDING HERO
// skeleton — and its `in-data-[shell=public]:hidden` escape only covers
// SIGNED-IN members, so an anonymous visitor would get a flash of the landing
// page before the deck painted, on every request (the page is
// `dynamic = "force-dynamic"`). A nearest-ancestor loading.tsx wins, so this one
// file fixes both audiences.
//
// It mirrors the real page, ./ProductShelf.tsx and ProductShelfView.tsx, marked
// [data-deck-page] so the logged-out header and footer are not drawn while it
// shows either (they would vanish when the deck arrived and pull it up the
// screen), the top line, a card filling the stage in the deck's two shapes
// (a column, or a row on a wide screen: ./ProductDeck.tsx, CARD_BODY), and the
// Skip and Try buttons. The root and container class strings are COPIED from
// ProductShelf.tsx: change the two together, or the deck jumps when it arrives.
//
// The top line draws the logged-out corners (the mark, and a pill where
// "Sign in" goes), the audience the shelf is the front door for; the mark is
// dropped inside the app shell. The view switch sits beside the filters on
// phones. Three placeholders match the fixed All, Games and Apps filters
// at their Thai widths.
//
// Purely decorative: aria-hidden keeps screen readers on the route announcement
// rather than reading a wall of empty boxes. No copy, so nothing to translate —
// and a `loading.tsx` must render synchronously, which rules out `tServer`.
import type { CSSProperties } from "react";
import { Card } from "@/components/ui";

const CARD =
  "absolute inset-x-0 top-0 bottom-5 flex origin-bottom flex-col overflow-hidden border border-line shadow-lg deck-wide:flex-row [transform:translateY(calc(var(--depth)_*_10px))_scale(calc(1_-_var(--depth)_*_0.04))]";

/** One description line: a bar centred in its line box (16px in 24, and 20px
 *  in the wide card's 28). */
const LINE = "h-4 bg-line/50 deck-wide:h-7";

/** Chip widths in px, roughly the Thai labels at ToggleChip `sm`: "ทั้งหมด",
 *  "เกม", "แอป" — this phase's three (./categories.ts FILTER_BUCKETS). Five
 *  wrapped onto a second line on a phone that the real row never needs, and
 *  the deck jumped ~42px when the page arrived. */
const CHIP_WIDTHS = [72, 52, 52];

export default function Loading() {
  return (
    <div
      data-deck-page=""
      aria-hidden="true"
      className="flex h-dvh min-h-[30rem] flex-col overflow-clip max-sm:h-[calc(100dvh-4.5rem)] sm:min-h-[34rem] in-data-[shell=public]:h-[calc(100dvh-4.0625rem)] in-data-[shell=public]:max-sm:h-[calc(100dvh-8.5625rem)] md:in-data-[shell=public]:h-dvh animate-pulse motion-reduce:animate-none"
    >
      <div className="relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 pt-3 pb-3 sm:px-6 lg:px-10 lg:pt-4 lg:pb-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="col-start-1 row-start-1 h-9 w-9 justify-self-start rounded-[10px] bg-line/70 in-data-[shell=public]:hidden" />
          <div className="col-start-2 row-start-1 h-[38px] w-36 justify-self-end rounded-full bg-line/50 sm:col-start-3 in-data-[shell=public]:max-sm:hidden" />
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-center sm:gap-3">
            <div className="flex flex-wrap gap-2">
              {CHIP_WIDTHS.map((w, i) => (
                <div
                  key={i}
                  className={`h-[34px] shrink-0 rounded-full ${i === 0 ? "bg-line/70" : "bg-line/50"}`}
                  style={{ width: w }}
                />
              ))}
            </div>
            <div className="h-[38px] w-[78px] shrink-0 rounded-full bg-line/50 min-[25rem]:w-36 in-data-[shell=public]:sm:hidden" />
          </div>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col lg:mt-4">
          <div className="relative min-h-0 flex-1">
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
              <div className="min-h-0 min-w-0 flex-1 bg-line/50" />
              {/* CARD_BODY's box: the description (the wide panel's
                  headline), then the phone's footer row ("★ 4.3 (12)" and
                  the comment count) or the wide panel's stat strip. */}
              <div className="flex h-40 shrink-0 flex-col p-5 max-sm:h-36 max-sm:p-4 deck-wide:h-auto deck-wide:w-[clamp(17rem,34%,26rem)] deck-wide:justify-center deck-wide:p-8">
                <div className="flex flex-col gap-2 pt-1 deck-wide:gap-3">
                  <div className={`${LINE} w-full`} />
                  <div className={`${LINE} w-11/12`} />
                  <div className={`${LINE} w-2/3`} />
                </div>
                <div className="mt-auto flex items-center gap-4 pt-3 deck-wide:hidden">
                  <div className="h-5 w-20 rounded-full bg-line/70" />
                  <div className="h-5 w-10 rounded-full bg-line/50" />
                </div>
                <div className="mt-8 hidden grid-cols-2 gap-6 border-t border-line pt-6 deck-wide:grid">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="h-[33px] w-14 rounded-lg bg-line/60" />
                      <div className="h-3 w-20 rounded-full bg-line/50" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          {/* Skip and Try. */}
          <div className="mx-auto mt-3 flex w-full max-w-md gap-3">
            <div className="h-[46px] flex-1 rounded-full bg-line/50" />
            <div className="h-[46px] flex-1 rounded-full bg-line/70" />
          </div>
        </div>
        {/* The logged-out legal line under the buttons: ProductShelf.tsx
            legalLinks. */}
        <div className="mx-auto mt-3 h-4 w-64 rounded-full bg-line/40 lg:mt-4 in-data-[shell=public]:hidden" />
      </div>
    </div>
  );
}
