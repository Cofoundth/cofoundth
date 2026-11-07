"use client";

// /products — the selected categories, shared by the chips, the grid and the
// count beside the page title.
//
// ── WHY A CONTEXT AND NOT STATE IN ProductFilters ─────────────────────────
// Three things on this page read the same selection and they are not
// neighbours in the tree: the chip row, the grid below it, and the "{n}
// products" span INSIDE the <h1> above it. Lifting the state into the page is
// not available — the page is a server component and must stay one, because
// ProductCard is server-rendered markup and the whole point of the card split
// is that the shelf is not a client tree. A provider around the three is the
// cheapest thing that lets them agree.
//
// ── THE FILTER IS CLIENT-SIDE, AND THAT IS A BET WITH A SHELF LIFE ────────
// The page now fetches the WHOLE shelf once and every chip click is a Set
// update — no router.push, no RSC refetch, no spinner. That is right at this
// scale and wrong at some larger one, so the number is written down:
//
//   · page.tsx fetches PRODUCT_SHELF_LIMIT (200) products, newest first.
//   · While the shelf holds 200 or fewer products this is exact: the client
//     has every row, so a chip's tally IS the set of cards it will show.
//   · Past 200 it silently becomes "the newest 200". The chips stop being
//     counts of the shelf and become counts of the page, and a product older
//     than the 200th is unreachable by any filter. THAT is the point at which
//     server-side filtering or pagination has to come back — not before.
//   · There are zero real products today (the six on screen are dev fixtures),
//     so the bet is a long way from losing.
//
// ── WHERE THE SERVER-SIDE `category` LOGIC WENT ──────────────────────────
// `getProductsPage(…, { category })` in lib/posts.ts is now called WITHOUT a
// category and that parameter has no other caller, so its query branch is
// dead. It is not deleted here only because lib/ is owned by another change
// in flight; it should go. Its one piece of hard-won knowledge is carried
// into `bucketsOf` below rather than deleted with it:
//
//   "other" never meant `tags && '{other}'`. It meant "carries none of the
//   five real slugs", because the show_and_tell rows that predate the
//   category convention have no category tag at all and there is no backfill
//   (the dev database IS production). A literal tag match would have put
//   those rows under "All" and under no chip, i.e. visible in the unfiltered
//   grid and unreachable from every filter.
//
// Client-side that subtlety costs nothing, because `productBucketOf()` is the
// same `productCategoryOf(tags) ?? "other"` the server tally already used —
// one function, so a chip's number and the cards behind it are derived from
// the same expression and cannot drift. The negation query existed only
// because SQL had no way to say "?? other".

// PARAM/SEPARATOR come from ./categories, which carries no "use client" — the
// SERVER page parses the same query string with the same `parseCategoryParam`
// from that module, and a shared parser must not drag a client module into the
// server graph. This file only needs to WRITE the param back.
import { PARAM, SEPARATOR } from "./categories";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductCounts,
} from "@/lib/post-types";

type FilterValue = {
  selected: ReadonlySet<ProductCategory>;
  /** Tallies over the WHOLE fetched shelf, not the filtered view — a chip must
   *  not vanish because another chip is on. */
  counts: ProductCounts;
  /** How many cards are on screen right now. Drives the header count. */
  shownCount: number;
  toggle: (c: ProductCategory) => void;
  clear: () => void;
  /** The one predicate. Both the grid and `shownCount` go through it. */
  matches: (bucket: ProductCategory) => boolean;
};

const FilterContext = createContext<FilterValue | null>(null);

function useFilter(): FilterValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("ProductFilterProvider is missing");
  return ctx;
}

export function ProductFilterProvider({
  items,
  initial,
  children,
}: {
  /** Every product on the shelf, bucketed. Only the bucket is read — the page
   *  passes the same array it passes to the grid, so the two cannot disagree
   *  about what is being counted. */
  items: readonly { bucket: ProductCategory }[];
  /** From the server's own read of `?category=`, so the FIRST PAINT is already
   *  filtered rather than flashing the whole shelf and then narrowing. */
  initial: readonly ProductCategory[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<ReadonlySet<ProductCategory>>(
    () => new Set(initial),
  );

  const matches = useCallback(
    (bucket: ProductCategory) => selected.size === 0 || selected.has(bucket),
    [selected],
  );

  const counts = useMemo(() => {
    const out = { all: items.length } as ProductCounts;
    for (const c of PRODUCT_CATEGORIES) out[c] = 0;
    for (const i of items) out[i.bucket] += 1;
    return out;
  }, [items]);

  const shownCount = useMemo(
    () => items.reduce((n, i) => (matches(i.bucket) ? n + 1 : n), 0),
    [items, matches],
  );

  const toggle = useCallback((c: ProductCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      // OR semantics, independent chips: "games or apps" is the thing a single
      // select could not say, and it is the whole reason this changed.
      if (!next.delete(c)) next.add(c);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  // THE URL STAYS SHAREABLE. `replaceState`, not `router.push` — push is the
  // server round trip this change exists to remove, and Next documents the
  // native history methods as integrating with its router (see
  // linking-and-navigating.md). The cost, stated rather than discovered: the
  // back button no longer steps through the filters somebody tried, which the
  // single-select version did. A filter is not a destination; a shared link
  // still is, and that is the half worth keeping.
  //
  // It runs on mount as well, which NORMALISES the address: a hand-typed
  // `?category=gmae,app` rewrites to `?category=app` rather than sitting there
  // contradicting the chips. Other query parameters are left alone.
  useEffect(() => {
    const url = new URL(window.location.href);
    const value = PRODUCT_CATEGORIES.filter((c) => selected.has(c)).join(
      SEPARATOR,
    );
    if (value) url.searchParams.set(PARAM, value);
    else url.searchParams.delete(PARAM);
    // `URLSearchParams` percent-encodes the separator, so the address bar
    // would read `?category=app%2Cgame`. A comma is a sub-delim and legal
    // unencoded in a query (RFC 3986), both forms parse back identically, and
    // the readable one is the point: this URL exists to be pasted into a forum
    // post. Only the separator is unescaped — the slugs are a closed set of
    // ASCII words, so nothing else here can need encoding.
    const search = url.searchParams.toString().replace(/%2C/g, SEPARATOR);
    const next = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) {
      window.history.replaceState(null, "", next);
    }
  }, [selected]);

  const value = useMemo(
    () => ({ selected, counts, shownCount, toggle, clear, matches }),
    [selected, counts, shownCount, toggle, clear, matches],
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useProductFilter(): FilterValue {
  return useFilter();
}

/**
 * The "{n} products" beside the page title. A client island inside a
 * server-rendered <h1> purely so the number tracks the filter — a tally that
 * said 6 next to two visible cards is the kind of small lie the chips' own
 * counts were written to avoid.
 *
 * Both strings arrive already translated and already carrying `{n}`.
 */
export function ProductCount({ one, many }: { one: string; many: string }) {
  const { shownCount } = useFilter();
  return (
    <span className="text-sm font-normal tracking-normal text-ink-muted">
      {(shownCount === 1 ? one : many).replace("{n}", String(shownCount))}
    </span>
  );
}
