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
// a keyboard.
//
// Keep All, Games and Apps in the same positions as the catalog changes.
// An empty category opens the deck's empty state with a way back to All.
//
// ── WHERE IT SITS ─────────────────────────────────────────────────────────
// ./ProductShelf.tsx renders this in the deck page's top line. From 640px it
// is the middle `auto` column of a `1fr auto 1fr` grid, between the corners
// (logged out: the mark, and the language with "Sign in"; signed in: the
// supply CTA), and wraps there when that column is narrower than the chips'
// one line. Below 640px the chips share a toolbar with the Card/Grid switch.
//
// ── KEYBOARD ──────────────────────────────────────────────────────────────
// A group named "Filter by category"; each chip is a ToggleChip (a <button>
// with aria-pressed), reached by Tab. The deck's ArrowLeft/ArrowRight live on
// the deck's own root, so arrow keys on a chip never move the deck.

import { useT } from "@/lib/i18n-client";
import { ToggleChip, cn } from "@/components/ui";
import { FILTER_BUCKETS, FILTER_LABEL } from "./categories";
import { useProductFilter } from "./filter-context";

const MOBILE_TABS = "max-md:min-h-9 max-md:rounded-none max-md:border-0 max-md:border-b-2 max-md:border-transparent max-md:bg-transparent max-md:px-2 max-md:text-ink-muted max-md:aria-pressed:border-navy max-md:aria-pressed:font-medium max-md:aria-pressed:text-navy";

export function ProductFilters({ className, toolbar = false }: { className?: string; toolbar?: boolean }) {
  const tr = useT();
  const { selected, select } = useProductFilter();
  const chipClass = toolbar ? MOBILE_TABS : undefined;

  return (
    <div
      role="group"
      aria-label={tr("Filter by category")}
      className={cn("flex flex-wrap justify-center gap-2", className)}
    >
      <ToggleChip className={chipClass} selected={selected === null} onClick={() => select(null)}>
        {tr("All")}
      </ToggleChip>
      {FILTER_BUCKETS.map((c) => (
        <ToggleChip
          key={c}
          className={chipClass}
          selected={selected === c}
          // Tapping the selected chip again clears the filter.
          onClick={() => select(selected === c ? null : c)}
        >
          {tr(FILTER_LABEL[c])}
        </ToggleChip>
      ))}
    </div>
  );
}
