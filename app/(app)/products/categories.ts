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

import { productCategoryOf, type ProductCategory } from "@/lib/post-types";

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
