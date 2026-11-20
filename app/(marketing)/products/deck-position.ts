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
// TRIES a product — right swipe, →, "Try" — the deck rewrites its own history
// entry to `?after=<that product's id>` (replaceState: no new entry). The
// maker's site opens in a NEW TAB and this tab stays on the deck, which moves
// on; the address now says so, so a reload lands on the card the reader is
// looking at.
//
// A tap on the card, its ↑ button and its rating row are not a try: they open
// the product's own page in a MODAL over the deck (./ProductModal.tsx), at
// `?product=<id>` on this same address, pushed so Back closes it. That writes
// no `after`, and the deck under the modal does not move: closing it lands on
// the same card. Opening /products/<id> as a page (a middle-click, a shared
// link) still comes back through its own back link, below.
//
// A left swipe only advances the deck. Trying or liking a product saves its
// position in the URL. A card link can also open the deck at a specific product.
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
// Older sign-in links open the review once, then remove the parameter.
//
// ── HOW THE PRODUCT PAGE KNOWS WHERE "BACK" IS ─────────────────────────────
// The deck's row links to `/products/<id>?from=products&category=game` (or
// `from=home` on /). The product page never echoes those values: it maps
// `from` to one of the two deck routes it knows and re-parses `category` with
// the deck's own parser, then builds its back link here. Anything else, or
// nothing, is /products. So the parameter cannot be used to point the link
// anywhere else.

import { productPath } from "@/lib/post-types";
import { PARAM, parseCategoryParam, type FilterBucket } from "./categories";

/** On the deck: `?after=<product id>`, the last product the reader opened. */
export const AFTER_PARAM = "after";
export const CARD_PARAM = "card";

/** On a product's page: `?from=products` or `?from=home`, the deck it came from. */
export const FROM_PARAM = "from";

/** On the deck, once: `?review=<product id>`, the review modal to open. */
export const REVIEW_PARAM = "review";

export const VIEW_PARAM = "view";
export type ProductView = "single" | "grid";
export const SORT_PARAM = "sort";
export type ProductSort = "newest" | "rating" | "likes";
type QueryValue = string | readonly string[] | undefined;

export type DeckSearch = {
  from?: QueryValue;
  category?: QueryValue;
  view?: QueryValue;
  sort?: QueryValue;
};

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

function first(raw: QueryValue): string | undefined {
  return typeof raw === "string" ? raw : raw?.[0];
}

export function parseProductView(raw: string | readonly string[] | undefined): ProductView {
  return first(raw) === "grid" ? "grid" : "single";
}

export function parseProductSort(raw: QueryValue): ProductSort {
  const value = first(raw);
  return value === "rating" || value === "likes" ? value : "newest";
}

export function setProductGridParams(
  query: URLSearchParams,
  view: QueryValue,
  sort: QueryValue,
) {
  if (parseProductView(view) !== "grid") return;
  query.set(VIEW_PARAM, "grid");
  const order = parseProductSort(sort);
  if (order === "newest") query.delete(SORT_PARAM);
  else query.set(SORT_PARAM, order);
}

/** `?product=<id>`: the product open in the deck's modal (./ProductModal.tsx),
 *  on / and /products alike. */
export const PRODUCT_PARAM = "product";

/**
 * `?product=` as a product id, or null. Unlike `after`, this one IS fetched
 * (./ProductShelf.tsx renders the product), so it must have the shape of a
 * real id before any query sees it: a uuid, or a dev fixture's `fixture-…` id
 * (./fixtures.ts).
 */
export function parseProductParam(
  raw: string | readonly string[] | undefined,
): string | null {
  const value = first(raw);
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^fixture-[a-z0-9-]{1,48}$/.test(value)
    ? value
    : null;
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

/** Where a deck starts: AT `?product=` when that product is on it — a
 *  shared or reloaded address with its modal open, so closing the modal
 *  lands on that very card — and otherwise after `?after=` (resumeIndex). */
export function startIndex(
  products: readonly { id: string }[],
  after: string | null,
  product: string | null,
): number {
  if (product) {
    const i = products.findIndex((p) => p.id === product);
    if (i !== -1) return i;
  }
  return resumeIndex(products, after);
}

/** `?product=` as the browser's address has it, through the same parser
 *  the server uses. Browser-only. */
export function readProductFromAddress(): string | null {
  return parseProductParam(
    new URLSearchParams(window.location.search).getAll(PRODUCT_PARAM),
  );
}

export function readCardFromAddress(): string | null {
  return parseProductParam(new URLSearchParams(window.location.search).getAll(CARD_PARAM));
}

/** Open the swipe deck at this product, with no detail dialog over it. */
export function productCardHref(id: string): string {
  return `/products?${new URLSearchParams({ [CARD_PARAM]: id })}`;
}

/** A product's page as the deck links to it. */
export function productPageHref(
  id: string,
  route: DeckRoute,
  category: FilterBucket | null,
  view: ProductView = "single",
  sort: ProductSort = "newest",
): string {
  const query = new URLSearchParams({ [FROM_PARAM]: fromValue(route) });
  if (category) query.set(PARAM, category);
  setProductGridParams(query, view, sort);
  return `${productPath(id)}?${query}`;
}

/**
 * The product page's back link: to the card after this product, in the deck
 * and category the reader came from, or to /products when they did not come
 * from a deck. A SIGNED-IN reader always goes back to /products: proxy.ts
 * sends a member asking for / to their own home, so "/" would not be the deck
 * for them.
 */
export function deckReturnHref(
  search: DeckSearch,
  productId: string,
  signedIn: boolean,
): string {
  const route = routeOf(first(search.from));
  if (!route) return "/products";
  const query = new URLSearchParams();
  const category = parseCategoryParam(search.category);
  if (category) query.set(PARAM, category);
  if (parseProductView(search.view) === "grid") setProductGridParams(query, search.view, search.sort);
  else query.set(AFTER_PARAM, productId);
  return `${signedIn ? "/products" : route}?${query}`;
}

/** The deck-context part of a product page's address, rebuilt from parsed
 *  values, for a redirect that must keep it (an old /p/<id> or
 *  /community/<id> product link -> /products/<id>) and for the sign-in links
 *  on that page. */
export function deckContextQuery(search: DeckSearch): string {
  const route = routeOf(first(search.from));
  if (!route) return "";
  const query = new URLSearchParams({ [FROM_PARAM]: fromValue(route) });
  const category = parseCategoryParam(search.category);
  if (category) query.set(PARAM, category);
  setProductGridParams(query, search.view, search.sort);
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
 * Set or reset this history entry's deck position. replaceState adds no entry,
 * and Next
 * documents the native history methods as integrating with its router
 * (linking-and-navigating.md, "Native History API"). A no-op when the address
 * already says it.
 */
export function writeAfterToAddress(productId: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.delete(CARD_PARAM);
  if (productId) url.searchParams.set(AFTER_PARAM, productId);
  else url.searchParams.delete(AFTER_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) {
    window.history.replaceState(null, "", next);
  }
}
