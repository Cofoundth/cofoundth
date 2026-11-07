"use client";

// /products — the screenshot preview layered over a product card's cover.
//
// ── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────
// ProductCard is a SERVER component and its header says so on purpose: the
// card is markup, the page's translated strings arrive as props, and nothing
// in it needs the DOM. A shelf of still cards reads dead, so hovering a card
// cycles its screenshots — which DOES need the DOM. Putting that handler in
// ProductCard would have turned the whole card (title, blurb, author link)
// into client-rendered output to buy one `onPointerEnter`.
//
// So the split is: the card keeps the fixed-ratio box and the COVER <Image>
// server-rendered, and this component mounts INSIDE that box, absolutely
// positioned over it. The cover underneath is never re-rendered, never
// re-requested, and a card with ONE image never renders this file at all —
// ProductCard checks `images.length > 1` before it gets here, so the
// single-image and no-image cards ship exactly the markup they shipped before
// and zero extra JS.
//
// `images` is the FULL list including the cover at index 0, not the tail. The
// dot count, the cycle length and the active index all have to agree with the
// card's own cover, and handing this component `images.slice(1)` means every
// one of them is an off-by-one waiting to happen. Index 0 renders NO layer
// here — it is the cover showing through.
//
// ── THE TRIGGER IS HOVER, AND THE CYCLE IS TIMED ──────────────────────────
// A pointer inside the box advances one image per ADVANCE_MS and loops back to
// the cover; leaving stops and resets. NOTHING MOVES ON ITS OWN — a card that
// is not being pointed at is a still card, so there is never more than one
// timer alive on the page.
//
// Two rejected versions, so neither comes back:
//   · HOVER ZONES — the box split into N invisible columns, hovering column i
//     showing image i. On a 328px card that is 67px of steering per
//     screenshot, and it asks the reader to aim at something they cannot see.
//     THIS is what was wrong with the first design, not hover.
//   · CONTINUOUS AUTOPLAY — every card cycling unprompted. It reaches a phone,
//     which hover does not, but it buys that by animating six cards beside a
//     paragraph somebody is reading, and it drags in WCAG 2.2.2 (a pause
//     control), viewport gating and per-card phase offsets to stay civil. On
//     a phone the DOTS are the answer instead: see below.
//
// ── THE THREE WAYS IN, AND WHAT EACH ONE DOES ─────────────────────────────
// HOVER — starts the cycle. Mouse and pen only: `pointerenter` also fires for
//   a touch, where there is no "leave" to stop it against, so a finger is
//   treated as a tap and not as a hover.
// TOUCH — there is no hover on a phone and this market is phone-first, so the
//   dots are REAL buttons, each a 24x24 tap target (WCAG 2.5.8 minimum). They
//   are now the ONLY way to reach screenshots 2..n on a phone, which makes
//   them more load-bearing than they were, not less.
// KEYBOARD — the same dots, roving tabIndex, see the note on the group below.
//   Focus PRIMES the images and enables the arrow keys. It does not start the
//   timer: someone arriving by keyboard is reading, and moving the content
//   under them is the hostile version of this feature.
//
// Every one of those three TAKES THE CARD OVER (`stopCycle`): a manual pick
// wins, and the timer does not yank the reader to the next image a second
// later. Leaving and re-entering resumes, so the stop is scoped to the
// gesture rather than sticky.
//
// ── reduced motion ────────────────────────────────────────────────────────
// `prefers-reduced-motion` suppresses the timed advance ENTIRELY — not a
// slower one. The preference is about the user's vestibular needs, not about
// who started the animation, so "they hovered, so it is consented motion" is
// not an argument. The dots stay as the complete manual control, which is why
// there is nothing to degrade to: the card simply stays a card.
//
// ── THE 30-IMAGE PROBLEM ───────────────────────────────────────────────────
// Six cards x five screenshots is 30 images, and next.config.ts declares no
// `images` block — so `remotePatterns` is empty, every src renders
// `unoptimized` (ProductCard's box explains why that is the only option, not
// a shortcut), and "unoptimized" means the ORIGINAL bytes. A phone-sized
// screenshot off a Thai founder's device is routinely 1-3MB; 30 of them on
// first paint is the whole page budget spent on images nobody has asked to
// see yet.
//
// So the tail is GATED on `primed`: until the first pointerenter or focus,
// this component renders dots and not one <Image>. Measured on /products with
// the six dev fixtures: 5 image requests on load (one cover per card that has
// one), and a card's own tail only once it is pointed at.
//
// `loading="eager"` on the tail is deliberate. It is mounted only once a human
// has already pointed at the card, so the lazy IntersectionObserver inside
// next/image would just add a frame of delay to an image we know is wanted.

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/components/ui";

