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
  image_url: string | null;
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
