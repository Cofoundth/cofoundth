// Server-only: fetch + shape the merged post feed (forum_posts).
// Used by the dashboard and /community so both render the identical feed.

import { type createClient } from "@/lib/supabase/server";
import type {
  PostItem,
  PostKind,
  ProductCategory,
  ProductCounts,
} from "./post-types";
import { PRODUCT_CATEGORIES, productCategoryOf } from "./post-types";

type DB = Awaited<ReturnType<typeof createClient>>;

const POST_COLS =
  "id, author_id, title, content, kind, link_url, image_url, tags, created_at";

type PostRow = Record<string, unknown>;

// Hidden/suspended authors shouldn't surface in the public feed or search —
// hiding a user must hide their posts too. Returns the (small) set of
// suspended profile ids to exclude. Best-effort: if it returns nothing, the
// feed simply isn't filtered (no worse than before).
async function suspendedAuthorIds(supabase: DB): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("suspended", true);
  return (data ?? []).map((r) => r.id as string);
}

// Turn raw forum_posts rows into PostItems (authors, like + comment counts).
async function shapePosts(
  supabase: DB,
  posts: PostRow[],
  userId?: string | null,
): Promise<PostItem[]> {
  if (!posts.length) return [];

  const ids = posts.map((p) => p.id as string);
  const authorIds = Array.from(
    new Set(posts.map((p) => p.author_id as string)),
  );

  const [{ data: authors }, { data: likes }, { data: comments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, photo_url, slug")
        .in("id", authorIds),
      supabase.from("forum_likes").select("post_id, user_id").in("post_id", ids),
      supabase.from("forum_comments").select("post_id").in("post_id", ids),
    ]);

  const authorMap = new Map((authors ?? []).map((a) => [a.id as string, a]));

  const likeCount = new Map<string, number>();
  const myLikes = new Set<string>();
  (likes ?? []).forEach((l) => {
    const k = l.post_id as string;
    likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
    if (userId && l.user_id === userId) myLikes.add(k);
  });

  const commentCount = new Map<string, number>();
  (comments ?? []).forEach((c) => {
    const k = c.post_id as string;
    commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
  });

  return posts.map((p) => {
    const a = authorMap.get(p.author_id as string);
    return {
      id: p.id as string,
      title: (p.title as string | null) ?? null,
      content: p.content as string,
      kind: ((p.kind as string) ?? "post") as PostKind,
      link_url: (p.link_url as string | null) ?? null,
      image_url: (p.image_url as string | null) ?? null,
      tags: ((p.tags as string[] | null) ?? []) as string[],
      created_at: p.created_at as string,
      author: a
        ? {
            id: a.id as string,
            full_name: (a.full_name as string | null) ?? null,
            photo_url: (a.photo_url as string | null) ?? null,
            slug: (a.slug as string | null) ?? null,
          }
        : null,
      isOwn: !!userId && p.author_id === userId,
      likeCount: likeCount.get(p.id as string) ?? 0,
      myLike: myLikes.has(p.id as string),
      commentCount: commentCount.get(p.id as string) ?? 0,
    };
  });
}

// How many extra rows an exclusion set is allowed to buy back. A blocked
// author's posts are dropped AFTER the query, so the page has to over-fetch or
// it comes back short; the cap keeps a viewer with a long block list from
// turning one feed render into a 500-row scan.
const MAX_OVERFETCH = 50;

