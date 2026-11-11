// Where the deck is, and how a reader gets back to it: from a product's page,
// and from signing in.
//
// No "use client": the SERVER reads `?after=` so a deck reloaded at that address
// paints the right card first, the product pages build their back link here,
// and the client deck reads and writes the same parameters through the same
// parser.
//
// ── THE POSITION LIVES IN THE ADDRESS, AND NOWHERE ELSE ────────────────────
// CLAUDE.md, Language Rules: the swipe itself stores, counts and shows
// nothing. "Where the reader is" therefore lives only in the address — no
// localStorage, no sessionStorage, no cookie, no row. The moment a reader
// OPENS a product, the deck rewrites its own history entry to
// `?after=<that product's id>` (replaceState: no new entry). Opening a product
// is either of two things, and both write it:
//   * TRYING it — right swipe, →, "Try", a tap on the card's images or
//     description. The maker's site opens in a NEW TAB and this tab stays on
//     the deck, which moves on; the address now says so, so a reload lands on
//     the card the reader is looking at.
//   * its PAGE — the card's rating-and-comments row, a same-tab link to
//     /p/<id>. Browser Back, a phone's swipe-back and that page's own back
//     link all arrive at the rewritten address, and the deck starts at the
//     card after it.
//
// A skip writes nothing. A left swipe changes the screen and nothing else; the
// address learns a position only when a product is opened, which is the one
// moment the reader will want to come back to.
//
// Decided, not discovered:
//   * a fresh visit — a typed /products, a nav link, a shared /products link —
//     carries no `after` and starts at card 1. That includes a soft
//     navigation that only drops `after` (the sidebar's Products link while on
//     /products?after=…): the deck re-reads the address and restarts.
//   * a RELOAD of an address that carries one resumes after that product:
//     reload re-reads the address, and the address is the only place the
//     position is. Cards skipped since then are not in it, so a reload lands
//     after the last product OPENED, not the last card seen.
//   * a change of category, and "Start over", drop `after`: both restart.
//   * an `after` naming a product that is not in this deck (removed since, or
//     under another category) is ignored, and the deck starts at card 1.
//
// ── `?review=` BRINGS A NEW MEMBER BACK TO THE PRODUCT THEY TRIED ──────────
// A visitor who is not signed in, back from trying X, is offered sign-in once
// (./DeckPrompts.tsx). Its links carry `next=` deckReviewPath(): this deck at
// /products — never /, which sends a signed-in member to their own home —
// with the category, `after=X` (the card they were looking at), and
// `review=X`. Signed in, the deck opens X's review modal from that parameter
// and removes it with replaceState at once, so a reload or a Back does not
// open it a second time. Like `after`, it is only ever compared against the
// ids already on the deck.
//
// ── HOW THE PRODUCT PAGE KNOWS WHERE "BACK" IS ─────────────────────────────
// The deck's row links to `/p/<id>?from=products&category=game` (or
// `from=home` on /). The product page never echoes those values: it maps
// `from` to one of the two deck routes it knows and re-parses `category` with
// the deck's own parser, then builds its back link here. Anything else, or
// nothing, is /products. So the parameter cannot be used to point the link
// anywhere else.

import type { ProductCategory } from "@/lib/post-types";
import { PARAM, parseCategoryParam } from "./categories";

/** On the deck: `?after=<product id>`, the last product the reader opened. */
export const AFTER_PARAM = "after";

/** On a product's page: `?from=products` or `?from=home`, the deck it came from. */
export const FROM_PARAM = "from";

/** On the deck, once: `?review=<product id>`, the review modal to open. */
export const REVIEW_PARAM = "review";

/** The two routes that render the deck. */
export type DeckRoute = "/" | "/products";

function fromValue(route: DeckRoute): string {
  return route === "/" ? "home" : "products";
}

function routeOf(from: string | undefined): DeckRoute | null {
  if (from === "home") return "/";
  if (from === "products") return "/products";
  return null;
}

function first(raw: string | readonly string[] | undefined): string | undefined {
  return typeof raw === "string" ? raw : raw?.[0];
}

