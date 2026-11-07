// /products — the ONE place the display bucket is decided. The slug->label
// map now lives in lib/post-types.ts (the composer needs it too).
//
// Lives here rather than in lib/ because it is presentation: lib/post-types.ts
// owns the slugs and `productCategoryOf()` (the data truth), this file owns
// what a reader sees. Both the server page (tServer) and the filter chips
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
// slugs because the composer needs it too and a second copy would drift.
export { CATEGORY_LABEL } from "@/lib/post-types";

/**
 * Which SHELF a product sits on, as opposed to which category it declares.
 *
 * `productCategoryOf()` returns null for the show_and_tell rows that predate
 * the category convention — and there is no backfill (the dev database is
 * production; see the contract). So "other" means two different things that
 * the UI must not distinguish: the row that chose `other`, and the row from
 * before the choice existed. Everything user-facing goes through here so a
 * null can never reach a label lookup or a chip.
 */
export function productBucketOf(tags: string[]): ProductCategory {
  return productCategoryOf(tags) ?? "other";
}

/** The query parameter, and the separator inside it: `?category=game,app`. */
export const PARAM = "category";
export const SEPARATOR = ",";

/**
 * Parse `?category=` into a set of real slugs.
 *
 * Unknown, empty and duplicate entries are DROPPED rather than treated as a
 * filter that matches nothing: the value is in a URL anyone can mistype or
 * truncate, and answering a typo with an empty grid is the same theatre a 404
 * would have been. `?category=gmae` shows the whole shelf.
 *
 * It lives HERE, in a module with no "use client", precisely because the
 * SERVER page calls it too — the first paint has to be
 * the filtered grid, so both sides must read the URL the same way, and that
 * means one function rather than two that agree today.
 */
export function parseCategoryParam(
  raw: string | string[] | undefined,
): ProductCategory[] {
  const value = Array.isArray(raw) ? raw.join(SEPARATOR) : (raw ?? "");
  const wanted = new Set(value.split(SEPARATOR).map((s) => s.trim()));
  // Iterating PRODUCT_CATEGORIES rather than the input also normalises the
  // ORDER, so `?category=app,game` and `?category=game,app` are one state and
  // the URL this writes back is deterministic.
  return PRODUCT_CATEGORIES.filter((c) => wanted.has(c));
}
