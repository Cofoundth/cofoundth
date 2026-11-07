// Shared post types — client-safe (no imports, no server code).
// One post model for the merged dashboard + community feed.

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

export type PostComment = {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor | null;
  isOwn: boolean;
};

// ---- Images ---------------------------------------------------------------
// A post has had a cover image since 0034 (`image_url`, one nullable text). A
// product needs SCREENSHOTS — several, so a card can preview the others on
// hover — which is why 0076 adds `image_urls text[] not null default '{}'`.
//
// `image_url` is not going anywhere: real rows use it, nothing backfills it,
// and createPostAction keeps writing the first image to it. The two columns
// stay consistent because NOBODY reads either one directly — every consumer
// calls postImages(). That is the whole mechanism keeping a 2026-05 post with
// one cover and a product with five screenshots rendering through the same
// code path.

/** Per product. The composer caps the picker here and createPostAction
 *  re-checks, because a cap enforced only in the UI is not a cap. */
export const MAX_PRODUCT_IMAGES = 5;

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

export const PRODUCT_CATEGORIES = [
  "app",
  "game",
  "tool",
  "ai",
  "web",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// The human label for each slug. The VALUES are English source strings, i.e.
// the translation KEYS (lib/i18n.ts: "the dictionary KEY *is* the English
// string") — callers run them through tr()/tServer(); nothing here translates.
//
// This lives beside the slugs rather than next to either consumer because it
// had already been written TWICE — once for the /products chips, once for the
// composer's category picker — and a label is a translation key, so the two
// copies drifting would not look like a typo. It would silently drop one
// surface's chip to English while the other stayed Thai.
export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  app: "App",
  game: "Game",
  tool: "Tool",
  ai: "AI",
  web: "Web",
  other: "Other",
};

// Per-category tallies for the filter chips, plus `all` for the "All" chip.
export type ProductCounts = { all: number } & Record<ProductCategory, number>;

// The category a row is in: the FIRST tag that is a controlled slug, or null.
// null is a real case, not a defect — show_and_tell posts predate this surface
// and carry no category tag. They are deliberately NOT backfilled, and the UI
// files them under "other" (lib/posts.ts matches that in the query, so the
// "other" chip and the "other" count agree).
export function productCategoryOf(tags: string[]): ProductCategory | null {
  for (const tag of tags) {
    if ((PRODUCT_CATEGORIES as readonly string[]).includes(tag)) {
      return tag as ProductCategory;
    }
  }
  return null;
}
