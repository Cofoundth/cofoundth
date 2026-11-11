// Suspense fallback for /products, and it exists because a route-group
// `loading.tsx` wraps every nested segment that lacks its own. Without this
// file the shelf inherited app/(marketing)/loading.tsx — the LANDING HERO
// skeleton — and its `in-data-[shell=public]:hidden` escape only covers
// SIGNED-IN members, so an anonymous visitor would get a flash of the landing
// page before the deck painted, on every request (the page is
// `dynamic = "force-dynamic"`). A nearest-ancestor loading.tsx wins, so this one
// file fixes both audiences.
//
// It mirrors the real page, ./ProductShelf.tsx: one viewport tall, marked
// [data-deck-page] so the logged-out header and footer are not drawn while it
// shows either (they would vanish when the deck arrived and pull it up the
// screen), the top line, a card filling the stage in the deck's two shapes
// (a column, or a row on a wide screen: ./ProductDeck.tsx, CARD_BODY), and the
// Skip and Try buttons. The root and container class strings are COPIED from
// ProductShelf.tsx: change the two together, or the deck jumps when it arrives.
//
// The top line draws the logged-out corners (the mark, and a pill where
// "Sign in" goes), the audience the shelf is the front door for; the mark is
// dropped inside the app shell, where the right-hand pill stands for the
// supply CTA. The chips WRAP (./ProductFilters.tsx), so their height depends on
// how many categories have products: five placeholders at their Thai widths.
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
const LINE = "h-4 bg-line/50 deck-wide:h-5";

/** Chip widths in px, roughly the Thai labels at ToggleChip `sm`: "ทั้งหมด",
 *  "เกม", "การเงิน", "เรียนรู้", "ไลฟ์สไตล์". */
const CHIP_WIDTHS = [72, 52, 74, 70, 84];

export default function Loading() {
  return (
    <div
      data-deck-page=""
      aria-hidden="true"
      className="flex h-dvh min-h-[34rem] flex-col overflow-clip in-data-[shell=public]:h-[calc(100dvh-4.0625rem)] md:in-data-[shell=public]:h-dvh animate-pulse motion-reduce:animate-none"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 pt-3 pb-3 sm:px-6 lg:px-10 lg:pt-4 lg:pb-5">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="col-start-1 row-start-1 h-9 w-9 justify-self-start rounded-[10px] bg-line/70 in-data-[shell=public]:invisible" />
          <div className="col-span-2 row-start-2 flex flex-wrap justify-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            {CHIP_WIDTHS.map((w, i) => (
              <div
                key={i}
                className={`h-[34px] shrink-0 rounded-full ${i === 0 ? "bg-line/70" : "bg-line/50"}`}
                style={{ width: w }}
              />
            ))}
          </div>
          <div className="col-start-2 row-start-1 h-[38px] w-36 justify-self-end rounded-full bg-line/50 sm:col-start-3" />
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
              {/* CARD_BODY's box: the description, then the footer row with
                  "★ 4.3 (12)" and the comment count. */}
              <div className="flex h-40 shrink-0 flex-col p-5 deck-wide:h-auto deck-wide:w-[clamp(16rem,30%,22rem)] deck-wide:justify-center deck-wide:p-6">
                <div className="flex flex-col gap-2 pt-1">
                  <div className={`${LINE} w-full`} />
                  <div className={`${LINE} w-11/12`} />
                  <div className={`${LINE} w-2/3`} />
                </div>
                <div className="mt-auto flex items-center gap-4 pt-3 deck-wide:mt-0 deck-wide:pt-5">
                  <div className="h-5 w-20 rounded-full bg-line/70" />
                  <div className="h-5 w-10 rounded-full bg-line/50" />
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
      </div>
    </div>
  );
}
