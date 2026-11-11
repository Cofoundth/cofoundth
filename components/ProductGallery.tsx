"use client";

// A product's screenshots, one at a time: the deck's top card
// (app/(marketing)/products/ProductDeck.tsx) and the product's own page
// (app/(marketing)/products/ProductDetail.tsx, on /p/<id> and /community/<id>).
// ONE component, so the two cannot drift apart in how a reader moves through
// the pictures.
//
// Every image is mounted, stacked, one opaque. A change of image paints the new
// one only once it has LOADED and keeps the old one until then, so the box
// never flashes empty. Dots say which image is showing.
//
//   a hovering pointer     `(hover: hover) and (pointer: fine)`. < and > appear
//                          while the pointer is over the images. Real buttons,
//                          in the tab order, shown on keyboard focus; on one,
//                          ← and → change the image and stop there (they never
//                          reach the deck's own ← skip / → open). No autoplay.
//   anything else          No arrows. The images advance every AUTOPLAY_MS,
//                          looping, and stop while a finger is down (including
//                          one scrolling the page from it, until it lifts),
//                          while the tab is hidden, while the images are off
//                          screen, and always under prefers-reduced-motion.
//   prefers-reduced-motion No autoplay on anything, so the arrows are SHOWN
//                          on anything, always visible: on a touch screen they
//                          are then the only way past the first image, and
//                          without them images 2–5 could not be reached.
//
// "While a finger is down" means down anywhere in the gallery's SCOPE: the
// nearest ancestor carrying `data-gallery-scope`, or the image box itself when
// there is none. On the deck the scope is the whole card, because a press
// anywhere on it may be the start of a swipe; on a product page it is the box.
//
// TWO THINGS HERE ARE FOR THE DECK AND INERT ELSEWHERE, written down so nobody
// strips them as dead:
//   * `data-deck-nodrag` on the arrows: the deck reads it so a press on an
//     arrow never starts a swipe. Nothing else reads it.
//   * the `group-has-[[data-gallery-zone]:hover]/card` reveal in ARROW: on the
//     deck the card's link covers the images, so the image box under it is
//     never :hover itself, and the link carries a `data-gallery-zone` box of
//     the same footprint to say "the pointer is over the pictures". With no
//     `group/card` ancestor (a product page) the plain `group-hover/gallery`
//     reveal does the work.
//
// `inactive` is the deck's card BEHIND the top one: first image only, no
// controls, no clock. A gallery only ever goes from inactive to active (the
// deck's cards are keyed by product and the top one leaves the slice when it
// flies out), so an active gallery always starts at its first image.

import Image from "next/image";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/components/ui";

/** A pointer that can hover: it gets the arrows, and never the autoplay. */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** The owner's number: on a phone the pictures change once a second. */
const AUTOPLAY_MS = 1000;

/** The < and >. Hidden outright on a pointer that cannot hover; otherwise
 *  invisible until the pointer is over the pictures, or one has focus. Under
 *  reduced motion, shown and visible on every pointer (see the header). */
const ARROW =
  "absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-navy shadow-lg opacity-0 transition-opacity duration-150 hover:bg-cream motion-reduce:transition-none focus-visible:opacity-100 group-hover/gallery:opacity-100 group-has-[[data-gallery-zone]:hover]/card:opacity-100 group-has-[:focus-visible]/gallery:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:grid motion-reduce:grid motion-reduce:opacity-100";

export type ProductGalleryLabels = {
  /** The arrows, which have no visible text. */
  previousImage: string;
  nextImage: string;
};

