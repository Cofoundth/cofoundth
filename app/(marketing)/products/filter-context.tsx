"use client";

// /products — the selected category, shared by the category filter and the
// deck under it.
//
// ── WHY A CONTEXT AND NOT STATE IN ProductFilters ─────────────────────────
// Two things on this page read the same selection and the page between them is
// a server component that must stay one, because it reads the session, the
// role and the shelf: the row of category chips above the deck
// (./ProductFilters.tsx), and the deck. A provider around the two is the
// cheapest thing that lets them agree.
//
// ── SINGLE-SELECT ─────────────────────────────────────────────────────────
// `selected` is ONE category or null ("All"), not a set. A deck shows one card
// at a time, so filtering by "games or apps" at once bought nothing a single
// category does not, and a nullable value makes "at most one" a property of
// the type rather than a convention every caller has to keep. Legacy
// multi-category links still resolve: see parseCategoryParam in ./categories.
//
// ── THE FILTER IS CLIENT-SIDE, AND THAT IS A BET WITH A SHELF LIFE ────────
// The page fetches the WHOLE shelf once and every change of category is a
// state update — no router.push, no RSC refetch, no spinner. That is right at
// this scale and wrong at some larger one, so the number is written down:
//
//   · shelf-data.ts fetches PRODUCT_SHELF_LIMIT (200) products, newest first.
//   · While the shelf holds 200 or fewer products this is exact: the client
//     has every row, so a category's chip is offered exactly when its deck
//     has a card, and its deck IS that category.
//   · Past 200 it silently becomes "the newest 200". A category whose products
//     are all older than the 200th loses its chip, and a product older than
//     the 200th is unreachable by any filter. THAT is the point at which
//     server-side filtering or pagination has to come back — not before.
//   · There are zero real products today (the ones on screen are dev fixtures),
//     so the bet is a long way from losing.
//
// ── WHERE THE SERVER-SIDE `category` LOGIC WENT ──────────────────────────
// It is GONE. `getProductsPage(…, { category })` and the capped count scan
// beside it were deleted from lib/posts.ts when the shelf went public and
// became getPublicProductsPage — no caller passed a category, and leaving a
// second products reader in that module would have been a trap: the next page
// wired to it would silently lose the public author gate. Its one piece of
// hard-won knowledge is carried into the bucketing rather than deleted with it:
//
//   "other" never meant `tags && '{other}'`. It meant "carries none of the
//   real slugs", because the show_and_tell rows that predate the
//   category convention have no category tag at all and there is no backfill
//   (the dev database IS production). A literal tag match would have put
//   those rows under "All" and under no category, i.e. visible in the
//   unfiltered deck and unreachable from every filter.
//
// Client-side that subtlety costs nothing, because `productBucketOf()` is the
// same `productCategoryOf(tags) ?? "other"` the server tally already used —
// one function, so whether a chip is offered and the cards behind it are
// derived from the same expression and cannot drift. The negation query
// existed only because SQL had no way to say "?? other".

// PARAM and parseCategoryParam come from ./categories, which carries no "use
// client" — the SERVER page parses the same query string with the same
// function, and a shared parser must not drag a client module into the server
// graph.
import { PARAM, parseCategoryParam } from "./categories";
import { writeAfterToAddress } from "./deck-position";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/post-types";

/** Put ONE selection into `?category=` (or take it out), leaving every other
 *  query parameter and the hash alone. A no-op when the address already says
 *  it, so calling it on every read costs nothing. */
function writeAddress(selected: ProductCategory | null) {
  const url = new URL(window.location.href);
  if (selected) url.searchParams.set(PARAM, selected);
  else url.searchParams.delete(PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) {
    window.history.replaceState(null, "", next);
  }
}

type FilterValue = {
  /** null is "All": no category, the whole shelf. */
  selected: ProductCategory | null;
  /** The categories with at least one product on the WHOLE fetched shelf, in
   *  PRODUCT_CATEGORIES order: the chips the filter offers. Never the
   *  filtered view, or choosing one category would take every other chip
   *  away. */
  available: readonly ProductCategory[];
  select: (c: ProductCategory | null) => void;
  /** The one predicate the deck filters through. */
  matches: (bucket: ProductCategory) => boolean;
};

const FilterContext = createContext<FilterValue | null>(null);

