"use client";

// /products — the category filter: chips above the deck, one tap each.
//
// ── WHY CHIPS THAT WRAP ───────────────────────────────────────────────────
// History, so nobody walks it again: a wrapping chip row with counts, then a
// native <select>, then a custom dropdown ("ทั้งหมด (15)"), then a single line
// of chips that scrolled sideways. The owner found the dropdown impractical (it
// hid every choice behind the one already made, two taps to switch) and the
// sideways row "not responsive and not work in mobile": chips past the edge
// were invisible, the scrollbar was hidden, and a mouse has no sideways scroll,
// so on a desktop or in a browser's phone preview the last categories simply
// could not be reached.
//
// So the chips WRAP, centred, onto as many lines as they need. Every choice is
// visible, nothing scrolls, and it behaves the same under a mouse, a finger and
// a keyboard. The cost is height on a phone (two lines for the dev shelf's
// seven chips); measured at 375x812 the deck's Skip/Try buttons still sit
// inside the first viewport.
//
// ── NO COUNTS ─────────────────────────────────────────────────────────────
// A chip says what a category is, not how many products it holds. "This
// category is not empty" is said by the chip being there at all: a category
// with nothing in it is not offered (`available` in ./filter-context.tsx),
// except the one a shared ?category= link selected, so "ทั้งหมด" can clear it.
//
// ── WHERE IT SITS ─────────────────────────────────────────────────────────
// ./ProductShelf.tsx renders this at the SECTION's width, above the deck's
// 360px column: on a desktop the row has room for every chip on one line,
// centred over the deck, and on a phone it wraps inside the page gutter.
//
// ── KEYBOARD ──────────────────────────────────────────────────────────────
// A group named "Filter by category"; each chip is a ToggleChip (a <button>
// with aria-pressed), reached by Tab. The deck's ArrowLeft/ArrowRight live on
// the deck's own root, so arrow keys on a chip never move the deck.

import { useT } from "@/lib/i18n-client";
import { ToggleChip, cn } from "@/components/ui";
import { PRODUCT_CATEGORIES } from "@/lib/post-types";
import { CATEGORY_LABEL } from "./categories";
import { useProductFilter } from "./filter-context";

export function ProductFilters({ className }: { className?: string }) {
  const tr = useT();
  const { selected, available, select } = useProductFilter();

  const selectedIsEmpty = selected !== null && !available.includes(selected);
  const shown = PRODUCT_CATEGORIES.filter(
    (c) => c === selected || available.includes(c),
  );

  // Nothing to choose between.
  if (available.length < 2 && !selectedIsEmpty) return null;

  return (
    <div
      role="group"
      aria-label={tr("Filter by category")}
      className={cn("flex flex-wrap justify-center gap-2", className)}
    >
      <ToggleChip selected={selected === null} onClick={() => select(null)}>
        {tr("All")}
      </ToggleChip>
      {shown.map((c) => (
        <ToggleChip
          key={c}
          selected={selected === c}
          // Tapping the selected chip again clears the filter.
          onClick={() => select(selected === c ? null : c)}
        >
          {tr(CATEGORY_LABEL[c])}
        </ToggleChip>
      ))}
    </div>
  );
}