/**
 * How long each image holds before the next one. The FIRST advance is a full
 * interval after the pointer arrives — `setInterval` does not fire on entry —
 * which is the behaviour we want: the cover is what the reader was already
 * looking at, so it gets its own beat before anything moves.
 */
const ADVANCE_MS = 1000;

/**
 * `prefers-reduced-motion` as a React store. ONE MediaQueryList for every
 * gallery on the page, created lazily so nothing touches `window` during the
 * server render.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the value is
 * read-only browser state that can change while mounted, which is exactly the
 * shape this hook exists for, and it does not cascade a second render on
 * mount the way setState-in-an-effect does. Same pattern as the shared clock
 * in messages/[matchId]/MessageThread.tsx.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

let reducedMotionQuery: MediaQueryList | null = null;

function reducedMotionMql(): MediaQueryList {
  return (reducedMotionQuery ??= window.matchMedia(REDUCED_MOTION));
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const mql = reducedMotionMql();
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getReducedMotion(): boolean {
  return reducedMotionMql().matches;
}

/**
 * Server render: assume reduced. The preference is unknowable here, this value
 * gates a timer rather than any markup — so there is no hydration mismatch to
 * have — and the safe guess is the one that can only ever WITHHOLD motion. The
 * real client value is in long before a pointer can reach the box.
 */
function getReducedMotionOnServer(): boolean {
  return true;
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionOnServer,
  );
}

/**
 * Keyboard for the dot group. Mirrors components/ui/Tabs.tsx's `onTabKeyDown`
 * deliberately — same roving-tabindex contract, same read-the-DOM-rather-than-
 * close-over-the-list approach, so the two behave identically under the same
 * keys. `.focus()` then `.click()` keeps focus movement and selection on one
 * code path instead of two that can disagree.
 *
 * Up/Down are bound as well as Left/Right: a radio group is announced as a
 * single-select, and arrow keys of either axis are what a screen-reader user
 * is told to press.
 */
const DOT_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
];

function onDotKeyDown(e: KeyboardEvent<HTMLElement>) {
  if (!DOT_KEYS.includes(e.key)) return;
  const dots = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  );
  const current = dots.indexOf(document.activeElement as HTMLButtonElement);
  if (dots.length === 0 || current === -1) return;
  e.preventDefault();
  const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? dots.length - 1
        : back
          ? (current - 1 + dots.length) % dots.length
          : (current + 1) % dots.length;
  dots[next].focus();
  dots[next].click();
}

import { useCardHovered } from "./card-hover";

