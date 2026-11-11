// What the shelf is willing to read out of a product row, in one module with no
// "use client": ./shelf-data.ts, ./ProductShelf.tsx, ./ProductDetail.tsx (the
// product pages) and app/sitemap.ts all use it, and the client deck only ever
// receives what comes out of here.
//
// ── THE OUTBOUND LINK IS SECURITY-SENSITIVE ───────────────────────────────
// `link_url` is user-submitted, and on the shelf it leaves Cofoundee from two
// places: the deck card itself (a right swipe, →, "Try", a tap on the card,
// all in a new tab — ./ProductDeck.tsx) and the "Try it" button on the
// product's own page (./ProductDetail.tsx). Outside the shelf, a post's or a
// milestone's link_url is also a link in the community feed card
// (components/PostCard.tsx — products are not in the feed), and any kind's is
// on the author's profile (app/(app)/profile/[id]/page.tsx). Three things
// follow, and none of them are styling — 1 and 3 for every one of those
// links, 2 for the two on public pages (the member-only feed and profile are
// not indexed, and carry `noopener noreferrer` only):
//
//   1. `noopener` — without it the opened tab gets a live `window.opener`
//      handle back into this origin and can navigate it (reverse tabnabbing:
//      the user comes back to a login page that is not ours). `rel` on the
//      links; on the deck's window.open(), the opener severed by hand in the
//      same tick (ProductDeck's header says why it cannot be the feature).
//   2. `rel="nofollow"` — a public, indexable page (the deck, /p/<id>) must
//      not become an SEO pass-through that is worth spamming to get into.
//   3. The href is PARSED before it is rendered, and only `http:`/`https:`
//      survives. The writers validate on write today (createPostAction with
//      `^https?://`, createProductAction with that AND webUrl()), but the
//      column is plain text and predates those checks, so a `javascript:`
//      URL sitting in an older row would otherwise be a one-click script
//      injection — and on the deck it would reach window.open(). webUrl() is
//      that parse; it lives in lib/web-url.ts so the community feed and
//      profile pages, which are not shelf code, run the same one, and it is
//      re-exported here so the shelf has one name for it.
//
// THE PARSE IS ALSO WHAT MAKES SOMETHING A SHELF PRODUCT. There used to be a
// grid that kept a row with a refused link on screen as a card reading "no link
// yet". A product with nothing to try is a card that cannot do the one thing a
// card does, so a row that fails here is not on the shelf, and ./shelf-data.ts
// filters on this before anything counts it.
//
// `displayHost` and the images below go through the same parse: it is not about
// links, it is about not handing an attacker-controlled string to a renderer.

import { productRatingLabel } from "@/components/ProductRatingSummary";
import { t, type Locale } from "@/lib/i18n";
import { MAX_PRODUCT_IMAGES, postImages } from "@/lib/post-types";
import type { PostItem, ProductItem } from "@/lib/post-types";
import { webUrl } from "@/lib/web-url";
import { isFixture } from "./fixtures";

export { webUrl };

// The ONE narrow exception to that parse, and it is deliberately not inside
// webUrl() — ./fixtures.ts asks for it by name and says why the fix must not
// land there instead.
//
// The dev-only sample products draw their screenshots as inline
// `data:image/svg+xml` URIs (no files in public/, no placeholder CDN, nothing
// in the build output — see that file's header). webUrl() refuses them, as it
// should for anything out of the database, so without this every sample would
// render coverless.
//
// Three independent things have to be true before a `data:` URI renders, and
// in production the first one is already false:
//   1. not a production build — `productFixtures()` returns [] there, so this
//      branch is unreachable, and this check says so rather than relying on
//      it;
//   2. the row is a fixture — `forum_posts.id` is a uuid and cannot begin
//      "fixture-", so no database row can claim this;
//   3. the prefix is exactly `data:image/svg+xml`, which is what the
//      generator emits.
// An SVG referenced by <img>/next/image cannot execute script, and these
// bytes come from our own module rather than from a submitted field — but the
// gate is the id and the build, not the harmlessness of SVG.
const FIXTURE_IMAGE = "data:image/svg+xml";

