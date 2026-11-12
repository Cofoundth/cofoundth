// Server-only: fetch + shape the merged post feed (forum_posts), as /community
// renders it (the dashboard that shared it is gone, 2026-11-12).
//
// THE FEED IS POSTS AND MILESTONES. A product (kind 'show_and_tell') is added
// quietly on /products/new and is never announced (CLAUDE.md, Language Rules),
// so getFeedPosts — the /community feed and its load-more — and searchPosts —
// the feed's search — all exclude the kind with
// FEED_EXCLUDES_KIND. The shelf reader further down is the one place a product
// is listed. A maker who wants their product seen in the feed writes a post.

import { type createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UNRATED, type PostItem, type PostKind, type ProductItem } from "./post-types";
import { getProductRatings } from "./product-ratings";
import { devTestAuthorIds } from "./test-accounts";

type DB = Awaited<ReturnType<typeof createClient>>;

const BASE_POST_COLS =
  "id, author_id, title, content, kind, link_url, image_url, tags, created_at";

// `image_urls` arrives in migration 0076. This list is NOT products-only — the
// community feed and search both select it — so the column and
// this line landed together in the same change; 0076 is applied.
const POST_COLS = `${BASE_POST_COLS}, image_urls`;

type PostRow = Record<string, unknown>;

// 0076 is applied, so `image_urls` is simply selected now. The downgrade that
// used to live here — retry without the column if PostgREST returned 42703 —
// is gone with it.
//
// WHAT IS KEPT, AND WHY IT IS NOT LEFTOVER SCAFFOLDING: selectPosts() LOGS a
// failed query. Every query in this file used to be `const { data } = await q`,
// which drops the error on the floor, so a broken select did not surface as an
// error — it surfaced as an EMPTY community feed, empty dashboard, empty
// search, and silence in the logs. That is not hypothetical: migration 0061
// exists because the same shape of mistake rendered "You're the first one
// here" over a directory of 23 real profiles. The seatbelt incidentally fixed
// that; deleting it wholesale would have put it back.
type QueryError = { code?: string | null; message?: string | null } | null;
type PostQuery = PromiseLike<{ data: unknown; error: QueryError }>;

