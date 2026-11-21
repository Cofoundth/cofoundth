"use client";

// A product's screenshots ALL AT ONCE: the Screenshots card of the product's
// own page (app/(marketing)/products/ProductDetail.tsx: /products/<id> and the
// deck's product modal). The founder's call, 2026-11-18: on the page nothing
// cycles; every picture is on screen together, at every width.
//
// ── THE GRID ───────────────────────────────────────────────────────────────
// Three 16:9 cells a row from `sm`, two on a phone, each picture whole on a
// cream mat and never cropped (the deck card's own rule). The last row of a
// count that does not divide is left short rather than stretching one picture
// to a different size.
//
// ── A CLICK OPENS ONE LARGE ────────────────────────────────────────────────
// A cell is ~330px wide at most, and ~135px on a phone: too small to read a
// screenshot's text, so every cell is a button that opens THE VIEWER: the
// picture as large as the screen allows, ‹ and › (and ← →, and a swipe) to
// step through, wrapping, Escape / ✕ / a click beside the picture to close.
// It steps only when asked: there is no clock here.
//
// In the deck's modal the viewer is a dialog over a dialog, so the shared
// Dialog renders it at <body> (components/ui/Dialog.tsx, "A DIALOG OPENED
// FROM INSIDE ANOTHER"); on the page it renders in place. React events still
// bubble through the React tree either way; nothing above this handles a
// click or a key the viewer could set off (the deck is locked while its modal
// is open).
//
// `unoptimized` for the reason ProductGallery gives: next.config.ts declares no
// image hosts, so next/image cannot optimise these.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, cn } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export type ProductImageGridLabels = {
  /** The viewer's ‹ and ›, and its ✕: icon-only. Already translated. */
  previousImage: string;
  nextImage: string;
  close: string;
};

/** A swipe: this far sideways, and more sideways than down. */
const SWIPE_PX = 40;

/** The viewer's round white controls, as the product modal's own ✕. */
const CONTROL =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white text-navy shadow-lg hover:bg-cream";

