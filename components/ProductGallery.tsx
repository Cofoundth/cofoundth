"use client";

// A product's screenshots, one at a time (or four at a time, `perView`): the
// deck's cards (app/(marketing)/products/ProductDeck.tsx). The product's own
// page shows every picture at once instead (components/ProductImageGrid.tsx).
// The box fills its positioned parent, whatever shape the deck gives it.
//
// Every image is mounted, stacked, one opaque. A change of image paints the new
// one only once it has LOADED and keeps the old one until then, so the box
// never flashes empty. Dots say which image is showing.
//
// On a narrow screen or with a non-hovering pointer, tap the pictures to
// advance. On larger screens with a fine, hovering pointer, the arrows
// appear on hover or keyboard focus. On either control, Left and Right move
// through screenshots without triggering the deck's own keyboard actions.
//
// TWO THINGS HERE ARE FOR THE DECK AND INERT ELSEWHERE, written down so nobody
// strips them as dead:
//   * `data-deck-nodrag` on the arrows: the deck reads it so a press on an
//     arrow never starts a swipe. Nothing else reads it.
//   * the `group-has-[[data-gallery-zone]:hover]/card` reveal in ARROW: on the
//     deck the card's link covers the images, so the image box under it is
//     never :hover itself, and the link carries `data-gallery-zone` to say
//     "the pointer is over the card". With no `group/card` ancestor the plain
//     `group-hover/gallery` reveal does the work.
//
// `inactive` is for cards behind the top one. The next card keeps its
// screenshots mounted so it can become active without mounting new images.
// Inactive cards have no controls. A gallery only ever goes from inactive to active (the
// deck's cards are keyed by product and the top one leaves the slice when it
// flies out), so an active gallery always starts at its first image.
//
// `perView` (the founder's call, 2026-11-18): 4 on a COMPUTER's deck card,
// which moves through the screenshots four at a time, each four as a grid —
// 2 x 2 when full; a last group of 3 is one wide across the top and two
// below, of 2 one above the other, of 1 the one filling the box. Everything
// above then applies to groups: controls advance a group at a time, a group
// shows once all of its pictures have loaded or failed, and a group whose
// every picture failed is skipped. With the default 1 a group is one image.

import Image from "next/image";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/components/ui";

/** The < and > replace the tap zones on larger, hoverable screens. */
const ARROW =
  "absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-navy shadow-lg opacity-0 transition-opacity duration-150 hover:bg-cream motion-reduce:transition-none focus-visible:opacity-100 group-hover/gallery:opacity-100 group-has-[[data-gallery-zone]:hover]/card:opacity-100 group-has-[:focus-visible]/gallery:opacity-100 md:[@media(hover:hover)_and_(pointer:fine)]:grid";
const TAP_ZONE =
  "absolute inset-y-0 z-20 w-1/2 cursor-pointer rounded-none focus-visible:inset-ring-2 focus-visible:inset-ring-white md:[@media(hover:hover)_and_(pointer:fine)]:hidden";

export type ProductGalleryLabels = {
  /** Labels for the screenshot controls, which have no visible text. */
  previousImage: string;
  nextImage: string;
};