export function ProductFilterProvider({
  items,
  initial,
  children,
}: {
  /** Every product on the shelf, bucketed. Only the bucket is read — the page
   *  passes the same array it passes to the deck, so the two cannot disagree
   *  about what is being counted. */
  items: readonly { bucket: ProductCategory }[];
  /** From the server's own read of `?category=`, so the FIRST PAINT is already
   *  filtered rather than flashing the whole shelf and then narrowing. It can
   *  be STALE on a Back/Forward restore from the router cache; the address
   *  effect below corrects it before paint. */
  initial: ProductCategory | null;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<ProductCategory | null>(initial);

  const matches = useCallback(
    (bucket: ProductCategory) => selected === null || selected === bucket,
    [selected],
  );

  const available = useMemo(() => {
    const present = new Set(items.map((i) => i.bucket));
    return PRODUCT_CATEGORIES.filter((c) => present.has(c));
  }, [items]);

  // THE URL STAYS SHAREABLE: a choice the reader makes is written into it
  // here, in the handler, never from an effect watching the state (see BACK/
  // FORWARD below for why). `replaceState`, not `router.push` — push is a
  // server round trip for a state the client already holds, and Next documents
  // the native history methods as integrating with its router, called from an
  // event handler exactly like this (see linking-and-navigating.md). The cost,
  // stated rather than discovered: the back button does not step through the
  // categories somebody tried. A filter is not a destination; a shared link
  // still is, and that is the half worth keeping.
  //
  // A REAL change of category also drops `?after=` (./deck-position.ts): the
  // deck below is keyed on the category and restarts at its first match, and
  // it reads `after` from the address as it remounts, so the address has to
  // stop resuming first. Re-choosing the category already shown changes
  // nothing, so it keeps the position.
  const select = useCallback((c: ProductCategory | null) => {
    const shown = parseCategoryParam(
      new URLSearchParams(window.location.search).getAll(PARAM),
    );
    if (c !== shown) writeAfterToAddress(null);
    writeAddress(c);
    setSelected(c);
  }, []);

  // THE ADDRESS WINS WHENEVER THE TWO DISAGREE, and this is the only code that
  // reconciles them. It reads the address and moves the state; nothing here
  // ever moves the address to the state. Three things make them disagree:
  //
  //   · BACK/FORWARD. Leave a filtered shelf by a client-side navigation (a
  //     card opening /p/<id> is one) and come back, and Next restores this
  //     page from its router cache: the provider mounts again with the `initial`
  //     the server rendered LAST TIME it fetched the page, while the restored
  //     address holds the category picked since. A previous version mirrored
  //     the state into the address from an effect, and on that mount the effect
  //     wrote the stale `initial` over the restored address — Back lost the
  //     filter. So the address is never written from state: only from a choice
  //     (`select` above) or from the address itself (the normalising write
  //     below).
  //   · A SOFT NAVIGATION THAT ONLY CHANGES THE QUERY. Next keeps the page
  //     segment and this component across one: click the logo on a filtered /
  //     and the URL reads / over a deck still filtered to games, until this
  //     runs.
  //   · A MALFORMED ADDRESS. It NORMALISES as it reads: a hand-typed
  //     `?category=gmae` is dropped, and a legacy `?category=game,app` rewrites
  //     to `?category=game`, rather than either sitting there contradicting the
  //     control. `set` also collapses a repeated parameter to one. Other query
  //     parameters are left alone.
  //
  // A LAYOUT effect, so the correction lands before the browser paints: on the
  // Back case above, a passive effect would show the cached deck for a frame
  // and then swap it. It reads window.location rather than the hook's value,
  // which lags our own replaceState (Next applies it in a transition) — a
  // second choice made inside that gap would otherwise read as an outside
  // navigation back to the first one. `getAll`, never `get`: the server sees a
  // repeated parameter as an array, and the two must resolve it to the same
  // category.
  const searchParams = useSearchParams();
  useLayoutEffect(() => {
    const inAddress = parseCategoryParam(
      new URLSearchParams(window.location.search).getAll(PARAM),
    );
    writeAddress(inAddress);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address bar is the external system here, and a soft navigation fires no event to subscribe to
    setSelected(inAddress);
  }, [searchParams]);

  const value = useMemo(
    () => ({ selected, available, select, matches }),
    [selected, available, select, matches],
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useProductFilter(): FilterValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("ProductFilterProvider is missing");
  return ctx;
}