export async function getFeedPosts(
  supabase: DB,
  {
    limit = 30,
    userId,
    before,
    excludeAuthorIds,
  }: {
    limit?: number;
    userId?: string | null;
    before?: string | null;
    /** Blocked pairs (lib/blocking). Filtered in JS: the reverse direction of
     *  a block is RLS-invisible, so it can't become a query clause. */
    excludeAuthorIds?: Iterable<string>;
  },
): Promise<PostItem[]> {
  const excluded =
    excludeAuthorIds instanceof Set
      ? excludeAuthorIds
      : new Set(excludeAuthorIds ?? []);
  const fetchLimit = limit + Math.min(excluded.size, MAX_OVERFETCH);

  let q = supabase
    .from("forum_posts")
    .select(POST_COLS)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  // Cursor pagination: fetch the page strictly older than `before`. The
  // cursor is a created_at, and the filter below only ever REMOVES rows, so
  // over-fetching cannot make a later page skip anything.
  if (before) q = q.lt("created_at", before);
  const hiddenAuthors = await suspendedAuthorIds(supabase);
  if (hiddenAuthors.length)
    q = q.not("author_id", "in", `(${hiddenAuthors.join(",")})`);

  const { data: posts } = await q;
  const rows = excluded.size
    ? (posts ?? []).filter((p) => !excluded.has(p.author_id as string))
    : (posts ?? []);
  return shapePosts(supabase, rows.slice(0, limit), userId);
}

// Full-DB search across title, content, tags, and author name. Unlike the old
// client-side filter, this looks beyond the loaded page.
export async function searchPosts(
  supabase: DB,
  rawQuery: string,
  userId?: string | null,
  limit = 40,
): Promise<PostItem[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  const { data: namedAuthors } = await supabase
    .from("profiles")
    .select("id")
    .ilike("full_name", like)
    .limit(50);
  const authorIds = (namedAuthors ?? []).map((a) => a.id as string);

  const hiddenAuthors = await suspendedAuthorIds(supabase);
  const base = () => {
    let b = supabase
      .from("forum_posts")
      .select(POST_COLS)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (hiddenAuthors.length)
      b = b.not("author_id", "in", `(${hiddenAuthors.join(",")})`);
    return b;
  };

  const [byContent, byTitle, byTag, byAuthor] = await Promise.all([
    base().ilike("content", like),
    base().ilike("title", like),
    base().contains("tags", [q.toLowerCase()]),
    authorIds.length
      ? base().in("author_id", authorIds)
      : Promise.resolve({ data: [] as PostRow[] }),
  ]);

  // Merge unique by id, keep newest first.
  const seen = new Map<string, PostRow>();
  for (const set of [byContent, byTitle, byTag, byAuthor]) {
    for (const p of (set.data ?? []) as PostRow[]) {
      if (!seen.has(p.id as string)) seen.set(p.id as string, p);
    }
  }
  const merged = Array.from(seen.values())
    .sort((a, b) =>
      (b.created_at as string).localeCompare(a.created_at as string),
    )
    .slice(0, limit);

  return shapePosts(supabase, merged, userId);
}

// ---- Products grid (/products) -------------------------------------------
// A product is a `show_and_tell` post that has a link_url. The grid links OUT
// — App Store, Play Store, a web app — and nothing here hosts, embeds or
// proxies anyone's product, so a show_and_tell post with nothing to click is
// not a product: it stays in the community feed and off this page.
// Category lives in `tags` (see lib/post-types.ts for why it is a tag and not
// a column) and is queried with `.overlaps("tags", [category])`.

export type ProductQueryOpts = {
  category?: ProductCategory | null;
  limit?: number;
  userId?: string | null;
  /** Blocked pairs (lib/blocking) — the same JS-side filter the feed applies.
   *  Without it a blocked author's app still shows up here. */
  excludeAuthorIds?: Iterable<string>;
};

// Every category except "other" — see the `category === "other"` branch.
const REAL_CATEGORY_SLUGS = PRODUCT_CATEGORIES.filter((c) => c !== "other");

// How many rows the per-category tally scans. Counts are exact up to this
// many products; past it the chips undercount. That is the honest trade for
// keeping one page render off a full-table scan: PostgREST has no GROUP BY,
// so the alternatives are six count queries per render or the real column
// this surface is deliberately deferring.
const COUNT_SCAN_LIMIT = 1000;