export function ProductGallery({
  images,
  labels,
  inactive = false,
  preload = false,
  fit = "cover",
  sizes,
  altPrefix,
  className,
}: {
  /** Already through productImages() in app/(marketing)/products/
   *  product-view.ts: parsed, and capped. */
  images: readonly string[];
  labels: ProductGalleryLabels;
  /** First image only, no controls: the deck's cards behind the top one. */
  inactive?: boolean;
  /** Fetch the images past the first now: the deck's card next in line, so
   *  they come out of the cache once it is the top card. */
  preload?: boolean;
  /** `cover` crops into the box (the deck card, one height for every card);
   *  `contain` letterboxes (a product page, where nothing is cropped). */
  fit?: "cover" | "contain";
  sizes: string;
  /** Unset: the images are decorative (alt=""), because the deck card's link
   *  already names the product. Set: image i is "{altPrefix} {i + 1}", and the
   *  images not on screen are hidden from assistive tech. */
  altPrefix?: string;
  /** The box's corners, which depend on what it sits in. */
  className?: string;
}) {
  const active = !inactive;
  const several = images.length > 1;
  const boxRef = useRef<HTMLDivElement>(null);
  /** The image asked for. The dots show this. */
  const [wanted, setWanted] = useState(0);
  /** The image painted: `wanted` once it has loaded, the one before until
   *  then, so a change never shows an empty box. */
  const [shown, setShown] = useState(0);
  /** What the handlers read. `wanted` is only this, rendered. */
  const wantedRef = useRef(0);
  const loaded = useRef(new Set<number>());
  const broken = useRef(new Set<number>());

  useEffect(() => {
    if (!preload) return;
    for (const src of images.slice(1)) new window.Image().src = src;
  }, [preload, images]);

  function show(next: number) {
    wantedRef.current = next;
    setWanted(next);
    if (loaded.current.has(next)) setShown(next);
  }

  /** The image `dir` away from the wanted one, wrapping, past any that failed
   *  to load. */
  function neighbour(dir: 1 | -1): number {
    const n = images.length;
    for (let step = 1; step < n; step++) {
      const i = (((wantedRef.current + dir * step) % n) + n) % n;
      if (!broken.current.has(i)) return i;
    }
    return wantedRef.current;
  }

  // ← and → on an arrow move the IMAGE, and stop there. On the deck, left to
  // bubble they would reach its own ←/→ (skip, and try the product in a new
  // tab) from a control that only ever changes the picture. A modified key is not
  // ours: Alt+← is the browser's Back.
  function onArrowKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    show(neighbour(event.key === "ArrowLeft" ? -1 : 1));
  }

  // One autoplay step. An image that has not loaded yet is waited for (the
  // next tick tries again) rather than shown as an empty box.
  const autoplayStep = useEffectEvent(() => {
    const next = neighbour(1);
    if (loaded.current.has(next)) show(next);
  });

  useEffect(() => {
    if (!active || images.length < 2) return;
    const box = boxRef.current;
    if (!box) return;
    const scope = box.closest<HTMLElement>("[data-gallery-scope]") ?? box;

    const hover = window.matchMedia(HOVER_QUERY);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    /** Pointers down in the scope, by id, with their pointerType: a finger
     *  resting, a swipe under way, or a finger scrolling the page. */
    const held = new Map<number, string>();
    /** Without touch events nothing would ever let a cancelled finger go. */
    const touchEvents = "ontouchend" in window;
    let onScreen = true;
    let timer = 0;

    // Every condition is re-read here, and every event that can change one
    // calls it, so there is one place that decides whether the clock runs.
    // Resuming always waits a whole AUTOPLAY_MS, so lifting a finger never
    // changes the image under it at once.
    const schedule = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (
        hover.matches ||
        reduced.matches ||
        held.size > 0 ||
        !onScreen ||
        document.hidden
      ) {
        return;
      }
      timer = window.setTimeout(() => {
        autoplayStep();
        schedule();
      }, AUTOPLAY_MS);
    };
    const release = (e: PointerEvent) => {
      if (held.delete(e.pointerId)) schedule();
    };
    // A finger that starts in the scope and then scrolls the page vertically
    // gets pointercancel the moment the browser takes the pan, with the finger
    // still on the glass, and no pointerup ever follows. So a cancelled TOUCH
    // pointer stays held, and is let go by the touchend or touchcancel that
    // leaves no finger on the screen. Touch events keep coming through a
    // browser-run scroll; pointer events do not.
    const cancel = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !touchEvents) release(e);
    };
    const lift = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      let changed = false;
      for (const [id, type] of held) {
        if (type === "touch") changed = held.delete(id) || changed;
      }
      if (changed) schedule();
    };

    // Capture, so a press that lands on a link or a control inside the scope
    // pauses it all the same, whatever those do with the event.
    scope.addEventListener(
      "pointerdown",
      (e) => {
        held.set(e.pointerId, e.pointerType);
        schedule();
      },
      { ...options, capture: true },
    );
    // On the window: a finger can lift well outside the scope mid-swipe, or
    // after scrolling it out from under the finger.
    window.addEventListener("pointerup", release, options);
    window.addEventListener("pointercancel", cancel, options);
    window.addEventListener("touchend", lift, { ...options, passive: true });
    window.addEventListener("touchcancel", lift, { ...options, passive: true });
    document.addEventListener("visibilitychange", schedule, options);
    hover.addEventListener("change", schedule, options);
    reduced.addEventListener("change", schedule, options);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      schedule();
    });
    io.observe(box);
    schedule();

    return () => {
      window.clearTimeout(timer);
      listeners.abort();
      io.disconnect();
    };
  }, [active, images.length]);

  const box = cn(
    "relative aspect-[3/2] w-full shrink-0 overflow-hidden bg-cream",
    className,
  );

  if (images.length === 0) {
    return (
      <div className={box}>
        {/* A STATIC placeholder, deliberately not a loading skeleton. A
            skeleton promises that something is arriving; for a product whose
            maker never attached a screenshot nothing ever will. */}
        <div
          aria-hidden="true"
          className="grid h-full w-full place-items-center bg-gold-soft"
        >
          <ImageOff className="h-7 w-7 text-gold-ink/50" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  const mounted = active ? images : images.slice(0, 1);

  return (
    <div ref={boxRef} className={cn("group/gallery", box)}>
      {mounted.map((src, i) => (
        // `unoptimized` is NOT a shortcut — it is the only way next/image
        // renders these today. next.config.ts declares no `images` block, so
        // the default `remotePatterns: []` applies and image-loader.js throws
        // "hostname … is not configured" for EVERY remote src. Delete this one
        // prop the day the storage host joins remotePatterns, and `sizes`
        // starts doing something.
        //
        // Keyed by position: two uploads of the same file are two images.
        <Image
          key={i}
          src={src}
          alt={altPrefix ? `${altPrefix} ${i + 1}` : ""}
          aria-hidden={altPrefix && i !== shown ? true : undefined}
          fill
          unoptimized
          loading="eager"
          draggable={false}
          sizes={sizes}
          onLoad={() => {
            loaded.current.add(i);
            if (wantedRef.current === i) setShown(i);
          }}
          onError={() => {
            broken.current.add(i);
          }}
          className={cn(
            fit === "cover" ? "object-cover" : "object-contain",
            i === shown ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* Which image is showing. Decorative: the count says nothing a reader
          of the alt text does not already have. No z-index, so on the deck it
          sits below the card's link and a press here still opens the
          product. */}
      {several && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-navy/40 px-2 py-1.5"
        >
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i === wanted ? "bg-white" : "bg-white/50",
              )}
            />
          ))}
        </span>
      )}

      {/* The arrows, only on an active gallery, and only for a hovering
          pointer or under reduced motion (ARROW). z-20, over the deck card's
          link (z-10), and a click only ever changes the image. */}
      {active && several && (
        <>
          <button
            type="button"
            data-deck-nodrag=""
            aria-label={labels.previousImage}
            onClick={() => show(neighbour(-1))}
            onKeyDown={onArrowKeyDown}
            className={cn(ARROW, "left-2")}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            data-deck-nodrag=""
            aria-label={labels.nextImage}
            onClick={() => show(neighbour(1))}
            onKeyDown={onArrowKeyDown}
            className={cn(ARROW, "right-2")}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  );
}