export function ProductGallery({
  images,
  sizes,
}: {
  /** EVERY image, cover first. ProductCard guarantees length > 1, that each
   *  entry already survived its `webUrl()` parse, and that the list is capped
   *  at MAX_PRODUCT_IMAGES. */
  images: string[];
  /** The card's own `sizes`, passed rather than re-typed so the cover and the
   *  screenshots can never disagree about how wide this box is. */
  sizes: string;
}) {
  const tr = useT();
  const count = images.length;
  const hovered = useCardHovered();
  const reduced = useReducedMotion();

  const [active, setActive] = useState(0);
  // Has a human pointed at this card yet? Gates the `images.length - 1` tail
  // requests. Once true it stays true — the images are in the browser cache
  // from then on and unmounting them would only make a second hover re-fetch.
  // Sticky: once the tail has been fetched it stays fetched, so a second
  // hover does not re-request. Touch sets it via onPointerDown.
  const [everPrimed, setEverPrimed] = useState(false);
  // Is auto-advance live? Set by a hover-capable pointer arriving, cleared by
  // that pointer leaving or by any manual engagement. It means "the pointer is
  // inside and the user has not taken over", not "a timer is running" —
  // reduced motion and tab visibility are read where the timer is owned.
  // The user took the wheel on THIS hover (picked a dot / used the arrows).
  // Cleared when the pointer leaves, below.
  const [tookOver, setTookOver] = useState(false);

  // HOVER COMES FROM THE CARD, NOT FROM HERE. This element sits UNDER the
  // card's stretched link (`absolute inset-0 z-10`), so its own
  // onPointerEnter never fired — see ./card-hover for the measurement, and for
  // why raising z-index or pointer-events-none each make it worse. The scope
  // is an ancestor of that link, so it hears the hover while the link keeps
  // the click.
  //
  // DERIVED, NOT MIRRORED. Copying `hovered` into state inside an effect is a
  // render cascade (eslint: "Calling setState synchronously within an effect"),
  // and it is unnecessary — both values are a pure function of the hover.
  const primed = everPrimed || hovered;
  const cycling = hovered && !tookOver && !reduced;

  // Resetting to the cover when the pointer leaves is the one thing that is
  // NOT derivable: `active` is also moved by the timer and by the dots. This
  // is React's prescribed shape for adjusting state when a prop changes —
  // compare against the previous value during render, not in an effect.
  // Touch never sets `hovered`, so tapping dot 3 and lifting the finger leaves
  // the card on image 3, which is the whole point of the dots on a phone.
  const [wasHovered, setWasHovered] = useState(hovered);
  if (wasHovered !== hovered) {
    setWasHovered(hovered);
    if (!hovered) {
      setActive(0);
      setTookOver(false);
    }
  }


  // THE TIMER, and the only place one exists. Every condition that can stop it
  // is either a dependency here or a listener registered here, so there is no
  // path that starts a second interval and none that leaves one running:
  // React tears this down on every dependency change AND on unmount, which is
  // what covers a card scrolled out of view mid-hover.
  //
  // `primed` is in the gate because of the ordering promise in the 30-image
  // note above — the tail <Image> elements must be MOUNTED, and therefore
  // already requesting bytes, before the first tick can land on one. Both
  // flags are set in the same pointerenter handler, so React batches them into
  // one commit and this effect runs once, after the images exist. (If the
  // bytes are still in flight when the tick lands, an <img> with nothing
  // decoded yet paints nothing and the cover below shows through — the cost is
  // a repeated beat on the cover, not a flash of empty box. Gating each step
  // on its own `load` event instead would make the advance RATE a function of
  // the network, which is a worse thing to watch.)
  useEffect(() => {
    if (!cycling || !primed || reduced || count < 2) return;

    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      id ??= setInterval(() => setActive((i) => (i + 1) % count), ADVANCE_MS);
    };
    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    // A backgrounded tab gets the interval CLEARED, not a tick that returns
    // early — browsers throttle background timers, they do not drop them.
    // Coming back resumes from wherever the cycle stopped; the pointer may
    // well have left without an event while the tab was hidden, in which case
    // the next real pointerleave resets to the cover.
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [cycling, primed, reduced, count]);

  /** The user has taken over, so stop advancing for the rest of this hover. */
  function stopCycle() {
    setTookOver(true);
  }

  function show(i: number) {
    setEverPrimed(true);
    setActive(i);
    stopCycle();
  }

  // A tap still has to prime, or the first dot press on a phone shows a gap
  // where an unfetched screenshot should be.
  function onTouchPrime() {
    setEverPrimed(true);
  }

  // The keyboard equivalent of the above: tabbing out of the dots resets, so a
  // card is never left parked on screenshot 4 with nothing on screen saying
  // why. `relatedTarget` null (focus left the window entirely) resets too.
  //
  // It deliberately does NOT resume the cycle when a mouse is still inside:
  // starting motion at the moment focus leaves is a surprise, and the user can
  // have it back by leaving and re-entering.
  function onBlur(e: FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setActive(0);
  }

  return (
    <div
      className="absolute inset-0"
      // No pointer listeners here on purpose — they never fired under the
      // card link. Hover arrives via useCardHovered(); this only catches the
      // touch-down that should start fetching the tail.
      onPointerDown={onTouchPrime}
      // Focus can only arrive here from a dot (nothing else in this subtree is
      // focusable), so this is both "prime the images" and "the keyboard has
      // this card now". It never starts the timer.
      onFocus={() => {
        setEverPrimed(true);
        stopCycle();
      }}
      onBlur={onBlur}
    >
      {/* THE TAIL. Index 0 is absent on purpose — it is the server-rendered
          cover below this layer, and re-rendering it here would be a second
          request for bytes the browser already has.

          All of them stay mounted and cross-fade by opacity rather than
          swapping one <img src>: a src swap shows the box empty while the new
          original downloads, which on 2MB screenshots is a visible flash of
          nothing on every step of the cycle.

          `motion-reduce:transition-none` stays, and is the SECOND thing
          reduced motion turns off here rather than the whole story — the timer
          is the first. With no timer and no transition, the only image change
          left is one the user asked for, and it is instant.

          alt="" throughout: these are decorative duplicates of the dot that
          selects them. The dots carry the accessible names, the product's own
          name is a heading three lines below, and five alt texts per card
          saying "Product image 2" is noise a screen reader has to wade
          through to reach the thing that matters. */}
      {primed &&
        images.slice(1).map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            unoptimized
            loading="eager"
            sizes={sizes}
            className={cn(
              "object-cover transition-opacity duration-150 motion-reduce:transition-none",
              active === i + 1 ? "opacity-100" : "opacity-0",
            )}
          />
        ))}

      {/* THE DOTS — ONE TAB STOP PER CARD, not five.
          Five dots x six cards is 30 extra stops between the page heading and
          the first card's link, which is the real cost of the obvious version
          (five plain buttons each in the tab sequence). Keyboard users would
          pay it on every visit whether or not they care about screenshots.
          So: `role="radiogroup"` + roving `tabIndex`. Tab enters the group
          once and leaves it; arrow keys (plus Home/End) move within and select
          as they go. That is the standard single-select pattern, it is what the
          app's own Tabs primitive already does, and it keeps DIRECT access to
          every screenshot — which the cheaper alternative (one "next" button,
          6 stops, image 4 reachable only by pressing it three times) does not.

          They are also the ONLY route to screenshots 2..n without a hover, so
          they carry the phone and the reduced-motion reader on their own.

          Both labels are EXISTING dictionary keys ("Product images" /
          "Product image", already Thai in lib/translations.json for the org
          product gallery), so this ships translated in the default locale
          rather than waiting on new copy. The index is appended as a digit:
          "รูปสินค้า 2".

          ── z-20, AND WHY THE DOTS DO NOT STOP PROPAGATION ────────────────
          The whole card is ONE stretched <a> (ProductCard), an absolutely-
          positioned sibling at z-10 covering everything including this image.
          `z-20` here is what keeps the dots above it, so a tap lands on a dot
          and not on the link.
          There is deliberately no `stopPropagation` on the buttons: the
          stretched link is a SIBLING of this subtree, not an ancestor, so a
          dot's click event never passes through it and there is nothing for a
          handler to stop. Adding one would read as the thing protecting the
          tap, and the next person would be free to move the link into an
          ancestor and still believe they were covered. The z-index is the
          protection; it is verified by an actual 375px tap.

          The strip stays `pointer-events-none` with only the visible pill
          taking the pointer back, which is load-bearing in a second way: the
          transparent half of the strip passes taps THROUGH to the card link,
          so the parts of the image that are not a dot behave like the rest of
          the image. The pill itself swallows them — a near-miss between two
          dots does nothing rather than navigating away. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
        <div
          role="radiogroup"
          aria-label={tr("Product images")}
          onKeyDown={onDotKeyDown}
          // A pill over an unknown photograph: the scrim is what guarantees the
          // dots are visible on a white screenshot as well as a dark one.
          // `bg-navy` at alpha is the ink token, not a new colour — the palette
          // has no accent hue to reach for here and does not need one.
          //
          // 55% is a MEASURED floor, not a taste call. The worst case for a
          // white dot is a pure-white screenshot under it: navy #1B1A17 at 55%
          // over #FFF composites to ~#818180, relative luminance ~0.22, which
          // puts the SELECTED dot at 3.9:1 — clear of the 3:1 that WCAG 1.4.11
          // asks of a non-text control. At 40% (where this started) the same
          // case measures 2.4:1 and the control quietly disappears on exactly
          // the screenshots a maker is most likely to upload: a light app UI.
          // Over a dark screenshot it only gets better (~19:1).
          className="pointer-events-auto flex items-center rounded-full bg-navy/55 px-1 backdrop-blur-[2px]"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="radio"
              aria-checked={i === active}
              aria-label={`${tr("Product image")} ${i + 1}`}
              // Roving: only the selected dot is in the page's Tab sequence.
              tabIndex={i === active ? 0 : -1}
              onClick={() => show(i)}
              // 24x24 is the WCAG 2.5.8 minimum target and the dot itself is
              // 6px, so the box does the touch work and the glyph does the
              // looking. Adjacent targets are also targets, so they need no
              // spacing between them to clear the rule.
              className="grid h-6 w-6 place-items-center"
            >
              {/* 35%, not 45%: on the worst-case pill above, 45% leaves the
                  selected and unselected dots 1.8:1 apart, which on a 6px
                  glyph is not a state you can see. 35% opens it to 2.2:1 on a
                  white screenshot and 6:1 on a dark one. */}
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors motion-reduce:transition-none",
                  i === active ? "bg-white" : "bg-white/35",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
