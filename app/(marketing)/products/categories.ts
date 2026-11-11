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
 * Which SHELF a product sits on, as opposed to which category it declares.
 *
 * `productCategoryOf()` returns null for the show_and_tell rows that predate
 * the category convention — and there is no backfill (the dev database is
 * production; see the contract). So "other" means two different things that
 * the UI must not distinguish: the row that chose `other`, and the row from
 * before the choice existed. Everything user-facing goes through here so a
 * null can never reach a label lookup or a filter chip.
 */
export function productBucketOf(tags: string[]): ProductCategory {
  return productCategoryOf(tags) ?? "other";
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
 * resolves to its FIRST valid slug in the order it was written:
 * `?category=game,ai` is games, `?category=gmae,ai` is AI. Repeated
 * parameters (`?category=gmae&category=ai`) are read the same way, as one
 * list in URL order — which is why the client passes `getAll()`, not `get()`.
 *
 * Unknown and empty entries are DROPPED rather than treated as a filter that
 * matches nothing: the value is in a URL anyone can mistype or truncate, and
 * answering a typo with an empty deck is the same theatre a 404 would have
 * been. `?category=gmae` shows the whole shelf.
 *
 * It lives HERE, in a module with no "use client", precisely because the
 * SERVER page calls it too — the first paint has to be the filtered deck, so
 * both sides must read the URL the same way, and that means one function
 * rather than two that agree today.
 */
export function parseCategoryParam(
  raw: string | readonly string[] | undefined,
): ProductCategory | null {
  const values = typeof raw === "string" ? [raw] : (raw ?? []);
  for (const slug of values.flatMap((v) => v.split(LEGACY_SEPARATOR))) {
    const trimmed = slug.trim();
    if ((PRODUCT_CATEGORIES as readonly string[]).includes(trimmed)) {
      return trimmed as ProductCategory;
    }
  }
  return null;
}