/** An image src we are willing to render, or null. */
function imageSrc(raw: string, fixture: boolean): string | null {
  if (
    fixture &&
    process.env.NODE_ENV !== "production" &&
    raw.startsWith(FIXTURE_IMAGE)
  ) {
    return raw;
  }
  return webUrl(raw)?.toString() ?? null;
}

/**
 * What a reader is told about where a link goes.
 *
 * Read OUT on the deck card, not shown on it: the card shows only the images,
 * the description, the rating and the comment count (CLAUDE.md, "Founder
 * decision (2026-11-10)"), so the host is in the card link's and the Try
 * button's accessible name ("Try {name} on {host}"). On the product page's
 * "Try it" button (./ProductDetail.tsx) it is printed beside the button and is
 * the button's description. A visitor is about to leave for a stranger's
 * domain, `link_url` is SUBMITTED BY A MEMBER, and a phone has no status bar
 * to hover, so do not remove it from either. webUrl() is what resolves
 * `https://apps.apple.com@evil.example.com/` to evil.example.com for it.
 */
export function displayHost(link: URL): string {
  // `www.` tells the reader nothing about where they are going; the registrable
  // name is the whole signal.
  return link.hostname.replace(/^www\./, "");
}

/** The product's screenshots that survive the parse, in order, at most
 *  MAX_PRODUCT_IMAGES. The first one is the cover. Takes only the columns it
 *  reads, so the product pages' own hand-written selects can call it too. */
export function productImages(post: {
  id: string;
  image_url: string | null;
  image_urls?: string[] | null;
}): string[] {
  // Through `imageSrc()`, i.e. the same parse as the link plus the dev-fixture
  // exception above. next/image would otherwise THROW on an unconfigured host
  // (see the `unoptimized` note in components/ProductGallery.tsx), and a bad
  // image must not take the card down with it — so an unusable URL is skipped
  // rather than rendered, and a row whose only image is a bad one gets the
  // no-image card.
  //
  // Capped here as well as on write: createProductAction enforces the cap, but the
  // column is a plain text[] and the gallery mounts every entry.
  const fixture = isFixture(post.id);
  return postImages(post)
    .flatMap((raw) => {
      const src = imageSrc(raw, fixture);
      return src ? [src] : [];
    })
    .slice(0, MAX_PRODUCT_IMAGES);
}

/** The product's display name. `fallback` is already translated. */
export function productName(
  post: Pick<PostItem, "title" | "content">,
  fallback: string,
): string {
  // `title` is the product NAME per the contract, but it is nullable on
  // forum_posts, so an older show_and_tell may have none. The first non-empty
  // line of the description is the only honest fallback.
  return (
    post.title?.trim() ||
    post.content.split("\n").find((l) => l.trim())?.trim() ||
    fallback
  );
}

/**
 * The deck card's footer — its rating and its comment count — as one sentence:
 * "4.3 out of 5 from 12 ratings, 3 comments", or "No ratings yet, 0 comments".
 *
 * The accessible NAME of the card's footer row, the link to the product's
 * page: read out, the visible face is "4.3 (12) 3", so the link says this
 * instead. Both halves are words, not only digits. The rating half is the same sentence
 * <ProductRatingSummary> speaks on the product pages. Two comment keys because
 * English pluralises and Thai does not; the joining key because Thai does not
 * join a list with a comma.
 */
export function cardFooterLabel(post: ProductItem, locale: Locale): string {
  const comments = t(
    post.commentCount === 1 ? "{n} comment" : "{n} comments",
    locale,
  ).replace("{n}", post.commentCount.toLocaleString("en-US"));
  return t("{rating}, {comments}", locale).replace(
    /\{(rating|comments)\}/g,
    (_, key) =>
      key === "rating" ? productRatingLabel(post.rating, locale) : comments,
  );
}