/**
 * `?after=` as a product id, or null. The shape check is not about trust (the
 * value is only ever compared against the ids already on the deck, never
 * rendered or fetched): it keeps a mangled address from being carried around.
 * A uuid, or a dev fixture's `fixture-…` id.
 */
export function parseAfterParam(
  raw: string | readonly string[] | undefined,
): string | null {
  const value = first(raw);
  return value && /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : null;
}

/** Where a deck of `products` starts, given `?after=`: the card after that
 *  product, or the first card. Past the last card is the end state. */
export function resumeIndex(
  products: readonly { id: string }[],
  after: string | null,
): number {
  if (!after) return 0;
  const i = products.findIndex((p) => p.id === after);
  return i === -1 ? 0 : i + 1;
}

/** A product's page as the deck links to it. */
export function productPageHref(
  id: string,
  route: DeckRoute,
  category: ProductCategory | null,
): string {
  const query = new URLSearchParams({ [FROM_PARAM]: fromValue(route) });
  if (category) query.set(PARAM, category);
  return `/p/${encodeURIComponent(id)}?${query}`;
}

/**
 * The product page's back link: to the card after this product, in the deck
 * and category the reader came from, or to /products when they did not come
 * from a deck. A SIGNED-IN reader always goes back to /products: proxy.ts
 * sends a member asking for / to their own home, so "/" would not be the deck
 * for them.
 */
export function deckReturnHref(
  search: { from?: string | string[]; category?: string | string[] },
  productId: string,
  signedIn: boolean,
): string {
  const route = routeOf(first(search.from));
  if (!route) return "/products";
  const query = new URLSearchParams();
  const category = parseCategoryParam(search.category);
  if (category) query.set(PARAM, category);
  query.set(AFTER_PARAM, productId);
  return `${signedIn ? "/products" : route}?${query}`;
}

/**
 * Where the sign-in prompt's links bring a reader back to: the deck at
 * /products, on the category they were browsing, at the card after `productId`,
 * with that product's review modal to open. Rebuilt from parsed values only.
 */
export function deckReviewPath(
  productId: string,
  category: ProductCategory | null,
): string {
  const query = new URLSearchParams();
  if (category) query.set(PARAM, category);
  query.set(AFTER_PARAM, productId);
  query.set(REVIEW_PARAM, productId);
  return `/products?${query}`;
}

/** The deck-context part of a product page's address, rebuilt from parsed
 *  values, for a redirect that must keep it (/p/<id> -> /community/<id>) and
 *  for the sign-in links on that page. */
export function deckContextQuery(search: {
  from?: string | string[];
  category?: string | string[];
}): string {
  const route = routeOf(first(search.from));
  if (!route) return "";
  const query = new URLSearchParams({ [FROM_PARAM]: fromValue(route) });
  const category = parseCategoryParam(search.category);
  if (category) query.set(PARAM, category);
  return `?${query}`;
}

// ── Client only ────────────────────────────────────────────────────────────

/** `?after=` as the address says it right now. */
export function readAfterFromAddress(): string | null {
  return parseAfterParam(
    new URLSearchParams(window.location.search).getAll(AFTER_PARAM),
  );
}

/**
 * `?review=` as the address says it right now, REMOVED from the address in the
 * same call (replaceState, every other parameter and the hash left alone), so
 * it is acted on once. Null when there is none, or when it is not an id.
 */
export function takeReviewFromAddress(): string | null {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(REVIEW_PARAM)) return null;
  const value = parseAfterParam(url.searchParams.getAll(REVIEW_PARAM));
  url.searchParams.delete(REVIEW_PARAM);
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  return value;
}

/**
 * Set `?after=` on THIS history entry (null removes it), leaving every other
 * parameter and the hash alone. replaceState, so it adds no entry, and Next
 * documents the native history methods as integrating with its router
 * (linking-and-navigating.md, "Native History API"). A no-op when the address
 * already says it.
 */
export function writeAfterToAddress(productId: string | null) {
  const url = new URL(window.location.href);
  if (productId) url.searchParams.set(AFTER_PARAM, productId);
  else url.searchParams.delete(AFTER_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) {
    window.history.replaceState(null, "", next);
  }
}