function productsQuery<C extends string>(
  supabase: DB,
  cols: C,
  category: ProductCategory | null | undefined,
  hiddenAuthors: string[],
) {
  let q = supabase
    .from("forum_posts")
    .select(cols)
    .eq("kind", "show_and_tell")
    .eq("hidden", false);

  if (hiddenAuthors.length)
    q = q.not("author_id", "in", `(${hiddenAuthors.join(",")})`);

  if (category === "other") {
    // "other" means "carries none of the five real slugs", NOT "tagged
    // `other`". That is what keeps the pre-existing show_and_tell rows
    // reachable: they have no category tag, so a literal `tags && '{other}'`
    // would show them under "All" and under no chip at all.
    // Safe because forum_posts.tags is NOT NULL (verified against the live
    // table): `'{}' && '{app,…}'` is false, so negating it KEEPS the row —
    // a nullable column would have been dropped by the negation instead.
    q = q.not("tags", "ov", `{${REAL_CATEGORY_SLUGS.join(",")}}`);
  } else if (category) {
    q = q.overlaps("tags", [category]);
  }

  // Applied LAST on purpose: the `(column, "is", null)` overload narrows the
  // row type, and narrowing inside a reassigned `let` makes tsc recurse
  // (TS2589, "type instantiation is excessively deep"). Order of filters on
  // the wire is irrelevant — they all become query params.
  return q.not("link_url", "is", null);
}

// Newest first, blocked authors dropped in JS (same over-fetch cap as the
// feed, for the same reason: the reverse direction of a block is RLS-
// invisible and so cannot become a query clause).
async function fetchProductRows(
  supabase: DB,
  category: ProductCategory | null | undefined,
  limit: number,
  excluded: Set<string>,
  hiddenAuthors: string[],
): Promise<PostRow[]> {
  const { data } = await productsQuery(
    supabase,
    POST_COLS,
    category,
    hiddenAuthors,
  )
    .order("created_at", { ascending: false })
    .limit(limit + Math.min(excluded.size, MAX_OVERFETCH));

  const rows = (data ?? []) as PostRow[];
  return (excluded.size
    ? rows.filter((p) => !excluded.has(p.author_id as string))
    : rows
  ).slice(0, limit);
}

// Bucket the tally. An uncategorised row counts as "other" — the same rows the
// "other" chip's query returns, so the number on the chip matches what
// clicking it shows. Keep the two in lockstep if either changes.
// (A legacy row carrying two slugs is counted under the first and listed under
// both chips. createPostAction makes that impossible for anything new.)
function countProducts(rows: PostRow[], excluded: Set<string>): ProductCounts {
  const counts = { all: 0 } as ProductCounts;
  for (const c of PRODUCT_CATEGORIES) counts[c] = 0;

  for (const r of rows) {
    if (excluded.size && excluded.has(r.author_id as string)) continue;
    const tags = ((r.tags as string[] | null) ?? []) as string[];
    counts.all += 1;
    counts[productCategoryOf(tags) ?? "other"] += 1;
  }
  return counts;
}

// The grid AND the chip counts in ONE wait: both queries go out together.
// They cannot be a single request — PostgREST has no GROUP BY — and deriving
// the grid from the tally's capped scan instead would silently drop older rows
// out of a filtered category, which is worse than one parallel request.
export async function getProductsPage(
  supabase: DB,
  { category, limit = 30, userId, excludeAuthorIds }: ProductQueryOpts,
): Promise<{ items: PostItem[]; counts: ProductCounts }> {
  const excluded =
    excludeAuthorIds instanceof Set
      ? excludeAuthorIds
      : new Set(excludeAuthorIds ?? []);
  const hiddenAuthors = await suspendedAuthorIds(supabase);

  const [rows, tally] = await Promise.all([
    fetchProductRows(supabase, category, limit, excluded, hiddenAuthors),
    // No category filter: the chips need every category, not the current one.
    // ORDER matters even though we only tally: past COUNT_SCAN_LIMIT products
    // an unordered limit returns an ARBITRARY slice, so a category with real
    // products could score 0 and ProductFilters would hide its chip entirely.
    // Newest-first makes the cap "the most recent N", which is at least honest.
    productsQuery(supabase, "author_id, tags", null, hiddenAuthors)
      .order("created_at", { ascending: false })
      .limit(COUNT_SCAN_LIMIT),
  ]);

  return {
    items: await shapePosts(supabase, rows, userId),
    counts: countProducts((tally.data ?? []) as PostRow[], excluded),
  };
}
