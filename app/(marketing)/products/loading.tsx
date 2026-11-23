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
// controls enabled by the deck's feature flags. The root classes come from
// ProductShelf.tsx: change the two together, or the deck jumps when it arrives.
//
// The guest toolbar has one row at every width. Inside the app shell, the
// mark and guest controls are replaced by the app's navigation.
//
// Purely decorative: aria-hidden keeps screen readers on the route announcement
// rather than reading a wall of empty boxes. No copy, so nothing to translate —
// and a `loading.tsx` must render synchronously, which rules out `tServer`.
import type { CSSProperties } from "react";
import { Card } from "@/components/ui";
import { FEATURES } from "@/lib/features";

const CARD =
  "absolute inset-x-0 top-0 bottom-5 flex origin-bottom flex-col overflow-hidden border border-line shadow-lg short:bottom-3 deck-wide:flex-row [transform:translateY(calc(var(--depth)_*_10px))_scale(calc(1_-_var(--depth)_*_0.04))]";

const LINE = "h-3.5 bg-line/50 sm:h-4 deck-wide:h-5 deck-wide:short:h-4";

const CHIP_WIDTHS = ["w-14 md:w-[72px]", "w-10 md:w-[52px]", "w-10 md:w-[52px]"];

export default function Loading() {
  const actions = (
    <>
      <div className="h-[46px] flex-1 rounded-full bg-line/50 deck-wide:h-[50px] deck-wide:short:h-[46px]" />
      <div className="h-[46px] flex-1 rounded-full bg-line/70 deck-wide:h-[50px] deck-wide:short:h-[46px]" />
    </>
  );

  return (
    <div
      data-deck-page=""
      aria-hidden="true"
      className="flex h-dvh min-h-0 flex-col overflow-clip max-md:in-data-[shell=public]:h-[calc(100dvh-4.0625rem)] animate-pulse motion-reduce:animate-none"
    >
      <div className="relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 pt-3 pb-3 sm:px-6 lg:px-10 lg:pt-4 lg:pb-4 short:pt-2 short:pb-2 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:short:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1 md:grid-cols-[minmax(2.25rem,1fr)_auto_auto_minmax(max-content,1fr)] md:gap-x-3 max-md:in-data-[shell=public]:grid-cols-[minmax(0,1fr)_auto] md:in-data-[shell=public]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="col-start-1 row-start-1 size-9 justify-self-start rounded-[10px] bg-line/70 in-data-[shell=public]:hidden" />
          <div className="col-start-2 row-start-1 flex gap-0 md:gap-2 max-md:in-data-[shell=public]:col-start-1 max-md:in-data-[shell=public]:gap-2">
            {CHIP_WIDTHS.map((w, i) => (
              <div
                key={i}
                className={`h-9 shrink-0 rounded-md md:h-[34px] md:rounded-full ${w} ${i === 0 ? "bg-line/70" : "bg-line/50"}`}
              />
            ))}
          </div>
          <div className="col-start-3 row-start-1 size-11 rounded-lg bg-line/50 md:hidden in-data-[shell=public]:hidden" />
          <div className="col-start-3 row-start-1 hidden shrink-0 gap-1 justify-self-end md:flex max-md:in-data-[shell=public]:col-start-2 max-md:in-data-[shell=public]:flex">
            <div className="size-9 rounded-lg bg-line/70 md:h-[34px] md:w-[70px] md:rounded-full" />
            <div className="size-9 rounded-lg bg-line/50 md:h-[34px] md:w-[70px] md:rounded-full" />
          </div>
          <div className="col-start-4 row-start-1 size-11 justify-self-end rounded-lg bg-line/50 md:h-[38px] md:w-56 md:rounded-full in-data-[shell=public]:hidden" />
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col lg:mt-4 short:mt-2">
          <div className="relative flex min-h-0 flex-1 flex-col deck-wide:my-auto deck-wide:max-h-[42rem] deck-wide:md:max-lg:max-h-[37rem] deck-wide:[--deck-panel-width:clamp(min(16rem,50%),38.2%,32.5rem)] deck-wide:[--deck-panel-inset:clamp(1.25rem,2.125vw,2rem)] deck-wide:short:[--deck-panel-width:clamp(min(20rem,66%),42%,32.5rem)] deck-wide:short:[--deck-panel-inset:clamp(0.625rem,2.4dvh,1rem)]">
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
                <div className="relative min-h-0 min-w-0 flex-1 bg-line/50">
                  <div className="absolute bottom-3 left-3 h-10 w-16 rounded-full bg-line/70" />
                </div>
                <div className="flex max-h-[calc(100%_-_4rem)] min-h-0 shrink-0 flex-col gap-2 p-3 sm:gap-3 sm:p-5 deck-wide:max-h-none deck-wide:w-(--deck-panel-width) deck-wide:justify-center deck-wide:gap-3 deck-wide:p-(--deck-panel-inset) deck-wide:short:gap-2 deck-wide:short-landscape:gap-1.5">
                  <div className="flex min-h-0 flex-col gap-2 overflow-hidden sm:gap-3 deck-wide:contents deck-wide:short:flex deck-wide:short:gap-1.5 deck-wide:short-landscape:gap-1">
                    <div className="flex shrink-0 flex-col gap-1.5 sm:gap-3 deck-wide:gap-2.5 deck-wide:short:gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-7 w-3/4 rounded bg-line/60 deck-wide:h-[33px] deck-wide:lg:h-[41px] deck-wide:short:h-7" />
                        <div className="h-7 w-12 rounded-full bg-line/50 sm:h-8" />
                      </div>
                      <div className="h-8 w-16 rounded-full bg-line/50" />
                    </div>
                    <div className="flex shrink-0 flex-col deck-wide:gap-3 deck-wide:border-y deck-wide:border-line deck-wide:py-3 deck-wide:short:border-0 deck-wide:short:py-0">
                      <div className="flex flex-col gap-2">
                        <div className={`${LINE} w-full`} />
                        <div className={`${LINE} w-11/12`} />
                        <div className={`${LINE} hidden w-2/3 deck-wide:block`} />
                      </div>
                      <div className="hidden shrink-0 grid-cols-2 gap-3 deck-wide:grid deck-wide:short:hidden">
                        {[0, 1].map((i) => (
                          <div key={i} className="flex flex-col gap-1.5">
                            <div className="h-[2.0625rem] w-14 rounded-lg bg-line/60 lg:h-[2.625rem] short:h-[2.0625rem]" />
                            <div className="h-4 w-20 rounded-full bg-line/50 short:h-3" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="size-6 rounded-full bg-line/60" />
                      <div className="h-5 w-24 rounded bg-line/50 short:h-4" />
                    </div>
                  </div>
                  <div className="mt-auto flex shrink-0 items-center gap-4 border-t border-line pt-2 sm:pt-3 deck-wide:hidden deck-wide:short:mt-0 deck-wide:short:flex deck-wide:short:pt-1.5">
                    <div className="h-5 w-20 rounded-full bg-line/70" />
                    <div className="h-5 w-10 rounded-full bg-line/50" />
                  </div>
                  <div className="h-4 w-28 shrink-0 rounded bg-line/50 sm:h-5 deck-wide:short:h-4" />
                  {FEATURES.productDeckActions && (
                    <div className="hidden shrink-0 grid-cols-2 gap-3 deck-wide:grid">{actions}</div>
                  )}
                </div>
              </Card>
            </div>
            {/* Skip and Try. */}
            {FEATURES.productDeckActions && (
              <div className="mx-auto mt-3 flex w-full max-w-md shrink-0 gap-2 sm:gap-3 short:mt-2 deck-wide:hidden">{actions}</div>
            )}
          </div>
        </div>
        {FEATURES.guestProductLegalLinks && (
          <div className="mx-auto mt-3 h-4 w-64 rounded-full bg-line/40 lg:mt-4 in-data-[shell=public]:hidden" />
        )}
      </div>
    </div>
  );
}
