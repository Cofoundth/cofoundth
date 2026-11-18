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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog } from "@/components/ui";

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
  const count = images.length;
  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? i : (i + dir + count) % count)),
    [count],
  );
  const close = useCallback(() => setOpen(null), []);

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
          index={open}
          altPrefix={altPrefix}
          labels={labels}
          onStep={step}
          onClose={close}
        />
      )}
    </div>
  );
}

function Viewer({
  images,
  index,
  altPrefix,
  labels,
  onStep,
  onClose,
}: {
  images: readonly string[];
  index: number;
  altPrefix: string;
  labels: ProductImageGridLabels;
  onStep: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const several = images.length > 1;
  const name = `${altPrefix} ${index + 1}`;
  /** The press a swipe is measured from. */
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  /** The click a finished swipe leaves behind is not a click beside the
   *  picture, and must not close the viewer. */
  const swiped = useRef(false);

  // ← and → step. The viewer is the dialog on top (components/ui/Dialog.tsx
  // keeps Escape and Tab for the top one), and nothing opens over it. A
  // modified key is not ours: Alt+← is the browser's Back.
  useEffect(() => {
    if (!several) return;
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      onStep(e.key === "ArrowLeft" ? -1 : 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [several, onStep]);

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
      panelClassName="max-w-[1120px] rounded-none bg-transparent shadow-none"
    >
      <div
        onClick={onBackdropClick}
        className="flex h-[calc(100dvh-2rem)] flex-col gap-3"
      >
        <div onClick={onBackdropClick} className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className={CONTROL}
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* pan-y: a vertical drag still scrolls, a sideways one is a swipe
            (it reaches pointerup instead of being taken as a pan), and a
            pinch still zooms. */}
        <div
          onClick={onBackdropClick}
          onPointerDown={(e) => {
            press.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            swiped.current = false;
          }}
          onPointerUp={(e) => {
            const p = press.current;
            press.current = null;
            if (!several || !p || p.id !== e.pointerId) return;
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return;
            swiped.current = true;
            onStep(dx < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            press.current = null;
          }}
          className="relative min-h-0 flex-1 touch-pan-y touch-pinch-zoom"
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
            src={images[index]}
            alt={name}
            draggable={false}
            className="absolute inset-0 m-auto max-h-full max-w-full rounded-2xl bg-white object-contain shadow-lg"
          />
        </div>

        {several && (
          <div
            onClick={onBackdropClick}
            className="flex items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label={labels.previousImage}
              className={CONTROL}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
            {/* Digits only, so nothing to translate. White pill: white text
                on the doubled scrim over the cream modal is under 3:1. */}
            <span className="rounded-full bg-white px-3 py-1.5 text-sm text-navy tabular-nums shadow-lg">
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => onStep(1)}
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
