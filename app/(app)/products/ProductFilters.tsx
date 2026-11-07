"use client";

// /products — the category filter row.
//
// ── THE CATEGORY LIVES IN THE URL, NOT IN STATE ───────────────────────────
// `selected` is a PROP, read by the server page out of `searchParams`. This
// component holds no copy of it. That is the whole design:
//
//   · /products?category=game is a link someone can paste into the forum, which
//     is how a shelf actually gets traffic;
//   · the back button steps back through the filters the user tried;
//   · the filtered grid is rendered on the server, so the first paint is the
//     filtered set — no flash of everything.
//
// A `useState` here would have been three lines shorter and would have broken
// all three.
//
// The chips are <button>s (ToggleChip), so navigation goes through the router.
// `scroll: false` keeps the viewport where it is: the chips sit above the grid,
// and jumping to the top after every chip is a regression you only notice on a
// phone.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-client";
import { ToggleChip } from "@/components/ui";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductCounts,
} from "@/lib/post-types";
import { CATEGORY_LABEL } from "./categories";

export function ProductFilters({
  selected,
  counts,
}: {
  /** null = no filter, i.e. the "All" chip. */
  selected: ProductCategory | null;
  /** Per-category tallies from getProductsPage — already block-filtered. */
  counts: ProductCounts;
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: ProductCategory | null) {
    if (next === selected) return;
    startTransition(() => {
      router.push(next ? `/products?category=${next}` : "/products", {
        scroll: false,
      });
    });
  }

  // An EMPTY category is not offered. At launch five of the six are empty, and
  // a row of chips reading 0 looks like a broken page rather than a young one —
  // every one of them is a click that lands on an empty state.
  //
  // The exception is load-bearing: the SELECTED chip stays even at 0, because
  // it is the only thing on screen saying which filter is on. Arriving at
  // /products?category=game from a shared link, after the last game was
  // deleted, must not render a row where nothing is selected.
  const visible = PRODUCT_CATEGORIES.filter(
    (c) => counts[c] > 0 || c === selected,
  );

  // Same reasoning one level up: with nothing on the shelf at all, the row
  // collapses to a lone "All 0" chip — a control whose only destination is the
  // page you are on. The empty state says it better.
  if (counts.all === 0 && selected === null) return null;

  return (
    <div
      role="group"
      aria-label={tr("Filter by category")}
      aria-busy={pending}
      className={`mb-8 flex flex-wrap gap-2 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <ToggleChip
        selected={selected === null}
        onClick={() => go(null)}
        aria-label={`${tr("All")}, ${counts.all}`}
      >
        {tr("All")}
        <Tally n={counts.all} selected={selected === null} />
      </ToggleChip>
      {visible.map((c) => (
        <ToggleChip
          key={c}
          selected={selected === c}
          onClick={() => go(c)}
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
          <Tally n={counts[c]} selected={selected === c} />
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
