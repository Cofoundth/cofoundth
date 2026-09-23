"use client";

// Cofoundee — the one modal shell. CLIENT-ONLY (focus trap, scroll lock,
// keyboard handling all need the DOM).
//
// ── WHY ────────────────────────────────────────────────────────────────────
// The app shipped four hand-written `fixed inset-0` scrims hosting six
// dialogs. Only ONE of them (the partnership request) had Escape-to-close, a
// focus trap, focus restoration and a scroll lock; the other three had none of
// it. This is that implementation, lifted whole, with the accessibility bugs
// it still carried fixed on the way in:
//
//   • `role="dialog" / aria-modal / aria-labelledby` now sit on the PANEL.
//     They used to sit on the SCRIM, which is the full viewport — so the
//     dialog's accessible boundary included the page behind it.
//   • the scrim is always `p-4 overflow-y-auto`, not `px-4` only. A short
//     phone in landscape could not scroll a tall dialog into reach.
//   • the scroll lock goes on <html>, not <body>. MobileMenu found this the
//     hard way (see its comment): hiding overflow on <body> alone leaves wheel
//     and touch scrolling working, because <html> is the scrolling element.
//
// ── THE CHILDREN ARE NEVER REMOUNTED ───────────────────────────────────────
// This is a hard requirement, not a nicety. The meetup wizard's cover
// <input type="file"> holds a File the user picked, and a File cannot be
// restored from React state — if the input unmounts, the upload is silently
// lost. So: the rendered tree is structurally FIXED (scrim > panel >
// children), no key changes with props, no conditional wrapper around
// children, and the close button renders as a SIBLING of children rather than
// wrapping them.
//
// ── SURFACE — decision D1 ──────────────────────────────────────────────────
// Every modal is an OVERLAY: `rounded-xl border border-line shadow-lg`.
// Overlays are the one surface in the system that carries border AND shadow,
// because they float above the page rather than sitting in it. Three of the
// six dialogs used to render the app-CARD treatment (24px, borderless,
// shadow-xs); D1 converged them. `surface="card"` is kept so a migration can
// land zero-diff first and flip in a second step.

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

export type DialogSize = "sm" | "md" | "lg" | "narrow" | "2xl";
export type DialogPadding = "none" | "lg" | "responsive";
export type DialogSurface = "card" | "overlay";

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  /** The system's narrow-column width — the wizard. */
  narrow: "max-w-[640px]",
  "2xl": "max-w-2xl",
};

const PADDING_CLASSES: Record<DialogPadding, string> = {
  none: "",
  lg: "p-8",
  responsive: "p-6 lg:p-8",
};

const SURFACE_CLASSES: Record<DialogSurface, string> = {
  overlay: "bg-white rounded-xl border border-line shadow-lg",
  card: "bg-white rounded-3xl shadow-xs",
};

// Tab-order members inside the panel. Deliberately excludes tabindex="-1" —
// the panel itself is programmatically focusable but must never sit in the
// Tab cycle.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// The tab cycle, VISIBLE members only. The filter is not an optimisation: the
// selector's `input:not([disabled])` matches `<input type="hidden">`, and
// `.focus()` on one is a no-op. The meetup wizard opens its panel with ten
// hidden inputs ("every wizard value rides a hidden input, first in tree
// order"), so an unfiltered `querySelector(...)[0]` picked a hidden input,
// focus stayed on the trigger BEHIND the scrim, and a screen reader announced
// nothing. Both the focus-pull and the Tab trap read this one list.
function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.getClientRects().length > 0);
}

type DialogBaseProps = {
  onClose: () => void;
  size?: DialogSize;
  padding?: DialogPadding;
  surface?: DialogSurface;
  /** false = backdrop click and Escape do NOT close (the wizard). */
  dismissible?: boolean;
  /** Escape handler for a non-dismissible dialog (e.g. route it to a discard
   *  confirm). Ignored when `dismissible` — Escape calls onClose then. */
  onEscape?: () => void;
  /** Panel-level extras: `my-8`, `max-h-[90vh] overflow-y-auto`, `text-center`. */
  panelClassName?: string;
  children: ReactNode;
};

