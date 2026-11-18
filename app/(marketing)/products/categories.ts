// /products — the ONE place the display bucket is decided. The slug->label
// map now lives in lib/post-types.ts (the Add product page's category picker
// needs it too).
//
// Lives here rather than in lib/ because it is presentation: lib/post-types.ts
// owns the slugs and `productCategoryOf()` (the data truth), this file owns
// what a reader sees. Both the server page (tServer) and the category filter
// (useT) read it, which is the whole reason it is a module and not two
// inline objects that drift apart.
//
// The VALUES are English source strings — i.e. the translation KEYS, per
// lib/i18n.ts ("the dictionary KEY *is* the English string"). Callers
// translate; nothing here does.

import {
  PRODUCT_CATEGORIES,
  productCategoryOf,
  type ProductCategory,
} from "@/lib/post-types";

// Re-exported, not redefined: the map moved to lib/post-types.ts beside the
// slugs because the Add product page (app/(app)/products/new) needs it too and
// a second copy would drift.
export { CATEGORY_LABEL } from "@/lib/post-types";

/**
 * THIS PHASE'S SHELVES: games and apps, nothing finer (the founder's call,
 * 2026-11-18). With a shelf this small, nine category chips over a handful
 * of products filtered to one or two cards each. Every product that is not a
 * game is an app.
 *
 * A product still DECLARES its fine category (lib/post-types.ts, picked on
 * /products/new and shown on its own page); only what the deck filters BY is
 * coarse. So the nine come back by changing this block alone: the buckets,
 * their labels, productBucketOf and the mapping in parseCategoryParam.
 */
export const FILTER_BUCKETS = ["game", "app"] as const;
export type FilterBucket = (typeof FILTER_BUCKETS)[number];

/** English source labels, i.e. translation keys; callers translate. */
export const FILTER_LABEL: Record<FilterBucket, string> = {
  game: "Games",
  app: "Apps",
};

/**
 * Which SHELF a product sits on, as opposed to which category it declares.
 *
 * `productCategoryOf()` returns null for the show_and_tell rows that predate
 * the category convention, and there is no backfill (the dev database is
 * production). Those, and every declared category but `game`, are apps.
 * Everything user-facing goes through here so a declared category can never
 * reach a filter chip.
 */
export function productBucketOf(tags: string[]): FilterBucket {
  return productCategoryOf(tags) === "game" ? "game" : "app";
}

/** The shelf a declared category sits on in this phase. */
function bucketOfCategory(category: ProductCategory): FilterBucket {
  return category === "game" ? "game" : "app";
}

/** The query parameter: `?category=game`. */
export const PARAM = "category";

/**
 * What separated slugs when the filter was multi-select (`?category=game,app`).
 * Nothing writes it any more; it is still READ, because those links were
 * shareable and some are pasted into forum posts.
 */
const LEGACY_SEPARATOR = ",";

/**
 * Parse `?category=` into the ONE category the deck is filtered to, or null.
 *
 * SINGLE-SELECT. The deck shows one card at a time, so "games or apps" buys a
 * reader nothing a single category does not. A legacy multi-category link
 * resolves to its FIRST valid slug in the order it was written, and that
 * slug to its shelf: `?category=game,ai` is games, `?category=gmae,ai` is
 * apps (AI is an app). Repeated
 * parameters (`?category=gmae&category=ai`) are read the same way, as one
 * list in URL order — which is why the client passes `getAll()`, not `get()`.
 *
 * Unknown and empty entries are DROPPED rather than treated as a filter that
 * matches nothing: the value is in a URL anyone can mistype or truncate, and
 * answering a typo with an empty deck is the same theatre a 404 would have
 * been. `?category=gmae` shows the whole shelf.
 *
 * A link from the nine-category days still works: `?category=finance` (any
 * declared category but game) opens the apps shelf, because that is where
 * those products now sit.
 *
 * It lives HERE, in a module with no "use client", precisely because the
 * SERVER page calls it too — the first paint has to be the filtered deck, so
 * both sides must read the URL the same way, and that means one function
 * rather than two that agree today.
 */
export function parseCategoryParam(
  raw: string | readonly string[] | undefined,
): FilterBucket | null {
  const values = typeof raw === "string" ? [raw] : (raw ?? []);
  for (const slug of values.flatMap((v) => v.split(LEGACY_SEPARATOR))) {
    const trimmed = slug.trim();
    if ((FILTER_BUCKETS as readonly string[]).includes(trimmed)) {
      return trimmed as FilterBucket;
    }
    if ((PRODUCT_CATEGORIES as readonly string[]).includes(trimmed)) {
      return bucketOfCategory(trimmed as ProductCategory);
    }
  }
  return null;
}