export function ProductGallery({
  images,
  labels,
  inactive = false,
  preload = false,
  fit = "cover",
  backdrop = false,
  sizes,
  className,
  perView = 1,
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
  /** `contain` letterboxes, so nothing is cropped: the deck card, over its
   *  `backdrop`. `cover` crops into the box: the default, which no caller uses
   *  today. */
  fit?: "cover" | "contain";
  /** Behind a `contain` picture, a blurred, cropped copy of it, so a
   *  screenshot of any shape fills the box without being cut (the deck). */
  backdrop?: boolean;
  /** The images are decorative (alt=""): the deck card's link already names
   *  the product. */
  sizes: string;
  /** The box's corners, which depend on what it sits in. */
  className?: string;
  /** Pictures per view: 1, or 4 as a grid (a computer's deck card; see the
   *  header). */
  perView?: 1 | 4;
}) {
  const active = !inactive;
  /** What the gallery moves through: single images, or groups of `perView`. */
  const groups = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < images.length; i += perView) {
      out.push(images.slice(i, i + perView));
    }
    return out;
  }, [images, perView]);
  const several = groups.length > 1;
  /** The image asked for. The dots show this. */
  const [wanted, setWanted] = useState(0);
  /** The image painted: `wanted` once it has loaded, the one before until
   *  then, so a change never shows an empty box. */
  const [shown, setShown] = useState(0);
  const [wideCover, setWideCover] = useState(false);
  /** What the handlers read. `wanted` is only this, rendered. */
  const wantedRef = useRef(0);
  /** Groups ready to show: every picture in them has loaded or failed, and at
   *  least one loaded. */
  const loaded = useRef(new Set<number>());
  /** Groups with nothing to show: every picture in them failed. */
  const broken = useRef(new Set<number>());
  /** Per group, each picture's last report by position: loaded (true) or
   *  failed (false). One entry per picture, so one that fails and then loads
   *  counts once, as loaded. */
  const settled = useRef(new Map<number, Map<number, boolean>>());

  /** Picture `i` of group `g` has loaded (`ok`) or failed. Once the whole
   *  group has, it is ready (or broken), and shown if it is the one wanted. */
  function settle(g: number, i: number, ok: boolean) {
    const s = settled.current.get(g) ?? new Map<number, boolean>();
    s.set(i, ok);
    settled.current.set(g, s);
    if (s.size < (groups[g]?.length ?? 1)) return;
    if (![...s.values()].some(Boolean)) {
      broken.current.add(g);
      return;
    }
    broken.current.delete(g);
    loaded.current.add(g);
    if (wantedRef.current === g) setShown(g);
  }

  function show(next: number) {
    wantedRef.current = next;
    setWanted(next);
    if (loaded.current.has(next)) setShown(next);
  }

  /** The image `dir` away from the wanted one, wrapping, past any that failed
   *  to load. */
  function neighbour(dir: 1 | -1): number {
    const n = groups.length;
    for (let step = 1; step < n; step++) {
      const i = (((wantedRef.current + dir * step) % n) + n) % n;
      if (!broken.current.has(i)) return i;
    }
    return wantedRef.current;
  }

  // ← and → on a gallery control move the image, and stop there. On the deck, left to
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

  const box = cn("absolute inset-0 touch-pan-y overflow-hidden bg-cream", className);

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

  const mounted = active || preload ? groups : groups.slice(0, 1);
  /** An inactive gallery always paints the first group. */
  const visible = active ? shown : 0;

  return (
    <div className={cn("group/gallery", box)} data-wide-cover={wideCover ? "" : undefined}>
      {/* The picture on screen again, cropped to the box and blurred, under
          the letterboxed one. Same URL, so it costs no request. */}
      {backdrop && (
        <Image
          src={groups[visible]?.[0] ?? images[0]}
          alt=""
          aria-hidden
          fill
          unoptimized
          loading="eager"
          draggable={false}
          sizes={sizes}
          className="scale-110 object-cover opacity-60 blur-2xl"
        />
      )}
      {mounted.map((group, g) =>
        perView === 1 ? (
          // `unoptimized` is NOT a shortcut — it is the only way next/image
          // renders these today. next.config.ts declares no `images` block, so
          // the default `remotePatterns: []` applies and image-loader.js throws
          // "hostname … is not configured" for EVERY remote src. Delete this one
          // prop the day the storage host joins remotePatterns, and `sizes`
          // starts doing something.
          //
          // Keyed by position: two uploads of the same file are two images.
          <Image
            key={g}
            src={group[0]}
            alt=""
            fill
            unoptimized
            loading="eager"
            draggable={false}
            sizes={sizes}
            onLoad={({ currentTarget }) => {
              if (g === 0) {
                setWideCover(currentTarget.naturalWidth * 3 >= currentTarget.naturalHeight * 4);
              }
              settle(g, 0, true);
            }}
            onError={() => settle(g, 0, false)}
            className={cn(
              fit === "cover" ? "object-cover" : "object-contain",
              g === visible ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          // A group of up to four, as a grid (see the header). A broken
          // picture inside a group that still has others just leaves its
          // cell's cream showing.
          <div
            key={g}
            className={cn(
              "absolute inset-0 grid gap-1 bg-white",
              group.length >= 3
                ? "grid-cols-2 grid-rows-2"
                : group.length === 2
                  ? "grid-cols-1 grid-rows-2"
                  : "grid-cols-1 grid-rows-1",
              g === visible ? "opacity-100" : "opacity-0",
            )}
          >
            {group.map((src, i) => (
              <div
                key={i}
                className={cn(
                  "relative min-h-0 min-w-0 overflow-hidden bg-cream",
                  group.length === 3 && i === 0 && "col-span-2",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  unoptimized
                  loading="eager"
                  draggable={false}
                  sizes={sizes}
                  onLoad={() => settle(g, i, true)}
                  onError={() => settle(g, i, false)}
                  className={fit === "cover" ? "object-cover" : "object-contain"}
                />
              </div>
            ))}
          </div>
        ),
      )}

      {/* The dots show which screenshot is selected. */}
      {several && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-navy/40 px-2 py-1.5 max-md:short-landscape:bottom-14"
        >
          {groups.map((_, i) => (
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

      {active && several && (
        <>
          {/* A tap changes the screenshot. A drag still belongs to the deck. */}
          <button
            type="button"
            aria-label={labels.previousImage}
            onClick={() => show(neighbour(-1))}
            onKeyDown={onArrowKeyDown}
            className={cn(TAP_ZONE, "left-0")}
          />
          <button
            type="button"
            aria-label={labels.nextImage}
            onClick={() => show(neighbour(1))}
            onKeyDown={onArrowKeyDown}
            className={cn(TAP_ZONE, "right-0")}
          />
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
