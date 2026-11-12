// Shared post types — client-safe (no imports, no server code).
// One post model for the community feed (and the product shelf's rows).

export type PostKind = "post" | "milestone" | "show_and_tell";

export type PostAuthor = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  slug: string | null;
};

export type PostItem = {
  id: string;
  title: string | null;
  content: string;
  kind: PostKind;
  link_url: string | null;
  /** Legacy single cover. Still written (the first image) and still read by
   *  anything that predates `image_urls`. Never read it directly in new code —
   *  go through postImages(). */
  image_url: string | null;
  /** Every image on the post, oldest-first. ALWAYS an array, never null: the
   *  column is NOT NULL DEFAULT '{}' (0076) and shapePosts coalesces anyway,
   *  so a consumer never has to spell the empty case twice. */
  image_urls: string[];
  tags: string[];
  created_at: string;
  author: PostAuthor | null;
  isOwn: boolean;
  likeCount: number;
  myLike: boolean;
  commentCount: number;
};

// ---- Ratings --------------------------------------------------------------
// CLAUDE.md, "Founder decision (2026-11-10): products have star ratings".
// 1-5 stars, one per member per product, given on the product's page or in the
// deck's review modal after trying it, and never by the swipe itself. A member's own score is private to them; THIS shape is the only
// public part, and the count always travels with the average.
//
// NOT a field on PostItem. Ratings exist only for products, so only the
// product readers attach one (getPublicProductsPage in lib/posts.ts, and the
// two product pages through lib/product-ratings.ts); the feed and search never
// pay for, or carry, a number that means nothing on a post.

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** A whole number of stars, MIN_RATING..MAX_RATING. The ONE check, shared by
 *  the server action (which is invocable with any value at all) and the reads. */
export function isRatingScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING
  );
}

export type ProductRating = {
  /** Already rounded to ONE decimal (see ratingFromTotals). Null exactly when
   *  `count` is 0 — an unrated product has no average, not an average of 0. */
  average: number | null;
  count: number;
};

/** What every product is when nobody has rated it, or when the ratings read
 *  failed: the product still renders, it just reads "No ratings yet". */
export const UNRATED: ProductRating = { average: null, count: 0 };

/** A product row as the shelf and the product pages carry it. */
export type ProductItem = PostItem & { rating: ProductRating };

/**
 * The public rating from the two integers the database aggregates
 * (product_rating_stats: SUM and COUNT, never AVG).
 *
 * The average is rounded to one decimal HERE, once, because one decimal is the
 * only precision any surface shows. A float average rounded at each display
 * site rounds by its binary representation, not its decimal value:
 * `(4.25).toFixed(1)` is "4.3" but `(4.35).toFixed(1)` is also "4.3". From the
 * integers, `sum * 10 / count` lands exactly on every .5 case, so Math.round
 * is exact, and consumers only ever call `average.toFixed(1)` on a value that
 * already has one decimal.
 */
export function ratingFromTotals(sum: number, count: number): ProductRating {
  if (!(count > 0)) return UNRATED;
  return { average: Math.round((sum * 10) / count) / 10, count };
}

export type PostComment = {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor | null;
  isOwn: boolean;
};

// ---- Images ---------------------------------------------------------------
// A post has had a cover image since 0034 (`image_url`, one nullable text). A
// product needs SCREENSHOTS — several, so /p/<id> can show them all — which is
// why 0076 adds `image_urls text[] not null default '{}'`.
//
// `image_url` is not going anywhere: real rows use it, nothing backfills it,
// and both writers (createPostAction for a post's one cover, createProductAction
// for a product's screenshots) keep writing the first image to it. The columns
// stay consistent because NOBODY reads either one directly — every consumer
// calls postImages(). That is the whole mechanism keeping a 2026-05 post with
// one cover and a product with five screenshots rendering through the same
// code path.

/** Per product. The Add product page's screenshot picker
 *  (components/ScreenshotPicker.tsx) caps itself here and createProductAction
 *  re-checks, because a cap enforced only in the UI is not a cap. */
export const MAX_PRODUCT_IMAGES = 5;

/** The image types a post or product may carry. lib/post-actions.ts maps each
 *  to its storage extension (IMG_EXT) and is the real gate; the pickers build
 *  their `accept` attribute and their own early type check from this list, so
 *  a picked .pdf is refused before it costs an upload. Here, beside
 *  MAX_PRODUCT_IMAGES, because a "use server" module may export only async
 *  functions — a constant cannot cross that boundary at all. */
export const POST_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** Per image, after the browser's downscale. The server's limit
 *  (lib/post-actions.ts) and the screenshot picker's read the same number. */
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;

