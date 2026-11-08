"use client";

// /products — the grid, filtered in the browser.
//
// ── THE CARDS ARE SERVER MARKUP PASSED THROUGH THIS FILE ─────────────────
// `items[].card` is an already-rendered <ProductCard>, built in the server
// page and handed down as a prop. ProductCard stays a SERVER component (its
// own header explains why that matters) and this file never sees a `post`,
// only the element and the one fact it needs to filter on: which shelf the
// product sits on.
//
// That is also why filtering happens by NOT RENDERING a card rather than by
// hiding one with a class. A hidden card is still in the accessibility tree
// and still counts toward "{n} products" unless something remembers to
// subtract it; an absent one cannot disagree with the tally. The cost is that
// a card unmounts and remounts across a chip toggle, which resets its gallery
// to the cover — acceptable, and arguably right, since it is a different set
// of products on screen.
//
// ── BUCKETING ─────────────────────────────────────────────────────────────
// `bucket` came from `productBucketOf(tags)` in the page — the SAME function
// the chip tallies use, which is what makes a chip's number and its contents
// the same question asked twice. See ./filter-context.tsx for what "other"
// means and why it is not a tag match.

import { PackageOpen, SearchX } from "lucide-react";
import type { ProductCategory } from "@/lib/post-types";
import { Button, EmptyState } from "@/components/ui";
import { useProductFilter } from "./filter-context";

export type ProductGridLabels = {
  /** Shown when the whole shelf is empty — nobody has posted a product. */
  emptyTitle: string;
  emptyBody: string;
  /** Shown when the shelf has products but the filter excludes them all. */
  noneHereTitle: string;
  noneHereBody: string;
  /** Clears the filter. Not "go to /products" any more — see below. */
  seeEverything: string;
};

export function ProductGrid({
  items,
  labels,
  supplyCta,
}: {
  items: readonly {
    id: string;
    bucket: ProductCategory;
    card: React.ReactNode;
  }[];
  labels: ProductGridLabels;
  /**
   * The "put something on the shelf" CTA, built by the SERVER page and passed
   * down whole — it is not a label, because it is not always a link: a FOUNDER
   * gets a link to the composer, an EXPLORER gets a form that promotes them to
   * a founder first (see ./SwitchToBuilding.tsx). Passing the element rather
   * than a label + href keeps the role lookup on the server and keeps this file
   * from having to know the ladder.
   */
  supplyCta: React.ReactNode;
}) {
  const { matches, clear } = useProductFilter();
  const shown = items.filter((i) => matches(i.bucket));

  if (shown.length === 0) {
    // TWO DIFFERENT MESSAGES, because they ask for two different things.
    // Whether the SHELF is empty is what separates them: an empty shelf needs
    // a maker, an empty filter needs the reader to widen it. Showing "try
    // another category" on a shelf that has nothing at all would send someone
    // hunting through six chips that are not even rendered.
    return items.length === 0 ? (
      <EmptyState
        icon={PackageOpen}
        title={labels.emptyTitle}
        description={labels.emptyBody}
        action={supplyCta}
      />
    ) : (
      <EmptyState
        icon={SearchX}
        title={labels.noneHereTitle}
        description={labels.noneHereBody}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* A BUTTON, not a link to /products. The filter is client state
                now, so "see everything" is `clear()` — navigating to the bare
                URL would be a full server round trip to reach a state already
                one setState away, and it is the exact round trip this change
                removed from the chips. */}
            <Button size="sm" variant="secondary" onClick={clear}>
              {labels.seeEverything}
            </Button>
            {supplyCta}
          </div>
        }
      />
    );
  }

  return (
    // `xl:grid-cols-3`, not lg. The sidebar costs 256px, so at lg a 3-up app
    // grid gives 219px columns — NARROWER than the 2-up at the same viewport.
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/* No wrapper element: each `card` was created with its own `key` in the
          page, so the array reconciles correctly and the <Card> itself stays
          the direct grid item. Wrapping would need `display:contents` to keep
          the layout, which is a DOM node and an accessibility-tree quirk bought
          for nothing. */}
      {shown.map((i) => i.card)}
    </div>
  );
}
