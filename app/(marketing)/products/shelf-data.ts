// The shelf's rows and the shelf's metadata, shared by the two routes that can
// render it: /products always, and / once the shelf can carry the front door.

import { cache } from "react";
import type { Metadata, ResolvingMetadata } from "next";
import { getUser } from "@/lib/auth";
import { getBlockedIds } from "@/lib/blocking";
import { getPublicProductsPage } from "@/lib/posts";
import { productFixtures } from "./fixtures";
import { webUrl } from "./product-view";

/**
 * How much of the shelf one request fetches, and therefore how much the
 * client-side filter can see.
 *
 * 200, not the query's default 30, because the category filter sees only what
 * was FETCHED — anything the server did not send is invisible to every filter
 * and cannot earn its category a chip. The full argument, including the point
 * at which this design has to be replaced rather than tuned, is in
 * ./filter-context.tsx. In short:
 * exact while the shelf is <= 200 products; today it holds zero real ones.
 */
const PRODUCT_SHELF_LIMIT = 200;

/**
 * How many products the shelf needs before / serves it instead of the pitch.
 *
 * 3 because a deck of fewer is over before it reads as a deck: the top card and
 * the two peeking behind it are what make it one, and with less the visitor's
 * first swipe is already the end state. The shelf is the requirement, but at
 * zero — the live database today — cofoundee.co's front door would say "0
 * products, nobody has put anything here" to every visitor. Compared against
 * what the page actually SHOWS, so dev with fixtures takes the same arm a
 * production shelf of that size would, and the third real product flips / with
 * no deploy. app/sitemap.ts reads this too, against real rows only.
 */
export const FRONT_DOOR_MIN_PRODUCTS = 3;

/**
 * The shelf for this request, read once however many callers ask. Every row
 * carries `link`, the outcome of webUrl(), and `rating`, the public
 * `{ average, count }` — getPublicProductsPage attaches it to real rows (and
 * makes them UNRATED if the ratings read fails), and each fixture carries its
 * own.
 *
 * THAT PARSE IS THE ONE DEFINITION OF A SHELF PRODUCT. It runs here, on the one
 * array everything else reads, so the deck, the category filter's chips,
 * FRONT_DOOR_MIN_PRODUCTS and generateMetadata cannot disagree: the filter
 * cannot offer a "Game" chip over an empty games deck. app/sitemap.ts applies
 * the same parse to its own rows.
 *
 * ZERO ARGUMENTS, and that is load-bearing: React's cache() keys on argument
 * identity, so accepting the blocked Set or an options object would give
 * generateMetadata and the page body one read each.
 */