// NOT a layout guard — the deck card clamps the description and does not show
// the name at all, so nothing can overflow, and the card's size comes from the
// screen (app/(marketing)/products/ProductDeck.tsx, CARD_BODY), never from what
// is typed.
//
// These exist because THE DECK CARD IS WHERE A PRODUCT IS READ. A product links
// straight out to the real thing, so text past the clamp is written by a maker
// and then read by almost nobody (only /p/<id> shows all of it). The composer
// was inviting 5000 characters and showing about 82.
//
// THE DESCRIPTION is the card's main text. Since 2026-11-11 the card fills the
// screen and has two shapes:
//     a phone      three lines at 16/24 in a 160px band under the pictures;
//                  text ~246px wide at 320, ~301px at 375 — ESTIMATED from the
//                  2026-11-10 four-line measurements (117 Latin / 131 Thai in
//                  230px, 154 / 165 in 286px) to fit ~94 / 105 at 320 and
//                  ~121 / 130 at 375. Not re-measured.
//     wide screen  up to ten lines at 20/28 in a side panel 256-352px wide,
//                  which holds 160 characters of either script whole.
// So 160 is a recorded DECISION, not a fit: the whole description shows on a
// laptop, and a phone clamps it with an ellipsis — a soft, legible failure —
// whereas a cap tight enough to never clamp on a phone would reject reasonable
// Thai. Re-measure if the card's shape, the type size or a clamp count changes.
// THE NAME is not on the card face (CLAUDE.md, "Founder decision (2026-11-10)"):
// it is the card link's accessible name, the deck's live-region announcement
// and the title on /p/<id>, so 60 is a label-sized cap rather than a clamp fit.
export const MAX_PRODUCT_NAME = 60;
export const MAX_PRODUCT_BLURB = 160;

/** Every image on a post, in order, as an array — `[]` when it has none.
 *  Takes the two raw columns rather than a PostItem so it also works on a row
 *  straight out of a hand-written `.select()` (the /community/[id] and
 *  /p/[id] pages have their own column lists and do not go through
 *  shapePosts). */
export function postImages(p: {
  image_url: string | null;
  image_urls?: string[] | null;
}): string[] {
  if (p.image_urls?.length) return p.image_urls;
  return p.image_url ? [p.image_url] : [];
}

// ---- Products -------------------------------------------------------------
// A "product" is not a new table. It is a `show_and_tell` post that carries a
// link_url, and its CATEGORY rides in the `tags` text[] that already exists,
// as one ordinary lowercase tag — queried with `.overlaps("tags", [cat])`.
//
// WHY a tag and not a column: a tag is reversible and ships today; a column is
// a migration against a database that is also production, for a v1 surface
// that may be thrown away. If /products proves itself, the column earns
// itself then — and the only thing that has to change is this file plus the
// two queries in lib/posts.ts.
//
// That reasoning is about the CATEGORY, and it still holds. It is not a ban on
// migrations: 0076 adds `image_urls` because a second image had nowhere to
// live, and the test it passed is the one above — "is there an existing place
// for this?", not "is a migration scary?". Do not read the paragraph above as
// a reason to pack more things into `tags`.

// ONE AXIS: WHAT THE THING IS FOR.
//
// The first version of this list mixed three axes — form (`app`, `web`),
// genre (`game`), function (`tool`) and technology (`ai`) — which reads fine
// until someone has to USE it. A founder who built a finance web app had to
// choose between `app`, `web` and `tool` with no right answer, and a
// vocabulary that cannot be answered confidently at posting time produces
// noise at browsing time. Subject is the axis a maker can answer without
// thinking and a visitor actually browses by.
//
// `ai` is the one deliberate impurity: it is a technology, not a subject, so
// an AI finance app overlaps. Kept anyway because in practice people look
// for it by name. Every real taxonomy has one of these (the App Store has
// "Utilities"); one is tolerable, four was the problem.
//
// CHANGING THIS LIST ORPHANS EXISTING PRODUCTS. The slug is stored in
// forum_posts.tags, so a renamed slug silently drops its products into
// "other". This was free to change while zero real products carried a
// category; it will not be next time. Migrate the tags if it changes again.
export const PRODUCT_CATEGORIES = [
  "game",
  "finance",
  "learning",
  "health",
  "lifestyle",
  "productivity",
  "developer",
  "ai",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// The human label for each slug. The VALUES are English source strings, i.e.
// the translation KEYS (lib/i18n.ts: "the dictionary KEY *is* the English
// string") — callers run them through tr()/tServer(); nothing here translates.
//
// This lives beside the slugs rather than next to either consumer because it
// had already been written TWICE — once for the /products category filter,
// once for the category picker (then in the community composer, now on the Add
// product page, app/(app)/products/new) — and a label is a translation key,
// so the two copies drifting would not look like a typo. It would silently
// drop one surface's label to English while the other stayed Thai.
export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  game: "Game",
  finance: "Finance",
  learning: "Learning",
  health: "Health",
  lifestyle: "Lifestyle",
  productivity: "Productivity",
  developer: "Developer tools",
  ai: "AI",
  other: "Other",
};

// The category a row is in: the FIRST tag that is a controlled slug, or null.
// null is a real case, not a defect — show_and_tell posts predate this surface
// and carry no category tag. They are deliberately NOT backfilled, and the UI
// files them under "other" (productBucketOf in app/(marketing)/products/
// categories.ts, the one function behind both whether the "other" chip is
// offered and the cards it filters to).
export function productCategoryOf(tags: string[]): ProductCategory | null {
  for (const tag of tags) {
    if ((PRODUCT_CATEGORIES as readonly string[]).includes(tag)) {
      return tag as ProductCategory;
    }
  }
  return null;
}