export function ProductImageGrid({
  images,
  altPrefix,
  labels,
  sizes,
}: {
  /** Already through productImages() in app/(marketing)/products/
   *  product-view.ts: parsed, and capped. */
  images: readonly string[];
  /** Picture i is "{altPrefix} {i + 1}", in the grid and in the viewer. */
  altPrefix: string;
  labels: ProductImageGridLabels;
  sizes: string;
}) {
  /** The picture open in the viewer, or none. */
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((src, i) => (
          // Keyed by position: two uploads of the same file are two pictures.
          <li key={i}>
            {/* rounded-xl stated: globals.css makes every <button> a pill. */}
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setOpen(i)}
              className="group/cell relative block aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl bg-cream"
            >
              <Image
                src={src}
                alt={`${altPrefix} ${i + 1}`}
                fill
                unoptimized
                loading="eager"
                draggable={false}
                sizes={sizes}
                className="object-contain transition-transform duration-200 group-hover/cell:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/cell:scale-100"
              />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <Viewer
          images={images}
          initialIndex={open}
          altPrefix={altPrefix}
          labels={labels}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Viewer({
  images,
  initialIndex,
  altPrefix,
  labels,
  onClose,
}: {
  images: readonly string[];
  initialIndex: number;
  altPrefix: string;
  labels: ProductImageGridLabels;
  onClose: () => void;
}) {
  const tr = useT();
  const [index, setIndex] = useState(initialIndex);
  const [zoomWidth, setZoomWidth] = useState<number | null>(null);
  const picture = useRef<HTMLImageElement>(null);
  const count = images.length;
  const several = count > 1;
  const zoomed = zoomWidth !== null;
  const name = `${altPrefix} ${index + 1}`;
  /** The press a swipe is measured from. */
  const press = useRef<{ x: number; y: number } | null>(null);
  /** The click a mouse swipe leaves behind is not a click beside the picture,
   *  and must not close the viewer. Any new press clears it (the column's
   *  pointerdown, below): a touch swipe leaves no click to clear it. */
  const swiped = useRef(false);

  const step = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i + dir + count) % count);
    setZoomWidth(null);
  }, [count]);

  function toggleZoom() {
    const image = picture.current;
    if (zoomed) setZoomWidth(null);
    else if (image?.naturalWidth) setZoomWidth(image.clientWidth * 2);
  }

  /** A drag steps through screenshots at fit size and pans when zoomed. */
  function endSwipe(dx: number, dy: number) {
    if (!several || zoomed) return;
    if ((window.visualViewport?.scale ?? 1) > 1.01) return;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return;
    swiped.current = true;
    step(dx < 0 ? 1 : -1);
  }

  // ← and → step. The viewer is the dialog on top (components/ui/Dialog.tsx
  // keeps Escape and Tab for the top one), and nothing opens over it. A
  // modified key is not ours: Alt+← is the browser's Back.
  useEffect(() => {
    if (!several || zoomed) return;
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      step(e.key === "ArrowLeft" ? -1 : 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [several, step, zoomed]);

  // A click on the space around the picture closes, as the scrim does: the
  // panel is transparent and fills most of the screen, so without this only
  // its thin padded edge would.
  function onBackdropClick(e: MouseEvent<HTMLElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <Dialog
      onClose={onClose}
      ariaLabel={name}
      padding="none"
      surface="card"
      // Transparent and as wide as the product modal: the picture is the
      // surface.
      panelClassName="min-w-0 max-w-[min(1120px,calc(100dvw-2rem))] rounded-none bg-transparent shadow-none"
    >
      <div
        onClick={onBackdropClick}
        onPointerDownCapture={() => {
          swiped.current = false;
        }}
        className="flex h-[calc(100dvh-2rem)] flex-col gap-3"
      >
        <div onClick={onBackdropClick} className="flex justify-end gap-2">
          <button
            type="button"
            onClick={toggleZoom}
            aria-label={tr(zoomed ? "Zoom out" : "Zoom in")}
            className={CONTROL}
          >
            {zoomed
              ? <ZoomOut className="size-5" strokeWidth={1.5} aria-hidden="true" />
              : <ZoomIn className="size-5" strokeWidth={1.5} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className={CONTROL}
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* A finger's swipe is read from TOUCH events, which keep coming
            while the browser pans: no touch-action here, so a pinch-zoomed
            picture pans in every direction as it would anywhere (pointer
            events stop at the browser's pan). A mouse or a pen drags through
            pointer events. One finger only: a second one is a pinch. */}
        <div
          onClick={zoomed ? undefined : onBackdropClick}
          tabIndex={zoomed ? 0 : undefined}
          role={zoomed ? "region" : undefined}
          aria-label={zoomed ? name : undefined}
          onTouchStart={(e) => {
            const t = e.touches[0];
            press.current =
              e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const p = press.current;
            const t = e.changedTouches[0];
            if (e.touches.length > 0) return;
            press.current = null;
            if (p && t) endSwipe(t.clientX - p.x, t.clientY - p.y);
          }}
          onTouchCancel={() => {
            press.current = null;
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") return;
            press.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "touch") return;
            const p = press.current;
            press.current = null;
            if (p) endSwipe(e.clientX - p.x, e.clientY - p.y);
          }}
          className={cn("relative min-h-0 flex-1", zoomed && "overflow-auto overscroll-contain")}
        >
          {/* A plain <img>, centred by auto margins at its own shape and
              capped by the box: the element is exactly the picture, so a
              click beside it lands on the box and closes. next/image `fill`
              would cover the whole box and leave nowhere to click. Keyed so a
              step never shows the last picture stretched to the next one's
              shape. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img
            key={index}
            ref={picture}
            src={images[index]}
            alt={name}
            draggable={false}
            style={zoomed ? { width: zoomWidth } : undefined}
            className={cn(
              "rounded-2xl bg-white object-contain shadow-lg",
              zoomed ? "mx-auto block max-w-none" : "absolute inset-0 m-auto max-h-full max-w-full",
            )}
          />
        </div>

        {several && (
          <div
            onClick={onBackdropClick}
            className="flex items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={labels.previousImage}
              className={CONTROL}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
            {/* Digits only, so nothing to translate. White pill: white text
                on the doubled scrim over the cream modal is under 3:1. A
                status, so a step is spoken: which picture, and where in the
                set (focus stays on the control that was pressed). */}
            <span
              role="status"
              className="rounded-full bg-white px-3 py-1.5 text-sm text-navy tabular-nums shadow-lg"
            >
              <span className="sr-only">{name}, </span>
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={labels.nextImage}
              className={CONTROL}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
