"use client";

// /products — the category filter row.
//
// ── MULTI-SELECT, OR SEMANTICS ────────────────────────────────────────────
// Chips toggle independently and a product shows if it is in ANY selected
// category. "games or apps" is a thing a reader wants and a single select
// could not express; that is the whole reason this changed.
//
// "All" is NOT a seventh category. It is the empty set — selected when nothing
// is, and clicking it clears. Modelling it as a category would mean deciding
// what "All + Game" means, and there is no good answer.
//
// ── THE SELECTION LIVES IN A CONTEXT, NOT IN THE URL ──────────────────────
// It used to be a PROP read from `searchParams` on the server, with every chip
// a `router.push`. That bought three things and this keeps two of them:
//
//   · /products?category=game,app is still a link someone can paste — the
//     provider mirrors the Set into the address with `replaceState`, and the
//     SERVER still reads it, so a shared link's first paint is already the
//     filtered grid. KEPT.
//   · the filtered grid is still server-rendered on a cold load. KEPT.
//   · the back button stepped through the filters tried. LOST, deliberately:
//     see the note on the effect in ./filter-context.tsx.
//
// What goes away is a server round trip per chip, which at this scale was
// latency for nothing — the client already holds every product on the shelf.
// There is no `useTransition`, no `aria-busy` and no pending dimming any more
// because there is nothing to wait for.

import { useT } from "@/lib/i18n-client";
import { ToggleChip } from "@/components/ui";
import { PRODUCT_CATEGORIES } from "@/lib/post-types";
import { CATEGORY_LABEL } from "./categories";
import { useProductFilter } from "./filter-context";

export function ProductFilters() {
  const tr = useT();
  const { selected, counts, toggle, clear } = useProductFilter();
  const none = selected.size === 0;

  // An EMPTY category is not offered. At launch five of the six are empty, and
  // a row of chips reading 0 looks like a broken page rather than a young one —
  // every one of them is a click that lands on an empty state.
  //
  // The exception is load-bearing: a SELECTED chip stays even at 0, because it
  // is the only thing on screen saying which filter is on. Arriving at
  // /products?category=game from a shared link, after the last game was
  // deleted, must not render a row where nothing is selected.
  //
  // `counts` is over the WHOLE shelf, never the filtered view — otherwise
  // turning on "Game" would delete every other chip and strand the reader.
  const visible = PRODUCT_CATEGORIES.filter(
    (c) => counts[c] > 0 || selected.has(c),
  );

  // Same reasoning one level up: with nothing on the shelf at all, the row
  // collapses to a lone "All 0" chip — a control whose only destination is the
  // page you are on. The empty state says it better.
  if (counts.all === 0 && none) return null;

  return (
    <div
      role="group"
      aria-label={tr("Filter by category")}
      className="mb-8 flex flex-wrap gap-2"
    >
      <ToggleChip
        selected={none}
        onClick={clear}
        aria-label={`${tr("All")}, ${counts.all}`}
      >
        {tr("All")}
        <Tally n={counts.all} selected={none} />
      </ToggleChip>
      {visible.map((c) => (
        <ToggleChip
          key={c}
          selected={selected.has(c)}
          onClick={() => toggle(c)}
          // EXPLICIT, rather than trusting name-from-contents. The label and
          // the tally are two flex children, and whether the accessibility
          // name algorithm puts a space between them depends on how the engine
          // blockifies a flex item — "แอป2" read as one token is a plausible
          // outcome and not one worth gambling on. Measured in the pane:
          // read_page reports only a button's direct text nodes, so the count
          // could not be CONFIRMED present either way. One attribute settles
          // it.
          aria-label={`${tr(CATEGORY_LABEL[c])}, ${counts[c]}`}
        >
          {tr(CATEGORY_LABEL[c])}
          <Tally n={counts[c]} selected={selected.has(c)} />
        </ToggleChip>
      ))}
    </div>
  );
}

// Digits only, so the Thai line-height guard never applies and `tabular-nums`
// keeps a row of chips from twitching as the numbers change width.
//
// Opacity rather than a colour: the chip's own two states already own the
// palette (navy fill when selected, ink on white when not), and a third token
// in here would be the brand-accent drift the design rules exist to stop.
// No aria-hidden needed: the chip carries an explicit `aria-label`, which
// REPLACES name-from-contents, so this span is already out of the name.
function Tally({ n, selected }: { n: number; selected: boolean }) {
  return (
    <span
      className={`tabular-nums ${selected ? "text-white/60" : "text-ink-muted"}`}
    >
      {n}
    </span>
  );
}