async function selectPosts(build: (cols: string) => PostQuery): Promise<PostRow[]> {
  const { data, error } = await build(POST_COLS);
  if (error) {
    console.error("[posts] query failed", error.message);
    return [];
  }
  return (data ?? []) as PostRow[];
}

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
  /**
   * Authors already resolved by the caller. When present the `profiles` read
   * below is SKIPPED, because for the public shelf that map doubles as the
   * author GATE: a row whose author is missing from it has already been
   * dropped (see publicProductAuthors). Resolving the author twice — once to
   * decide whether the product may be published, once to render the name —
   * is the drift this parameter exists to make impossible.
   */
  preResolvedAuthors?: Map<string, PostRow>,
): Promise<PostItem[]> {
  if (!posts.length) return [];

  const ids = posts.map((p) => p.id as string);
  const authorIds = Array.from(
    new Set(posts.map((p) => p.author_id as string)),
  );

  // `user_id` answers exactly ONE question — "did I like this?" — so it is not
  // requested when there is nobody to ask it about. On the PUBLIC shelf that
  // column is the identity of every member who liked every product on the
  // page, pulled through the service role into the render of an anonymous page
  // and then thrown away: `myLike` is false for every row when userId is null.
  //
  // TWO LITERAL SELECTS, not one interpolated `select(cols)`. The typed client
  // parses the column list from the string LITERAL, so a variable there
  // resolves to ParserError and every field access on the result fails to
  // compile.
  const likesQuery = userId
    ? supabase.from("forum_likes").select("post_id, user_id").in("post_id", ids)
    : supabase.from("forum_likes").select("post_id").in("post_id", ids);

  const [authorRes, likeRes, commentRes] = await Promise.all([
    preResolvedAuthors
      ? null
      : supabase
          .from("profiles")
          .select("id, full_name, photo_url, slug")
          .in("id", authorIds),
    likesQuery,
    supabase.from("forum_comments").select("post_id").in("post_id", ids),
  ]);

  const authorMap: Map<string, PostRow> =
    preResolvedAuthors ??
    new Map(
      ((authorRes?.data ?? []) as unknown as PostRow[]).map((a) => [
        a.id as string,
        a,
      ]),
    );

  const likeCount = new Map<string, number>();
  const myLikes = new Set<string>();
  ((likeRes.data ?? []) as unknown as PostRow[]).forEach((l) => {
    const k = l.post_id as string;
    likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
    // `user_id` is absent from the row when it was not selected, which is
    // exactly the case where `userId` is null and this short-circuits.
    if (userId && (l.user_id as string) === userId) myLikes.add(k);
  });

  const commentCount = new Map<string, number>();
  ((commentRes.data ?? []) as unknown as PostRow[]).forEach((c) => {
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
      // NOT NULL DEFAULT '{}' in 0076, so the coalesce is for the one case it
      // cannot cover: a row from the seatbelt's downgraded select, which has
      // no such key at all. postImages() then falls back to image_url.
      image_urls: ((p.image_urls as string[] | null) ?? []) as string[],
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

/** The kind the feed and its search never list: a product. See the header.
 *  `kind` is NOT NULL (0034), so `neq` drops nothing else. */
const FEED_EXCLUDES_KIND = "show_and_tell";

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

  const hiddenAuthors = await suspendedAuthorIds(supabase);

  const posts = await selectPosts((cols) => {
    let q = supabase
      .from("forum_posts")
      .select(cols)
      .eq("hidden", false)
      .neq("kind", FEED_EXCLUDES_KIND)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);
    // Cursor pagination: fetch the page strictly older than `before`. The
    // cursor is a created_at, and the filter below only ever REMOVES rows, so
    // over-fetching cannot make a later page skip anything.
    if (before) q = q.lt("created_at", before);
    if (hiddenAuthors.length)
      q = q.not("author_id", "in", `(${hiddenAuthors.join(",")})`);
    return q;
  });

  const rows = excluded.size
    ? posts.filter((p) => !excluded.has(p.author_id as string))
    : posts;
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
  const base = (cols: string) => {
    let b = supabase
      .from("forum_posts")
      .select(cols)
      .eq("hidden", false)
      .neq("kind", FEED_EXCLUDES_KIND)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (hiddenAuthors.length)
      b = b.not("author_id", "in", `(${hiddenAuthors.join(",")})`);
    return b;
  };

  // Four queries, so the seatbelt retries the GROUP rather than each one: a
  // missing column fails all four identically, and one re-run is cheaper (and
  // easier to read) than four independent retries racing to set the flag.
  const fanOut = (cols: string) =>
    Promise.all([
      base(cols).ilike("content", like),
      base(cols).ilike("title", like),
      base(cols).contains("tags", [q.toLowerCase()]),
      authorIds.length
        ? base(cols).in("author_id", authorIds)
        : Promise.resolve({ data: [] as PostRow[], error: null }),
    ]);

  const sets = await fanOut(POST_COLS);
  // Same reasoning as selectPosts: a failed branch of the fan-out used to
  // vanish into an empty result set. Search quietly returning nothing is
  // indistinguishable from "no matches", which is the worst way to fail.
  for (const set of sets) {
    if (set.error) console.error("[posts] search branch failed", set.error.message);
  }

  // Merge unique by id, keep newest first.
  const seen = new Map<string, PostRow>();
  for (const set of sets) {
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

// ---- The PUBLIC maker shelf (/products) -----------------------------------
//
// A product is a `forum_posts` row with kind = 'show_and_tell' AND a
// `link_url`. A product links OUT - App Store, Play Store, a web app: the deck
// card opens it in a new tab, and so does its page's "Try it" - and nothing
// here hosts, embeds or proxies anybody's product, so a show_and_tell post
// with nothing to click is not a product: it is off the shelf, and (like every
// show_and_tell) out of the feed too, so only its own page shows it. New ones
// cannot be written that way: createProductAction requires the link. Category
// lives in `tags` (lib/post-types.ts says why it is a tag and not a column)
// and is bucketed in the BROWSER, not here.
//
// -- /products IS PUBLIC, AND THAT CHANGES THE DATA PATH COMPLETELY ---------
// An anonymous visitor browses the shelf and opens someone's app straight from
// a card; signing in is what you do once you want to rate one or say something
// about it, which the deck offers when they come back from trying it.
// Three consequences, all load-bearing:
//
// 1. RLS CANNOT SERVE THIS PAGE. forum_posts, forum_comments, forum_likes and
//    profiles each have exactly ONE SELECT policy and it is `to authenticated`
//    (read out of pg_policies against the live database, not assumed). `anon`
//    has no read policy on any of them - but it DOES hold the table-level
//    SELECT grant, so PostgREST does not refuse an anonymous read: it answers
//    HTTP 200 with `[]` and `error: null`. Serving the shelf through the
//    cookie-session client would therefore render "Nothing on the shelf yet"
//    to every logged-out visitor and to Google, forever, with no error and not
//    one log line. That is the whole reason this reads through
//    createAdminClient() - the same posture app/(marketing)/p/[id] already
//    uses, and why that page works logged out.
//
// 2. SERVICE ROLE BYPASSES RLS, SO EVERY FILTER IS APPLICATION CODE. They are
//    all in this one block for that reason. A public query that forgets one
//    leaks, and nothing downstream will tell you.
//
// 3. ONE READER FOR EVERY AUDIENCE. Anonymous visitor, founder, explorer and
//    investor get the IDENTICAL row set out of this function; only `viewerId`
//    (which drives isOwn / myLike) and the blocked-pair exclusion differ. The
//    reader this replaced took the caller's client, so a signed-in member and
//    a crawler would have been served by two different code paths - and the
//    author gate below is exactly the kind of filter that lands on only one of
//    them. Members lose nothing by bypassing RLS here: forum_posts' policy is
//    `using (true)`, i.e. no row restriction at all for a member, so this path
//    applies strictly MORE filtering than the one it replaced.
//
// -- THE ROW FILTERS, AND WHAT DROPPING EACH ONE COSTS ----------------------
//   kind = 'show_and_tell'  an ordinary community post or a milestone must
//                           never reach a public page by this route.
//   hidden = false          `hidden` IS the entire moderation surface on
//                           forum_posts (migration 0043). Without it an
//                           admin-hidden product stays on a crawlable page.
//                           Not theoretical: the one show_and_tell row in the
//                           database today is the hidden one.
//   link_url is not null    see the top of this block - nothing to try is not
//                           a product.
//
// -- THE AUTHOR GATE -------------------------------------------------------
//   suspended = false       a moderated account disappears from public
//                           surfaces, and that has to take their products with
//                           them.
//   is_bot is not true      40 seeded bot profiles exist live and 3 of them are
//                           NOT suspended, so a suspended-only filter cannot
//                           see them. Every other public read in the app
//                           already excludes bots (lib/public-profile.ts,
//                           /browse, /community); the products path was the one
//                           that did not.
//   account_type='founder'  PINNED, and it is a DECISION rather than a copy of
//                           the directory allowlist. canPostProduct
//                           (lib/roles.ts) keeps explorers and investors off
//                           the shelf - but it is a TypeScript check inside a
//                           server action and RLS does NOT back it:
//                           forum_posts_insert_self's with_check is only
//                           `auth.uid() = author_id`, with no kind clause and
//                           no role clause (read out of pg_policies). So any
//                           signed-in member can POST a kind='show_and_tell'
//                           row with a link_url straight through PostgREST and
//                           publish to a crawlable page. A read-side pin is the
//                           only enforcement the public surface has, and it
//                           costs nothing today: the role transition is
//                           one-way (explorer -> founder, see
//                           app/actions/account-role.ts), so no existing
//                           product can lose its author to it.
//
// DELIBERATELY NOT PINNED: `profile_complete`. lib/public-profile.ts pins it
// because the /founders DIRECTORY is a listing of PEOPLE and a half-finished
// profile is not an entry in one. Here the author is attribution for a row
// that exists, and /p/<id> already publishes the same name and photo for any
// post author. Dropping a finished product because its maker skipped a profile
// field would punish exactly the behaviour this page is recruiting.
//
// DELIBERATELY NOT APPLIED TO AN ANONYMOUS VISITOR: the blocked-pair filter.
// There is no blocked relationship for a visitor, so getBlockedIds is not
// called with a null id - it is not called AT ALL. Called with one it would
// build `blocker_id.eq.,blocked_id.eq.`, which PostgREST rejects; the result is
// harmlessly empty but it logs an error on every public pageview and reads as
// if blocking were being honoured when the query never ran.

/**
 * Row-level filters for the shelf. `hiddenAuthors` is the id-list exclusion the
 * authenticated feed uses; the public reader passes `[]` and gates authors with
 * publicProductAuthors instead, which scales with the page rather than with the
 * number of moderated accounts.
 */
function productsQuery<C extends string>(
  supabase: DB,
  cols: C,
  hiddenAuthors: string[],
) {
  let q = supabase
    .from("forum_posts")
    .select(cols)
    .eq("kind", "show_and_tell")
    .eq("hidden", false);

  if (hiddenAuthors.length)
    q = q.not("author_id", "in", `(${hiddenAuthors.join(",")})`);

  // Applied LAST on purpose: the `(column, "is", null)` overload narrows the
  // row type, and narrowing inside a reassigned `let` makes tsc recurse
  // (TS2589, "type instantiation is excessively deep"). Order of filters on
  // the wire is irrelevant - they all become query params.
  return q.not("link_url", "is", null);
}

/**
 * The author columns a public product card may read. A strict SUBSET of
 * PUBLIC_PROFILE_COLUMNS (lib/public-profile.ts) - this module exposes nothing
 * that module does not - plus `id`, which is the map key and must NOT reach the
 * DOM: that module's rule 3 is that a public route addresses a founder by
 * `slug`, so the raw UUID never goes to the browser.
 */
const PUBLIC_AUTHOR_COLS = "id, full_name, photo_url, slug";

/**
 * The authors whose products may be published, resolved as an ALLOWLIST: the
 * returned map contains only ids positively confirmed visible, so a row whose
 * author is absent gets dropped rather than published.
 *
 * `null` means the read FAILED, and the caller must return an empty shelf.
 * That is the opposite of suspendedAuthorIds above, which fails OPEN and says
 * so - on a member feed an unfiltered render is a cosmetic regression, while
 * here it would publish a moderated account's product to anonymous traffic and
 * to a crawler. A public page that renders nothing is recoverable in an hour;
 * one that publishes a suspended member is not.
 *
 * Exported because app/sitemap.ts asks the SAME question about the SAME rows.
 * Two filtered profiles queries that can drift is how a sitemap ends up
 * advertising a URL the page itself refuses to serve.
 */
export async function publicProductAuthors(
  authorIds: string[],
): Promise<Map<string, PostRow> | null> {
  if (!authorIds.length) return new Map();
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(PUBLIC_AUTHOR_COLS)
    .in("id", authorIds)
    .eq("suspended", false)
    .not("is_bot", "is", true)
    .eq("account_type", "founder");
  if (error) {
    console.error("[posts] public author gate failed", error.message);
    return null;
  }
  return new Map(
    ((data ?? []) as unknown as PostRow[]).map((a) => [a.id as string, a]),
  );
}

/**
 * The shelf, for anybody. Newest first.
 *
 * `viewerId` is the signed-in viewer or null - it drives isOwn / myLike and
 * nothing else, so the ROWS a crawler sees and the rows a member sees are the
 * same rows. `excludeAuthorIds` should be passed ONLY when signed in (see the
 * blocked-pair note above).
 *
 * Every row carries `rating`, the PUBLIC average + count (lib/product-ratings.ts,
 * migration 0079). It is attached here and not in shapePosts because only
 * products have one: the feed and search do not read it. It is
 * identical for every audience - no viewer's own score is ever on these rows -
 * and a failed ratings read makes every row UNRATED rather than failing the
 * shelf.
 */
export async function getPublicProductsPage({
  limit = 30,
  viewerId = null,
  excludeAuthorIds,
}: {
  limit?: number;
  viewerId?: string | null;
  excludeAuthorIds?: Iterable<string>;
} = {}): Promise<ProductItem[]> {
  // Both clients are constructed without a Database generic, so this is a cast
  // across two structurally identical shapes rather than a widening.
  const admin = createAdminClient() as unknown as DB;

  const excluded =
    excludeAuthorIds instanceof Set
      ? excludeAuthorIds
      : new Set(excludeAuthorIds ?? []);

  // Flat over-fetch, not `Math.min(excluded.size, ...)` as the feed uses: TWO
  // JS-side filters drop rows here, not one. Blocked pairs cannot become a
  // query clause (the reverse direction of a block is invisible even to the
  // service role), and the author gate is deliberately resolved by the query
  // that renders the author. If both together drop more than MAX_OVERFETCH
  // rows the page comes back short, which is the honest trade for keeping the
  // gate and the render in lockstep.
  const rows = await selectPosts((cols) =>
    productsQuery(admin, cols, [])
      .order("created_at", { ascending: false })
      .limit(limit + MAX_OVERFETCH),
  );

  const unblocked = excluded.size
    ? rows.filter((p) => !excluded.has(p.author_id as string))
    : rows;

  const authorIds = Array.from(
    new Set(unblocked.map((p) => p.author_id as string)),
  );
  const authors = await publicProductAuthors(authorIds);
  if (!authors) return [];

  // DEVELOPMENT ONLY (lib/test-accounts.ts): the suspended test accounts'
  // products join the shelf, so the deck and its review modal can be tried
  // against a real row. devTestAuthorIds() is the empty Set in a production
  // build before it reads anything, so this adds nothing there. It sits HERE
  // and not inside publicProductAuthors because app/sitemap.ts calls that one,
  // and the sitemap must not widen. A failed read adds nobody.
  const devTestIds = await devTestAuthorIds(
    authorIds.filter((id) => !authors.has(id)),
  );
  if (devTestIds.size) {
    const { data } = await admin
      .from("profiles")
      .select(PUBLIC_AUTHOR_COLS)
      .in("id", [...devTestIds]);
    for (const a of (data ?? []) as unknown as PostRow[]) {
      authors.set(a.id as string, a);
    }
  }

  const visible = unblocked
    .filter((p) => authors.has(p.author_id as string))
    .slice(0, limit);

  // In parallel: the ratings read needs only the ids, which the gate above has
  // already settled, so it never sees a row the shelf is about to drop.
  const [shaped, ratings] = await Promise.all([
    shapePosts(admin, visible, viewerId, authors),
    getProductRatings(visible.map((p) => p.id as string)),
  ]);
  return shaped.map((p) => ({ ...p, rating: ratings.get(p.id) ?? UNRATED }));
}