export const getShelfProducts = cache(async () => {
  const user = await getUser();

  // Blocked pairs disappear from each other everywhere, and the feed already
  // honours this (see /community). A blocked member's product leading this
  // deck would be the block half-working, which is worse than not shipping it.
  //
  // SKIPPED ENTIRELY when there is no user, rather than called with a nullish
  // id. There is no "blocked" relationship for an anonymous visitor, so the
  // read has nothing to mean — and getBlockedIds interpolates the id straight
  // into a PostgREST filter (lib/blocking.ts), so `""` builds
  // `blocker_id.eq.,blocked_id.eq.`, which PostgREST rejects. The result would
  // be a harmless empty Set, but it logs an error on every public pageview and
  // reads as if blocking were being honoured when the query never ran.
  const blocked = user ? await getBlockedIds(user.id) : new Set<string>();

  // THE PUBLIC READER, for every audience — see lib/posts.ts for the full
  // argument. The short version: forum_posts, profiles, forum_likes and
  // forum_comments are all `to authenticated` with no anon policy, but `anon`
  // DOES hold the table-level SELECT grant, so reading this page through
  // `supabase` (the cookie-session client) does not error for a logged-out
  // visitor — it returns `[]` with `error: null` and renders "Nothing on the
  // shelf yet" to the entire internet, silently, forever. getPublicProductsPage
  // goes through the service role and re-applies every filter in application
  // code, including the author gate (suspended / is_bot / account_type) that
  // RLS was never doing here anyway.
  //
  // `viewerId` is the ONLY thing identity changes about the result: it drives
  // isOwn and myLike. The ROWS are the same for a crawler and for a member, on
  // purpose — one reader, so a filter cannot land on only one audience.
  //
  // In DEVELOPMENT ONLY those rows also include the products of the three
  // suspended test accounts (lib/test-accounts.ts) — real rows, so unlike the
  // fixtures below their review modal really saves. Nothing in a production
  // build.
  //
  // No `category` and no counts: the whole shelf comes back and the category
  // filter's chips are worked out in the browser from exactly what is on this
  // page. A server-side tally over a separate capped scan would promise cards
  // the client does not have. The reasoning, the single-select rule and the
  // scale at which this stops being the right design all live in
  // ./filter-context.tsx.
  const real = await getPublicProductsPage({
    viewerId: user?.id ?? null,
    excludeAuthorIds: blocked,
    limit: PRODUCT_SHELF_LIMIT,
  });

  // DEV ONLY — productFixtures() returns [] in a production build, so this
  // whole block collapses to `shown = real` there. See ./fixtures.ts for why
  // the samples are a module rather than rows with a `test` column.
  //
  // They are merged AFTER the query, so they go through the same client-side
  // bucketing as a real row and earn their category a chip like one. A fixture
  // that did not count toward its own category would make the page lie about
  // itself: its chip would be missing while its card sat in the deck.
  return [...real, ...productFixtures()].flatMap((post) => {
    const link = webUrl(post.link_url);
    return link ? [{ ...post, link }] : [];
  });
});

/** The one decision about which arm / is on. Costs no read of its own. */
export async function frontDoorServesShelf(): Promise<boolean> {
  return (await getShelfProducts()).length >= FRONT_DOOR_MIN_PRODUCTS;
}

// The English source, not tServer: this is what a crawler and a link preview
// should get regardless of which locale cookie happened to be on the request.
// The page BODY is still translated normally.
const SHELF_TITLE = "Products — try what the Thai startup community built";
const SHELF_DESCRIPTION =
  "Apps, games and tools made by founders in the Cofoundee community. Browse the shelf, open one and try the real thing — no signup needed.";
const SHELF_SHARE_DESCRIPTION =
  "Apps, games and tools made by founders in the Cofoundee community. Every card opens the real thing, one tap away.";

/**
 * Metadata for either route the shelf renders on. `canonical` is "/" whenever
 * / is serving the shelf, so the two URLs do not compete for one page.
 *
 * NEXT MERGES SHALLOWLY, and the root layout's blocks are the reason this is
 * longer than it looks. A page-level `openGraph` replaces the inherited one
 * whole, including the image from app/opengraph-image.tsx, which is how
 * /products shipped with `twitter:card=summary_large_image` and no picture. So
 * the fields that are not this page's to change are carried over from `parent`
 * (not rewritten by hand: that object holds the image's content hash and
 * dimensions). `twitter` is restated because the root layout sets its own title
 * and description there, and those would otherwise sit under this page's og
 * tags saying something else; it omits `images` so Next fills them from og.
 */
export async function shelfMetadata(
  canonical: "/" | "/products",
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const og = (await parent).openGraph;
  return {
    title: SHELF_TITLE,
    description: SHELF_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: SHELF_TITLE,
      description: SHELF_SHARE_DESCRIPTION,
      url: canonical,
      type: "website",
      siteName: og?.siteName ?? undefined,
      locale: og?.locale,
      alternateLocale: og?.alternateLocale,
      images: og?.images,
    },
    twitter: {
      card: "summary_large_image",
      title: SHELF_TITLE,
      description: SHELF_SHARE_DESCRIPTION,
    },
  };
}
