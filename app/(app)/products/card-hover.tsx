"use client";

// Hover state for a product card, shared with anything inside it.
//
// ── WHY THIS EXISTS: THE STRETCHED LINK EATS THE HOVER ────────────────────
// ProductCard makes the WHOLE card a link to the product by laying an empty
// `<a className="absolute inset-0 z-10">` over it. That is the right way to do
// a card-wide target — it keeps the author link and the gallery dots working
// as real, separately-focusable controls instead of nesting <a> inside <a>.
//
// But it means the anchor is the topmost element over the cover image. The
// gallery's own `absolute inset-0` sits at the default z-index as a DESCENDANT
// OF A SIBLING, so it paints underneath, and `elementFromPoint()` at the
// centre of a cover returns the anchor, not the gallery. Its `onPointerEnter`
// therefore never fired and hovering a card did nothing. Measured, not
// reasoned about: the probe returned `<a class="absolute inset-0 z-10 …">`.
//
// Things that do NOT fix it, so nobody re-tries them:
//   · `pointer-events-none` on the gallery — that suppresses enter/leave too,
//     so it would still never hear about the hover.
//   · raising the gallery to `z-20` — it would hear the hover and then SWALLOW
//     the click, which is the one thing the card is for.
//   · `group-hover/card:` — CSS can see the hover, but a 1s advance needs a
//     JS interval, and a class cannot start one.
//
// The only arrangement where one element both hears the hover and lets the
// click through is an ANCESTOR of the anchor. Pointer events bubble, so a
// wrapper around the whole card hears a pointer over any descendant,
// including the anchor, while the anchor keeps receiving the click.
//
// It is a real box, not `display: contents` — a contents element generates no
// box and so receives no pointer events at all.

import {
  createContext,
  useContext,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

const CardHoverContext = createContext(false);

/** True while a hover-capable pointer is anywhere over this card. */
export function useCardHovered(): boolean {
  return useContext(CardHoverContext);
}

export function CardHoverScope({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      // Mirrors what the Card root used to carry, so the layout is unchanged
      // and `absolute inset-0` children still resolve to the card's box.
      className="relative flex h-full min-w-0 flex-1 flex-col"
      // TOUCH IS EXCLUDED. `pointerenter` fires for a finger too, and on a
      // phone there is no hover — a tap would start the cycle and the matching
      // `pointerleave` (which fires when the touch ENDS) would immediately
      // reset it. The dots are the touch control; see ProductGallery.
      onPointerEnter={(e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "touch") setHovered(false);
      }}
      // A pointer can leave the window without a `pointerleave` (drag out, OS
      // switch), which would park the card mid-cycle. Cheap insurance.
      onPointerCancel={() => setHovered(false)}
    >
      <CardHoverContext.Provider value={hovered}>
        {children}
      </CardHoverContext.Provider>
    </div>
  );
}