// ── THE TWO REQUIREMENTS BELOW ARE TYPES, NOT DOC COMMENTS ─────────────────
// Both used to be flat optionals next to a comment saying they were required,
// which compiles clean and renders `aria-label={undefined}` — an unnamed
// dialog, or an icon-only close button a screen reader announces as bare
// "button". Nothing in this file is checkable at runtime and design-lint reads
// class strings, so the compiler is the only place this can be caught.

/** A dialog MUST have an accessible name: either the id(s) of a visible
 *  element that gives it one, or a literal label when nothing on screen does. */
type DialogNameProps =
  | { labelledBy: string; ariaLabel?: never }
  | { labelledBy?: never; ariaLabel: string };

/** An overlay close button is icon-only, so it MUST carry its own label
 *  (already translated). `closeButton="none"` takes no label. */
type DialogCloseProps =
  | { closeButton?: "none"; closeLabel?: never }
  | { closeButton: "overlay"; closeLabel: string };

export type DialogProps = DialogBaseProps & DialogNameProps & DialogCloseProps;

export function Dialog({
  onClose,
  labelledBy,
  ariaLabel,
  size = "md",
  padding = "responsive",
  surface = "overlay",
  dismissible = true,
  onEscape,
  closeButton = "none",
  closeLabel,
  panelClassName,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock the page behind the overlay, and hand focus back to whatever opened
  // the dialog on the way out. Mount-once on purpose: a dialog that swaps its
  // *children* (the partnership success panel) must not unlock mid-flow.
  // paddingRight compensates for the scrollbar the lock removes, otherwise the
  // page underneath visibly jumps sideways as the dialog opens.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const { overflow, paddingRight } = root.style;
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = overflow;
      root.style.paddingRight = paddingRight;
      opener?.focus?.();
    };
  }, []);

  // Pull focus in on open — and again when the dialog swaps content (the
  // labelling changes with it) and the focused control was unmounted along
  // with the old content.
  const nameKey = labelledBy ?? ariaLabel;
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || panel.contains(document.activeElement)) return;
    const first = focusables(panel)[0];
    (first ?? panel).focus();
  }, [nameKey]);

  // Escape closes (or routes). Tab / Shift+Tab cycle within the panel instead
  // of walking into the page behind the overlay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (dismissible) onClose();
        else onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusables(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onEscape, dismissible]);

  return (
    <div
      // The shared scrim: bg-navy/40 + backdrop-blur-sm, and NO radius. A
      // full-viewport scrim has no corners to round — the rounded thing is the
      // panel.
      //
      // GRID, not `flex items-center justify-center`. This is the difference
      // between a tall dialog being reachable and being permanently clipped,
      // measured at a 698px viewport with a 900px panel: under flex centring
      // the panel's top sat at -101px and `scrollTop` would not go below 0, so
      // that strip was outside the scrollable overflow — `align-items: center`
      // overflows in BOTH directions and only the lower half is scrollable.
      // A grid's auto-sized implicit row starts at the container's start edge
      // instead, so `scrollHeight` tracks the content and `p-4` holds on both
      // ends. Only PartnershipRequestDialog was safe under flex, and only
      // because its panel carries `max-h-[90vh]`.
      className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
      onClick={(e) => {
        // e.target === e.currentTarget: only a click on the scrim ITSELF
        // dismisses. A click that started inside the panel must not.
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      {/* tabIndex -1 makes the panel a focus fallback for content with no
          controls (a "Request sent" confirmation). globals.css only rings
          a/button/input/textarea/select/summary on :focus-visible, so this
          adds no outline. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        className={cn(
          "relative w-full",
          SIZE_CLASSES[size],
          SURFACE_CLASSES[surface],
          PADDING_CLASSES[padding],
          panelClassName,
        )}
      >
        {closeButton === "overlay" && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink hover:text-navy"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
