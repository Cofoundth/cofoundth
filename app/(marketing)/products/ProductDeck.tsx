"use client";

// In the product deck, left skips. Right opens the product or offers its QR
// handoff and saves a like for members. The Try button opens the same destination.
//
// ── THE PRODUCT'S PAGE, IN A MODAL ─────────────────────────────────────────
// A tap on the card means "tell me more", not "take me there" (the founder's
// call, 2026-11-18: it used to open the maker's site). So a tap on the card,
// its ↑ button, ↑ on the deck and the card's footer (the rating and the
// comment count) all open the product's own page, every comment and the
// stars included, in a modal over the deck: `?product=<id>` pushed onto this
// address, which ./ProductShelf.tsx renders with ./ProductModal.tsx (the
// header there says why a parameter and not an intercepted route). The deck
// is locked while it is up and while it opens, writes no `after` for it, and
// does not move: closing the modal lands on the same card.
//
// Every one of those controls is still a real link to /products/<id>, so a
// tap before hydration, a middle-click or "open in new tab" opens the page
// itself; only a plain click becomes the modal. The footer and the ↑ sit
// ABOVE the card's link (z-20 against z-10, siblings in the DOM — see THE
// CARD'S TWO LINKS), and a press on either never starts a swipe
// ([data-deck-nodrag]).
//
// ── COMING BACK RESUMES THE DECK ───────────────────────────────────────────
// Trying or liking a product writes `?after=<id>` to this history entry,
// so a reload lands on an address that says where the reader was, and
// the stack starts at the card after it. The address is the only place the
// position is kept; ./deck-position.ts has the whole argument, including what
// a reload does. Opening the modal writes nothing (above).
//
// The stack re-reads the address whenever the router's search params change,
// and moves only when `after` there differs from what the deck itself last
// wrote or read. So the deck's own writes never move it, while a soft
// navigation that changes only the query — the sidebar's Products link from
// /products?after=…, which keeps this page mounted — restarts it, as a fresh
// visit should.
//
// ── THE CATEGORY FILTER DRIVES THE DECK ────────────────────────────────────
// A product the filter excludes is NOT RENDERED rather than hidden with a
// class. A hidden card is still in the accessibility tree and still counts
// toward the deck's "{n} of {total}" unless something remembers to subtract
// it; an absent one cannot disagree with the total. The server assigns each
// card its `bucket` with productBucketOf().
//
// Each category is its own deck: the stack below is KEYED on it, so changing
// the category is a remount. That is what restarts at the first match (the
// filter drops `?after=` from the address before the remount reads it), and it
// cancels a drag or a fly-out in flight without a reset path that has to
// remember every ref. The live region sits outside the key because a live
// region that mounts with its text already in it is not announced, and the new
// first product has to be. So do the prompts: a modal is not closed by a
// change of category, and "once per visit" is not reset by one.
//
// ── THE STACK IS WRITTEN IN TWO PLACES, ON PURPOSE ─────────────────────────
// React sets the resting stack positions before hydration. During a drag we
// write transforms directly to the mounted cards once per frame, so moving
// the stack does not update an inherited CSS variable on every descendant.
//
// ── THE GESTURE ────────────────────────────────────────────────────────────
//   touch action           The phone card owns single-finger gestures. On
//                          desktop the browser can still claim a vertical pan.
//   capture after the lock Never on pointerdown: a mouse press captured to the
//                          card delivers its click to the card, so the real
//                          link would stop working on a plain tap. A TOUCH
//                          press is already captured, to what it landed on: the
//                          card's link, or the image zone inside it. Moving
//                          it to the card fires lostpointercapture at that
//                          element, and it bubbles, so only the card's own loss
//                          means the gesture is over.
//   window listeners       Until the lock a mouse is not captured, and a press
//                          near the edge can leave the card within those few
//                          pixels.
//   no drag from a control [data-deck-nodrag]: the footer row is its own
//                          destination and the gallery's arrows are controls,
//                          so a press on either never starts a swipe.
//   the click a drag       A drag ends with a click on the link under it;
//   leaves behind          onClickCapture swallows that one click, so a swipe
//                          is never also a tap, and never opens a second tab.
//   `locked`               While a prompt's modal is open, keys, presses and
//                          clicks on the deck do nothing.
//
// ── WHAT THE CARD SHOWS ────────────────────────────────────────────────────
// Images, description, rating, comment count, and a Mobile only badge where
// applicable. The title and maker are visible at every size.
//
// ── THE CARD'S TWO LINKS ───────────────────────────────────────────────────
// The stretched-link pattern, because the card holds a second control (the
// footer row), the ↑ and the gallery controls, and neither a link nor a
// button can nest in <a>. ONE absolutely-positioned <a> to the product's page
// covers the card at `z-10`. The footer link, the ↑ and desktop arrows sit at
// `z-20`. On phones the gallery gets tap zones above the stretched link
// and below the ↑. Keeping these controls outside the link lets each handle
// its own click, and the card still handles swipes.
//
// The stretched <a> is the FIRST thing in the card on purpose: tab order is DOM
// order, and the primary destination should not be the last stop.
//
// ── THE GALLERY ────────────────────────────────────────────────────────────
// The top card's screenshots change with tap zones or desktop arrows. Cards
// behind paint their first image only, and the next card preloads the rest.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  SearchX,
  Smartphone,
  Star,
  X,
} from "lucide-react";
import { likeProductAction } from "@/app/(app)/community/[id]/actions";
import { ProductGallery } from "@/components/ProductGallery";
import { Avatar } from "@/components/Avatar";
import { ProductGridCard } from "@/components/ProductGridCard";
import { CURATED_PRODUCT_LABEL } from "@/lib/curated-products";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import {
  Button,
  Card,
  CardChip,
  EmptyState,
  LinkButton,
  buttonClasses,
  cn,
} from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";
import { FEATURES } from "@/lib/features";
import { useLocale } from "@/lib/i18n-client";
import type { ProductRating } from "@/lib/post-types";
import type { ProductStoreLinks } from "@/lib/product-store-links";
import { LIKED_PRODUCTS_PATH } from "@/lib/roles";
import type { FilterBucket } from "./categories";
import {
  PRODUCT_PARAM,
  SORT_PARAM,
  parseProductSort,
  productPageHref,
  readAfterFromAddress,
  readCardFromAddress,
  readProductFromAddress,
  setProductGridParams,
  startIndex,
  writeAfterToAddress,
  type DeckRoute,
} from "./deck-position";
import {
  DeckProductTry,
  useProductPrompts,
  type DeckViewer,
  type ProductTry,
  type ProductTryOptions,
  type PromptProduct,
} from "./DeckPrompts";
import { useProductFilter } from "./filter-context";
import {
  clearOpenedFromDeck,
  markOpenedFromDeck,
  takeOpenedFromDeck,
} from "./product-modal-state";
import { PhoneHandoffDialog, needsPhone } from "./PhoneHandoff";
import { ProductDetailsSkeleton } from "./ProductDetailsSkeleton";
import { ProductModal } from "./ProductModal";
import { useProductView } from "./ProductShelfView";
import type { PhonePlatform } from "./product-view";

export type DeckProduct = PromptProduct & {
  /** Which category it is filed under, from productBucketOf() on the server. */
  bucket: FilterBucket;
  /** Used in the card link, announcements, and prompt titles. */
  name: string;
  maker: { name: string; avatarUrl: string | null } | null;
  curated?: boolean;
  platformLabels: readonly string[];
  blurb: string;
  isOwn: boolean;
  /** The maker's product, already through webUrl(). Never a raw link_url. */
  href: string;
  /** Where `href` goes, for the phone handoff's "Open {host} here instead". */
  host: string;
  /** The phones it ONLY runs on, or [] when it opens anywhere: a computer
   *  pressing "Try" on a phone app gets ./PhoneHandoff.tsx's code to scan
   *  instead of a store page (the owner's call, 2026-11-12). */
  phones: readonly PhonePlatform[];
  storeLinks: ProductStoreLinks;
  mobileOnly: boolean;
  /** "Try {name} on {host}": the accessible name of the Try button. Starts
   *  with the button's visible word, because a voice-control user says what
   *  they see (WCAG 2.5.3). */
  tryAria: string;
  /** "More about {name}": the card's link and its ↑, which have no visible
   *  text and open the product's page in the modal. */
  moreAria: string;
  /** Every image, in order, already through ./product-view.ts's image parse and
   *  capped at MAX_PRODUCT_IMAGES. [] for a product with no screenshots. */
  images: readonly string[];
  /** The PUBLIC aggregate, the same for every audience. */
  rating: ProductRating;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  /** The footer said as one sentence: "4.3 out of 5 from 12 ratings, 3
   *  comments". The footer link's accessible name. */
  footerAria: string;
};

type ProductDeckLabels = {
  productFallback: string;
  closeDetails: string;
  discardComment: string;
  deckName: string;
  skip: string;
  like: string;
  tryIt: string;
  /** "{name}, {n} of {total}", announced to screen readers only. */
  position: string;
  endTitle: string;
  startOver: string;
  /** null unless the reader is logged out. */
  join: string | null;
  noneHereTitle: string;
  noneHereBody: string;
  mobileOnly: string;
  /** Sets the filter back to "All". */
  seeEverything: string;
  /** The gallery's < and >, which have no visible text. */
  previousImage: string;
  nextImage: string;
  /** The same < and > on a computer's card, which move four at a time. */
  previousGroup: string;
  nextGroup: string;
};

/** The top card and the two behind it. */
const MOUNTED = 3;
/** Travel before a press is read as a horizontal or a vertical gesture. */
const LOCK_PX = 8;

function swipeAxis(dx: number, dy: number, touch: boolean): "x" | "y" | null {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) < LOCK_PX) return null;
  if (!touch) return x >= y ? "x" : "y";
  if (x >= LOCK_PX && x >= y) return "x";
  // Let a diagonal touch settle before giving up on a horizontal swipe.
  return y >= 2 * LOCK_PX && y > 1.5 * x ? "y" : null;
}
/** Share of the card's width that commits a slow drag. */
const COMMIT_RATIO = 0.3;
const FLICK_PX_PER_MS = 0.5;
/** A flick still has to move the card, or a twitch on release would commit. */
const FLICK_MIN_PX = 24;
const VELOCITY_WINDOW_MS = 100;
const MAX_TILT_DEG = 8;
const FLY_MS = 260;
const SPRING_MS = 200;

/** Every link out to a maker's site. ./product-view.ts says why each word. */
const LINK_REL = "noopener noreferrer nofollow";

/**
 * The shelf sizes itself to the viewport and the stage takes whatever
 * the filter and the buttons leave, so the card's size comes from the screen,
 * never from its content, and a card change never moves the page. Its pictures
 * are letterboxed over a blurred copy of themselves (ProductGallery `backdrop`),
 * because a box this size has no fixed shape to crop to.
 *
 * On phones the summary takes its natural height and the gallery fills the
 * remaining space, without a nested scroll area for the summary. On wide screens
 * the summary takes roughly 38% of the width beside the gallery. Short wide
 * cards give the copy more width and use the compact stats row.
 * ./loading.tsx draws the same panel and the compact band used on phones.
 */
const CARD_BODY =
  "flex max-h-[calc(100%_-_4rem)] min-h-0 shrink-0 flex-col gap-2 p-3 sm:gap-3 sm:p-5 deck-touch:max-h-none deck-wide:max-h-none deck-wide:w-(--deck-panel-width) deck-wide:justify-center deck-wide:gap-3 deck-wide:p-(--deck-panel-inset) deck-wide:short:gap-2 deck-wide:short-landscape:gap-1.5";

/** A big card would need a long drag to commit, and would swing its corners a
 *  long way at full tilt: both are measured against at most this width. */
const COMMIT_BASIS_MAX_PX = 480;
const TILT_REFERENCE_PX = 400;

/** The most a card this wide leans: MAX_TILT_DEG for a phone-sized card, less
 *  for a wide one. */
function maxTiltFor(width: number): number {
  return MAX_TILT_DEG * Math.min(1, TILT_REFERENCE_PX / Math.max(width, 1));
}

type Gesture = {
  pointerId: number;
  element: HTMLElement;
  cards: HTMLElement[];
  likeHint: HTMLElement | null;
  skipHint: HTMLElement | null;
  startX: number;
  startY: number;
  lock: "x" | "y" | null;
  /** The x the drag is measured from, once locked. */
  originX: number;
  dx: number;
  /** What the commit distance is a share of: the card's width, capped. */
  width: number;
  /** maxTiltFor() the card. */
  tilt: number;
  samples: { x: number; t: number }[];
  reducedMotion: boolean;
  listeners: AbortController;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Depth order, because the cards render top first. */
function stackOf(stage: HTMLElement | null): HTMLElement[] {
  return Array.from(
    stage?.querySelectorAll<HTMLElement>("[data-deck-card]") ?? [],
  );
}

function stackTransform(depth: number): string {
  return `translate3d(0, ${depth * 10}px, 0) scale(${1 - depth * 0.04})`;
}

function clearHints(card: HTMLElement) {
  for (const hint of card.querySelectorAll<HTMLElement>("[data-deck-hint]")) {
    hint.style.opacity = "";
  }
}

function releaseVelocity(samples: Gesture["samples"], now: number): number {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  return last.t === first.t ? 0 : (last.x - first.x) / (last.t - first.t);
}

/** One pass, so a product called "{n}" cannot be substituted into. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

/** What the live region says for this position. */
function positionOf(
  products: readonly DeckProduct[],
  index: number,
  labels: ProductDeckLabels,
): string {
  const current = products[index];
  return current
    ? fill(labels.position, {
        name: current.name,
        n: String(index + 1),
        total: String(products.length),
      })
    : labels.endTitle;
}

/** A plain primary click. Anything else on a link — a middle-click, a
 *  modifier — opens a new tab or window, and that is the browser's. */
function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function ProductDeck({
  products,
  labels,
  supplyCta,
  route,
  resumeAfter,
  resumeAt,
  cardId,
  viewer,
  productDetails,
  computer,
}: {
  /** Never empty: the shelf renders its own empty state instead. */
  products: readonly DeckProduct[];
  labels: ProductDeckLabels;
  /**
   * The "put something on the shelf" CTA, built by the SERVER page and passed
   * down whole — it is not a label, because it is not always a link: a FOUNDER
   * gets a link to the Add product page (/products/new), an EXPLORER gets a
   * form that promotes them to a founder first (see ./SwitchToBuilding.tsx). Passing the element rather
   * than a label + href keeps the role lookup on the server and keeps this file
   * from having to know the ladder.
   */
  supplyCta: ReactNode;
  /** Which of the two deck routes this is, so a product's page can link back
   *  to the same one. */
  route: DeckRoute;
  /** `?after=` as the SERVER read it, for the first paint. The stack prefers
   *  the address once it is in a browser: see Stack. */
  resumeAfter: string | null;
  /** `?product=` as the server read it: the deck starts AT that card when it
   *  is on it (deck-position.ts startIndex), under its open modal. */
  resumeAt: string | null;
  cardId: string | null;
  /** Who is reading, for the prompts: see ./DeckPrompts.tsx. */
  viewer: DeckViewer;
  /** The product details rendered by the shelf at `?product=`. */
  productDetails: ReactNode;
  /** The server read the reader as a computer (lib/device.ts): its cards show
   *  the screenshots four at a time, as a grid, from `lg` up. A phone or a
   *  tablet keeps the one-at-a-time gallery, whose tall phone screenshots a
   *  grid's crop would cut to pieces. */
  computer: boolean;
}) {
  const { selected, matches, select } = useProductFilter();
  const view = useProductView();
  const sort = parseProductSort(useSearchParams().getAll(SORT_PARAM));
  const locale = useLocale();
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [modalId, showModal] = useOptimistic(resumeAt);
  const modalProduct = modalId ? products.find((product) => product.id === modalId) : undefined;
  const matching = useMemo(
    () => products.filter((p) => matches(p.bucket)),
    [products, matches],
  );
  const gridProducts = view === "grid" ? [...matching].sort((a, b) => {
    const newestFirst = b.createdAt - a.createdAt;
    if (sort === "rating") {
      return (b.rating.average ?? 0) - (a.rating.average ?? 0)
        || b.rating.count - a.rating.count
        || newestFirst;
    }
    if (sort === "likes") return b.likeCount - a.likeCount || newestFirst;
    return newestFirst;
  }) : matching;
  const [announced, setAnnounced] = useState("");
  /** The stack's root: where focus goes back to when a prompt closes. */
  const deckRef = useRef<HTMLDivElement>(null);
  const prompts = useProductPrompts({
    products,
    viewer,
    deckRef,
    productModalId: modalId,
  });
  const locked = prompts.locked || modalId !== null || navigating;

  useEffect(() => () => clearOpenedFromDeck(), []);

  function openProduct(productId: string) {
    if (locked) return;
    const url = new URL(window.location.href);
    url.searchParams.set(PRODUCT_PARAM, productId);
    markOpenedFromDeck(productId);
    startNavigation(() => {
      showModal(productId);
      router.push(`${url.pathname}${url.search}`, { scroll: false });
    });
  }

  function closeProduct() {
    if (!modalId) return;
    const url = new URL(window.location.href);
    const openedHere = takeOpenedFromDeck(modalId);
    if (openedHere && url.searchParams.get(PRODUCT_PARAM) === modalId) {
      router.back();
      return;
    }
    url.searchParams.delete(PRODUCT_PARAM);
    startNavigation(() => {
      showModal(null);
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    });
  }

  const ratingControlHeight = !viewer.signedIn
    ? 36
    : modalProduct?.reviewable && !modalProduct.sample
      ? modalProduct.liked ? 40 : 20
      : modalProduct?.isOwn ? 20 : 0;
  const skeleton = modalId && (
    <>
      <span role="status" className="sr-only">{t("Loading…", locale)}</span>
      <ProductDetailsSkeleton
        name={modalProduct?.name}
        description={modalProduct?.blurb}
        screenshotCount={modalProduct?.images.length}
        ratingControlHeight={ratingControlHeight}
      />
    </>
  );

  return (
    <div
      ref={view === "grid" ? deckRef : undefined}
      tabIndex={view === "grid" ? -1 : undefined}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      {view === "single" && (
        <p aria-live="polite" className="sr-only">
          {matching.length > 0 ? announced : labels.noneHereTitle}
        </p>
      )}
      {matching.length > 0 ? (
        <>
          <Stack
            key={selected ?? ""}
            products={matching}
            labels={labels}
            onAnnounce={setAnnounced}
            route={route}
            category={selected}
            resumeAfter={resumeAfter}
            resumeAt={resumeAt ?? cardId}
            rootRef={deckRef}
            visible={view === "single"}
            locked={locked}
            onOpenProduct={openProduct}
            onTried={prompts.tried}
            signedIn={viewer.signedIn}
            computer={computer}
          />
          {view === "grid" && (
            <>
              <label className="mb-4 flex items-center gap-2 self-start text-sm sm:self-end">
                <span className="text-ink-muted">{t("Sort by", locale)}</span>
                <span className="relative">
                  <select
                    value={sort}
                    onChange={(event) => {
                      const url = new URL(window.location.href);
                      setProductGridParams(url.searchParams, view, event.target.value);
                      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
                    }}
                    className="min-h-9 cursor-pointer appearance-none rounded-full border border-line bg-white py-2 pr-9 pl-3 text-ink"
                  >
                    <option value="newest">{t("Most recent", locale)}</option>
                    <option value="rating">{t("Highest rated", locale)}</option>
                    <option value="likes">{t("Most liked", locale)}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                </span>
              </label>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gridProducts.map((product) => (
                  <li key={product.id}>
                    <ProductGridCard
                      href={productPageHref(product.id, route, selected, view, sort)}
                      name={product.name}
                      cover={product.images[0]}
                      rating={product.rating}
                      likeCount={sort === "likes" ? product.likeCount : undefined}
                      mobileOnly={product.mobileOnly}
                      curated={product.curated}
                      locale={locale}
                      onClick={(event) => {
                        if (!isPlainClick(event)) return;
                        event.preventDefault();
                        openProduct(product.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <div className={view === "single" ? "relative min-h-0 flex-1" : undefined}>
          {/* The shelf has products and the filter excludes them all, so this
              asks the reader to widen it. The shelf being EMPTY is a different
              message that needs a maker instead, and ./ProductShelf.tsx renders
              that one: "try another category" on a shelf with nothing on it
              would send someone hunting through categories that are not
              there. In the stage's place, at the stage's size. */}
          <div className={view === "single" ? "absolute inset-0 pb-5" : undefined}>
            <EmptyState
              icon={SearchX}
              title={labels.noneHereTitle}
              description={labels.noneHereBody}
              padding="lg"
              className="grid h-full place-content-center"
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* A BUTTON, not a link to /products. The filter is client
                      state, so "see everything" is `select(null)` — navigating
                      to the bare URL would be a full server round trip to reach
                      a state already one setState away. */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => select(null)}
                  >
                    {labels.seeEverything}
                  </Button>
                  {supplyCta}
                </div>
              }
            />
          </div>
        </div>
      )}
      {/* OUTSIDE the stack's root, so a key pressed in a modal (an arrow in
          the comment box) never reaches the deck's own ← and →. */}
      <DeckProductTry.Provider
        value={(product, options) => prompts.tried(product, { ...options, fromDetails: true })}
      >
        {modalId && (
          <ProductModal
            key={modalId}
            name={modalProduct?.name ?? labels.productFallback}
            closeLabel={labels.closeDetails}
            discardLabel={labels.discardComment}
            onClose={closeProduct}
          >
            <Suspense fallback={skeleton}>
              {modalId === resumeAt ? productDetails : skeleton}
            </Suspense>
          </ProductModal>
        )}
      </DeckProductTry.Provider>
      {prompts.dialog}
    </div>
  );
}

function DeckActions({
  product,
  labels,
  onSkip,
  onTry,
}: {
  product: DeckProduct;
  labels: Pick<ProductDeckLabels, "skip" | "tryIt">;
  onSkip: () => void;
  onTry: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <>
      <Button
        variant="secondary"
        fullWidth
        onClick={onSkip}
        className="min-w-0 flex-1 gap-1.5 px-2 whitespace-nowrap sm:gap-2 sm:px-4 deck-wide:px-2.5 deck-wide:text-base deck-wide:lg:px-4 deck-wide:short:text-sm"
      >
        <X className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        {labels.skip}
      </Button>
      <a
        href={product.href}
        target="_blank"
        rel={LINK_REL}
        aria-label={product.tryAria}
        draggable={false}
        onClick={onTry}
        onAuxClick={onTry}
        className={buttonClasses({
          fullWidth: true,
          className: "min-w-0 flex-1 gap-1.5 px-2 whitespace-nowrap sm:gap-2 sm:px-4 deck-wide:px-2.5 deck-wide:text-base deck-wide:lg:px-4 deck-wide:short:text-sm",
        })}
      >
        {labels.tryIt}
        <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      </a>
    </>
  );
}

function Stack({
  products,
  labels,
  onAnnounce,
  route,
  category,
  resumeAfter,
  resumeAt,
  rootRef,
  visible,
  locked: shelfLocked,
  onOpenProduct,
  onTried,
  signedIn,
  computer,
}: {
  products: readonly DeckProduct[];
  labels: ProductDeckLabels;
  onAnnounce: (text: string) => void;
  route: DeckRoute;
  category: FilterBucket | null;
  resumeAfter: string | null;
  resumeAt: string | null;
  rootRef: RefObject<HTMLDivElement | null>;
  /** Keep the cursor while grid mode owns the visible content. */
  visible: boolean;
  locked: boolean;
  onOpenProduct: (id: string) => void;
  onTried: ProductTry;
  signedIn: boolean;
  /** See ProductDeck. */
  computer: boolean;
}) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  // WHERE THE STACK STARTS: the server's read of `?after=` for the first paint,
  // then the ADDRESS, before the browser paints (below).
  const [cursor, setCursor] = useState({ after: resumeAfter, at: resumeAt });
  const cursorRef = useRef(cursor);
  const moveCursor = useCallback((after: string | null, at: string | null = null) => {
    const next = { after, at };
    cursorRef.current = next;
    setCursor(next);
  }, []);
  // A like can refresh the shelf before the card has finished flying out.
  const [departingId, setDepartingId] = useState<string | null>(null);
  const [likeNotice, setLikeNotice] = useState<string | null>(null);
  /** The phone app this computer just tried: its code to scan is open. */
  const [handoff, setHandoff] = useState<{
    product: DeckProduct;
    options: ProductTryOptions;
  } | null>(null);
  const locked = !visible || shelfLocked || handoff !== null;

  const stageRef = useRef<HTMLDivElement>(null);
  /** The `after` this deck last read from or wrote to the address. undefined
   *  until the first read, which always applies. */
  const knownAfter = useRef<string | null | undefined>(undefined);
  const knownCard = useRef<string | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);
  const flyTimer = useRef(0);
  const flying = useRef(false);
  const latestLike = useRef<Promise<boolean> | null>(null);
  const justDragged = useRef(false);
  const restoreFocus = useRef(false);

  // Resolve the cursor against the full order so `?after=` still works when
  // it names a liked card. Only the swipe stack excludes those products.
  const canShow = (product: DeckProduct) =>
    !signedIn || !product.liked || product.id === departingId;
  const start = startIndex(products, cursor.after, cursor.at);
  const deck = products.filter(canShow);
  const index = products.slice(0, start).filter(canShow).length;
  const current = deck[index];
  const currentId = current?.id;
  const nextImage = deck[index + MOUNTED]?.images[0];

  // THE ADDRESS WINS, in a LAYOUT effect because only by then is the address
  // the one this render is for. The server's prop is right on a full load, and
  // can be wrong in the browser:
  //   · on a client-side Back, Next renders this page from its router cache,
  //     i.e. with the `resumeAfter` of the request that first rendered it,
  //     while the address Back restored carries the `after` written on the
  //     way out;
  //   · on a change of category this stack is a REMOUNT under the same prop,
  //     and the filter has just dropped `after` from the address;
  //   · on a soft navigation that changes only the query (the sidebar's
  //     Products link from /products?after=…), this stack stays mounted and
  //     the address no longer resumes anywhere.
  // Re-run on every change of the router's search params, and acted on only
  // when `after` differs from `knownAfter`: the deck's own writes (below) set
  // knownAfter first, so they never move it, and neither does a change of
  // some other parameter (`?review=` being removed, the category).
  // Not read during render: a client-side push renders the new page BEFORE
  // the router commits its URL, so window.location still names the page being
  // left, and useSearchParams() lags a replaceState made in the same event
  // (Next applies it in a transition) — which is the category case. Same
  // reasoning as ./filter-context.tsx's address effect.
  useLayoutEffect(() => {
    const after = readAfterFromAddress();
    const card = readCardFromAddress();
    const first = knownAfter.current === undefined;
    if (!first && after === knownAfter.current && card === knownCard.current) return;
    knownAfter.current = after;
    knownCard.current = card;
    // The first read also honours `?product=`: a deck loaded with its modal
    // open starts AT that card. Later reads move only for `after`.
    const at = first ? readProductFromAddress() ?? card : card;
    if (after === cursorRef.current.after && at === cursorRef.current.at) return;
    if (!first) {
      // An outside navigation: whatever was in flight is moot.
      gesture.current?.listeners.abort();
      gesture.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      clearTimeout(flyTimer.current);
      flying.current = false;
      setDepartingId(null);
      latestLike.current = null;
      setLikeNotice(null);
    }
    moveCursor(after, at);
  }, [searchParams, moveCursor]);

  useEffect(
    () => () => {
      gesture.current?.listeners.abort();
      cancelAnimationFrame(frame.current);
      clearTimeout(flyTimer.current);
    },
    [],
  );

  // The drag and fly-out styles have done their job once React has moved every
  // card along. Clear the transient styles before paint so the next card
  // picks up its resting position from React without a jump.
  useLayoutEffect(() => {
    stackOf(stageRef.current).forEach((card) => {
      card.style.transition = "";
      card.style.transform = "";
      card.style.opacity = "";
      card.style.pointerEvents = "";
      clearHints(card);
    });
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    const root = rootRef.current;
    if (root && !root.contains(document.activeElement)) {
      root.focus({ preventScroll: true });
    }
  }, [currentId, cursor, rootRef]);

  // The three mounted first images are already loading (and the card next in
  // line fetches its others: ProductGallery's `preload`), so "next" is the
  // first image of the card that mounts behind them on the following swipe.
  //
  // These are the requests a swipe causes, and deleting this effect would not
  // remove them: the card that mounts a swipe later asks for the same image.
  // Plain GETs of public images, which say nothing about the swipe's direction.
  useEffect(() => {
    if (visible && nextImage) new window.Image().src = nextImage;
  }, [nextImage, visible]);

  useEffect(() => {
    if (visible) return;
    gesture.current?.listeners.abort();
    gesture.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, [visible]);

  const position = positionOf(deck, index, labels);
  const announcement = likeNotice ? `${likeNotice} ${position}` : position;

  useEffect(() => {
    onAnnounce(announcement);
  }, [announcement, onAnnounce]);

  /** The product's page, with the deck it came from, so its back link can
   *  return here. */
  function pageHrefOf(product: DeckProduct): string {
    return productPageHref(product.id, route, category);
  }

  /** `?after=` on this history entry, and the deck's note that it said so. */
  function writeAfter(productId: string | null) {
    knownAfter.current = productId;
    knownCard.current = null;
    writeAfterToAddress(productId);
  }

  /** Undefined while a card is in flight or being dragged, or a prompt is
   *  open: input then is lost rather than queued, so it can never skip a
   *  card. */
  function actionableProduct(): DeckProduct | undefined {
    if (locked || flying.current || gesture.current) return undefined;
    const { after, at } = cursorRef.current;
    return products.slice(startIndex(products, after, at)).find(canShow);
  }

  function advance(productId: string) {
    flying.current = false;
    setDepartingId(null);
    // A card leaving the DOM takes its focused link with it, and the last
    // card takes the deck controls with it too.
    restoreFocus.current =
      rootRef.current?.contains(document.activeElement) ?? false;
    moveCursor(productId);
  }

  function flyOut(sign: 1 | -1, productId: string) {
    flying.current = true;
    if (prefersReducedMotion()) {
      advance(productId);
      return;
    }
    const [top, ...behind] = stackOf(stageRef.current);
    if (!top) {
      advance(productId);
      return;
    }
    setDepartingId(productId);
    top.style.pointerEvents = "none";
    top.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.2, 0.65, 0.35, 1), opacity ${FLY_MS}ms ease-in`;
    top.style.transform = `translate3d(${sign * window.innerWidth}px, 0, 0) rotate(${sign * maxTiltFor(top.offsetWidth)}deg)`;
    top.style.opacity = "0";
    behind.forEach((card, i) => {
      card.style.transition = `transform ${FLY_MS}ms ease-out`;
      card.style.transform = stackTransform(i);
    });
    // A timer and not transitionend: trying a product backgrounds this tab,
    // where transitions stop progressing and the event would not come until
    // the reader is back.
    flyTimer.current = window.setTimeout(() => advance(productId), FLY_MS);
  }

  function skip() {
    const product = actionableProduct();
    if (!product) return;
    latestLike.current = null;
    setLikeNotice(null);
    flyOut(-1, product.id);
  }

  function saveSwipeLike(product: DeckProduct) {
    const request = likeProductAction(product.id)
      .catch(() => ({
        error: "Couldn’t save your like. Try again.",
      }))
      .then((result) => {
        if (latestLike.current === request) {
          setLikeNotice(result
            ? t(result.error, locale)
            : fill(t("Liked {name}", locale), { name: product.name }));
        }
        return !result;
      });
    latestLike.current = request;
    return request;
  }

  function swipeRight() {
    const product = actionableProduct();
    if (!product) return;
    const phoneHandoff = needsPhone(product.phones);
    // Open within the pointerup or keyboard event to keep user activation.
    if (!phoneHandoff) window.open(product.href, "_blank", "noopener,noreferrer");
    tryProduct(product, true, phoneHandoff);
  }

  /** The browser opens Try's link unless the device needs a QR handoff. */
  function onTryLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const product = actionableProduct();
    if (!product) {
      // A double click would otherwise open this product twice, and a press
      // through a modal's backdrop would open one behind it.
      event.preventDefault();
      return;
    }
    // A middle-click or modifier uses the link's native browser behavior.
    const phoneHandoff = isPlainClick(event) && needsPhone(product.phones);
    if (phoneHandoff) event.preventDefault();
    tryProduct(product, false, phoneHandoff);
  }

  function tryProduct(product: DeckProduct, fromSwipe: boolean, phoneHandoff: boolean) {
    latestLike.current = null;
    setLikeNotice(null);
    const liking = fromSwipe && signedIn && !product.sample
      ? saveSwipeLike(product)
      : undefined;
    const options = { fromSwipe, liking };
    writeAfter(product.id);
    if (phoneHandoff) {
      setHandoff({ product, options });
    } else {
      onTried(product, options);
    }
    flyOut(1, product.id);
  }

  /** The top card's own page, in the modal over this deck (see THE
   *  PRODUCT'S PAGE, IN A MODAL): the card's link, its ↑, its footer, and ↑
   *  on the deck. A middle-click or a modifier on one of the links asks the
   *  browser for the page in a new tab, and gets it. */
  function openProduct(event: MouseEvent<HTMLElement> | null) {
    if (event && !isPlainClick(event)) return;
    // next/link would navigate on its own (it stands down when the default is
    // prevented), and the stretched <a> would go to the page.
    event?.preventDefault();
    const product = actionableProduct();
    if (product) onOpenProduct(product.id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Alt+Left is browser Back. A held key acts on only one card.
    if (
      locked ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      skip();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      swipeRight();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openProduct(null);
    }
  }

  function startOver() {
    restoreFocus.current = true;
    moveCursor(null);
    latestLike.current = null;
    setLikeNotice(null);
    // Back at card 1, so the address must not resume anywhere else.
    writeAfter(null);
  }

  function paint(g: Gesture) {
    const [top, ...behind] = g.cards;
    const pull = Math.min(Math.abs(g.dx) / (g.width * COMMIT_RATIO), 1);
    // Full tilt at twice the commit distance, so it reads well before release.
    const lean = g.dx / (g.width * 2 * COMMIT_RATIO);
    const tilt = g.reducedMotion ? 0 : Math.max(-1, Math.min(lean, 1)) * g.tilt;
    top.style.transform = `translate3d(${g.dx}px, 0, 0) rotate(${tilt}deg)`;
    if (g.likeHint) g.likeHint.style.opacity = String(g.dx > 0 ? pull : 0);
    if (g.skipHint) g.skipHint.style.opacity = String(g.dx < 0 ? pull : 0);
    behind.forEach((card, i) => {
      card.style.transform = stackTransform(i + 1 - pull);
    });
  }

  function springBack() {
    const [top, ...behind] = stackOf(stageRef.current);
    if (!top) return;
    const transition = prefersReducedMotion()
      ? ""
      : `transform ${SPRING_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1.25)`;
    top.style.transition = transition;
    top.style.transform = "";
    clearHints(top);
    behind.forEach((card) => {
      card.style.transition = transition;
      card.style.transform = "";
    });
  }

  function endGesture(g: Gesture) {
    g.listeners.abort();
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    gesture.current = null;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    if (locked || flying.current || gesture.current) return;
    justDragged.current = false;
    if ((event.target as Element).closest("[data-deck-nodrag]")) return;

    const touch = event.pointerType === "touch";
    const card = event.currentTarget;
    const g: Gesture = {
      pointerId: event.pointerId,
      element: card,
      cards: stackOf(stageRef.current),
      likeHint: card.querySelector('[data-deck-hint="like"]'),
      skipHint: card.querySelector('[data-deck-hint="skip"]'),
      startX: event.clientX,
      startY: event.clientY,
      lock: null,
      originX: event.clientX,
      dx: 0,
      width: Math.min(card.offsetWidth, COMMIT_BASIS_MAX_PX),
      tilt: maxTiltFor(card.offsetWidth),
      samples: [{ x: event.clientX, t: event.timeStamp }],
      reducedMotion: prefersReducedMotion(),
      listeners: new AbortController(),
    };
    gesture.current = g;

    // Covers a browser-claimed vertical pan (pointercancel), a lost capture and
    // alt-tabbing away mid-drag: no card may be left stranded.
    const cancel = () => {
      if (gesture.current !== g) return;
      const wasDragging = g.lock === "x";
      endGesture(g);
      if (wasDragging) springBack();
    };

    const options = { signal: g.listeners.signal };

    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerId !== g.pointerId) return;
        if (g.lock === "y") return;
        if (g.lock === null) {
          const dx = e.clientX - g.startX;
          const dy = e.clientY - g.startY;
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= LOCK_PX) justDragged.current = true;
          g.lock = swipeAxis(dx, dy, touch);
          if (g.lock !== "x") return;
          // Measured from the lock point, so the card does not jump by the
          // travel it took to get here.
          g.originX = g.startX + Math.sign(dx) * LOCK_PX;
          // Left over from a spring-back, it would make every frame lag.
          for (const card of g.cards) {
            card.style.transition = "";
          }
          g.element.setPointerCapture(g.pointerId);
        }
        g.dx = e.clientX - g.originX;
        g.samples.push({ x: e.clientX, t: e.timeStamp });
        g.samples = g.samples.filter(
          (s) => e.timeStamp - s.t <= VELOCITY_WINDOW_MS,
        );
        if (!frame.current) {
          frame.current = requestAnimationFrame(() => {
            frame.current = 0;
            paint(g);
          });
        }
      },
      options,
    );

    window.addEventListener(
      "pointerup",
      (e) => {
        if (e.pointerId !== g.pointerId) return;
        // A quick touch flick can end before a move event locks its axis.
        if (g.lock === null) {
          const dx = e.clientX - g.startX;
          const dy = e.clientY - g.startY;
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= LOCK_PX) justDragged.current = true;
          g.lock = swipeAxis(dx, dy, touch);
          if (g.lock === "x") {
            g.originX = g.startX + Math.sign(dx) * LOCK_PX;
          }
        }
        const dragging = g.lock === "x";
        if (dragging) {
          justDragged.current = true;
          g.dx = e.clientX - g.originX;
          g.samples.push({ x: e.clientX, t: e.timeStamp });
        }
        const velocity = releaseVelocity(g.samples, e.timeStamp);
        endGesture(g);
        if (!dragging) return;

        const far = Math.abs(g.dx) >= g.width * COMMIT_RATIO;
        const flick =
          Math.abs(velocity) >= FLICK_PX_PER_MS &&
          Math.abs(g.dx) >= FLICK_MIN_PX &&
          Math.sign(velocity) === Math.sign(g.dx);
        if (!far && !flick) {
          springBack();
          return;
        }
        if (g.dx > 0) swipeRight();
        else skip();
      },
      options,
    );

    window.addEventListener("pointercancel", (e) => {
      if (e.pointerId === g.pointerId) cancel();
    }, options);
    window.addEventListener("blur", cancel, options);
    // Ctrl+click on a Mac: the native menu swallows the pointerup.
    window.addEventListener("contextmenu", cancel, options);
    // Filtered, or every touch swipe ends at the lock: see the header.
    g.element.addEventListener(
      "lostpointercapture",
      (e) => {
        if (e.pointerId === g.pointerId && e.target === g.element) cancel();
      },
      options,
    );
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    // Touch clicks can arrive after pointerup. A new press clears the flag,
    // and keyboard and assistive technology clicks have no pointer count.
    if (!justDragged.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragStart(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={labels.deckName}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp"
      tabIndex={0}
      onKeyDown={onKeyDown}
      // Center the capped stack in the space below the toolbar.
      className="relative flex min-h-0 w-full flex-1 flex-col rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy deck-wide:my-auto deck-wide:max-h-[42rem] deck-wide:md:max-lg:max-h-[37rem] deck-wide:[--deck-panel-width:clamp(min(16rem,50%),38.2%,32.5rem)] deck-wide:[--deck-panel-inset:clamp(1.25rem,2.125vw,2rem)] deck-wide:short:[--deck-panel-width:clamp(min(20rem,66%),42%,32.5rem)] deck-wide:short:[--deck-panel-inset:clamp(0.625rem,2.4dvh,1rem)]"
    >
      <div ref={stageRef} className="relative min-h-0 flex-1">
        {deck.slice(index, index + MOUNTED).map((product, depth) => (
          <Card
            key={product.id}
            padding="none"
            data-deck-card=""
            inert={depth > 0}
            onPointerDown={depth === 0 ? onPointerDown : undefined}
            onClickCapture={depth === 0 ? onClickCapture : undefined}
            onDragStart={depth === 0 ? onDragStart : undefined}
            style={
              { "--depth": depth, zIndex: MOUNTED - depth } as CSSProperties
            }
            // The overlay surface: a card that floats, so border AND shadow.
            // NOT overflow-hidden: that would clip the link's focus ring (the
            // global :focus-visible outline draws 2px OUTSIDE the element).
            // The clip lives on the image box, the only thing that needs it.
            // `group/card` is what the gallery's arrows read hover from.
            // A column on a phone, a row on a wide screen (CARD_BODY).
            className={cn(
              "group/card absolute inset-x-0 top-0 bottom-5 flex origin-bottom cursor-grab touch-pan-y flex-col border border-line shadow-lg select-none active:cursor-grabbing short:bottom-3 deck-wide:flex-row [transform:translateY(calc(var(--depth)_*_10px))_scale(calc(1_-_var(--depth)_*_0.04))]",
              depth < 2 && "motion-safe:will-change-transform",
            )}
          >
            {/* Stretched, and a real link to the product's page, so a tap
                before hydration, a middle-click and assistive tech all reach
                it; after hydration a plain click opens it in the modal
                instead (see THE PRODUCT'S PAGE, IN A MODAL). It covers the
                pictures, so it is also what says the pointer is over them
                (`data-gallery-zone`, see components/ProductGallery.tsx). */}
            <a
              href={pageHrefOf(product)}
              aria-label={product.moreAria}
              aria-haspopup="dialog"
              draggable={false}
              onClick={openProduct}
              data-gallery-zone=""
              aria-describedby={
                product.mobileOnly ? `mobile-only-${product.id}` : undefined
              }
              className="absolute inset-0 z-10 cursor-grab rounded-3xl active:cursor-grabbing"
            />

            <span
              data-deck-hint="like"
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-4 z-30 rounded-full bg-navy px-3 py-1.5 text-sm font-medium text-white opacity-0"
            >
              {signedIn ? labels.like : labels.tryIt}
            </span>
            <span
              data-deck-hint="skip"
              aria-hidden="true"
              className="pointer-events-none absolute top-4 right-4 z-30 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-navy opacity-0"
            >
              {labels.skip}
            </span>

            <div className="relative min-h-0 min-w-0 flex-1">
              {/* Roomy computer windows show four screenshots. Smaller
                  windows and touch devices use the single-image gallery. */}
              <ProductGallery
                images={product.images}
                labels={labels}
                inactive={depth > 0}
                preload={depth === 1}
                fit="contain"
                backdrop
                sizes="(min-width: 768px) 62vw, (min-aspect-ratio: 4/3) 62vw, 100vw"
                className={`rounded-t-3xl deck-wide:rounded-tr-none deck-wide:rounded-bl-3xl${computer ? " lg:hidden" : ""}`}
              />
              {computer && (
                <ProductGallery
                  images={product.images}
                  labels={{
                    previousImage: labels.previousGroup,
                    nextImage: labels.nextGroup,
                  }}
                  inactive={depth > 0}
                  preload={depth === 1}
                  perView={4}
                  fit="contain"
                  sizes="31vw"
                  className="hidden rounded-t-3xl lg:block deck-wide:rounded-tr-none deck-wide:rounded-bl-3xl"
                />
              )}
              {/* "More about", where a dating app keeps its own: the
                  pictures' corner. Out of the tab order: the card's link above
                  is the same control for a keyboard. z-20, over that link; a
                  press here is never a swipe. */}
              {depth === 0 && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-deck-nodrag=""
                  aria-label={product.moreAria}
                  aria-haspopup="dialog"
                  onClick={openProduct}
                  className="absolute right-3 bottom-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-navy shadow-lg hover:bg-cream"
                >
                  <ChevronUp
                    className="h-5 w-5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            <div className={CARD_BODY}>
              <div className="relative z-20 flex min-h-0 touch-pan-y flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-y-contain **:touch-pan-y sm:gap-3 deck-wide:contents deck-wide:short:flex deck-wide:short:gap-1.5 deck-wide:short-landscape:gap-1 deck-touch:overflow-visible">
                <div className="flex min-w-0 shrink-0 flex-col gap-1.5 sm:gap-3 deck-wide:gap-2.5 deck-wide:short:gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-xl wrap-anywhere deck-wide:text-d1 deck-wide:lg:text-d2 deck-wide:short:text-xl deck-wide:short-landscape:text-lg/6 compact-phone-landscape:text-base/5">
                      {product.name}
                    </h2>
                    <CardChip className="bg-cream px-3 py-1.5 text-xs sm:text-sm deck-wide:short:py-0.5">
                      {t(product.bucket === "game" ? "Game" : "App", locale)}
                    </CardChip>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
                    {product.curated && <CardChip>{CURATED_PRODUCT_LABEL}</CardChip>}
                    {product.mobileOnly && (
                      <CardChip
                        id={`mobile-only-${product.id}`}
                        className="w-full justify-start gap-2 rounded-xl bg-navy px-3 py-1.5 text-sm font-bold whitespace-normal text-white sm:text-base deck-wide:gap-2.5 deck-wide:px-4 deck-wide:py-2.5 deck-wide:text-lg deck-wide:lg:text-xl deck-wide:short:py-2 deck-wide:short:text-base"
                      >
                        <Smartphone className="size-3.5 shrink-0 deck-wide:size-5" strokeWidth={1.5} aria-hidden="true" />
                        {labels.mobileOnly}
                      </CardChip>
                    )}
                    {product.platformLabels.map((label) => (
                      <CardChip key={label} className="px-3 py-1.5 text-xs sm:text-sm deck-wide:short:py-0.5">
                        {label}
                      </CardChip>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col deck-wide:gap-3 deck-wide:border-y deck-wide:border-line deck-wide:py-3 deck-wide:short:border-0 deck-wide:short:py-0">
                  {product.blurb && product.blurb.trim() !== product.name && (
                    <p className="min-h-0 wrap-anywhere font-serif text-sm leading-snug text-ink sm:text-base deck-wide:line-clamp-5 deck-wide:text-lg deck-wide:lg:text-xl deck-wide:short:line-clamp-none deck-wide:short:text-base deck-wide:short-landscape:text-sm deck-touch:short-landscape:line-clamp-2 compact-phone-landscape:line-clamp-1">
                      {product.blurb}
                    </p>
                  )}

                  <Link
                    href={pageHrefOf(product)}
                    prefetch={false}
                    aria-label={product.footerAria}
                    aria-haspopup="dialog"
                    data-deck-nodrag=""
                    draggable={false}
                    onClick={openProduct}
                    className="group/stats relative z-20 hidden min-w-0 shrink-0 cursor-pointer grid-cols-2 gap-3 deck-wide:grid deck-wide:short:hidden"
                  >
                    <CardStats product={product} locale={locale} />
                  </Link>
                </div>
                {product.maker && (
                  <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs text-ink sm:text-sm deck-wide:text-base deck-wide:short:text-sm compact-phone-landscape:hidden">
                    <div aria-hidden="true">
                      <Avatar name={product.maker.name} url={product.maker.avatarUrl} size="xs" />
                    </div>
                    <span className="truncate">{product.maker.name}</span>
                  </div>
                )}
              </div>

              {/* The product's page, in the modal: see "THE PRODUCT'S
                  PAGE, IN A MODAL" in the header. Two faces of ONE control,
                  each shown at one size only (display:none takes the other
                  out of the tab order): the compact row on a phone's band,
                  the stat strip in the wide panel. Not prefetched: each card
                  mounting would otherwise fetch its page, and a skip must not
                  cause a request of its own. */}
              <div className="mt-auto flex min-w-0 shrink-0 items-center border-t border-line pt-2 sm:pt-3 deck-wide:hidden deck-wide:short:mt-0 deck-wide:short:flex deck-wide:short:pt-1.5">
                <Link
                  href={pageHrefOf(product)}
                  prefetch={false}
                  aria-label={product.footerAria}
                  aria-haspopup="dialog"
                  draggable={false}
                  onClick={openProduct}
                  className="relative z-20 -my-2 inline-flex min-w-0 cursor-pointer items-center gap-4 py-2 text-sm"
                >
                  <CardFooterFace product={product} locale={locale} />
                </Link>
              </div>
              {FEATURES.productDeckActions && (
                <div
                  data-deck-nodrag=""
                  className={cn("relative z-20 hidden shrink-0 grid-cols-2 gap-3 deck-wide:grid", depth > 0 && "invisible")}
                >
                  <DeckActions
                    product={product}
                    labels={labels}
                    onSkip={skip}
                    onTry={onTryLinkClick}
                  />
                </div>
              )}
            </div>
          </Card>
        ))}

        {!current && (
          <Card className="absolute inset-x-0 top-0 bottom-5 grid place-items-center border border-line text-center shadow-lg short:bottom-3">
            <h3 className="text-xl">{labels.endTitle}</h3>
          </Card>
        )}
      </div>

      {/* Compact cards keep their controls below the stack. */}
      {(FEATURES.productDeckActions || !current) && (
        <div
          className={cn(
            "mx-auto mt-3 flex w-full max-w-md shrink-0 gap-2 sm:gap-3 short:mt-2",
            current
              ? "deck-wide:hidden"
              : "deck-wide:absolute deck-wide:bottom-[calc(var(--deck-panel-inset)+1.25rem+1px)] deck-wide:left-1/2 deck-wide:z-10 deck-wide:m-0 deck-wide:w-[calc(100%_-_3rem)] deck-wide:-translate-x-1/2",
          )}
        >
          {current ? (
            <DeckActions
              product={current}
              labels={labels}
              onSkip={skip}
              onTry={onTryLinkClick}
            />
          ) : signedIn && deck.length === 0 ? (
            <LinkButton href={LIKED_PRODUCTS_PATH} prefetch={false} fullWidth>
              {t("Liked products", locale)}
            </LinkButton>
          ) : (
            <>
              <Button
                variant="secondary"
                fullWidth
                onClick={startOver}
                className="flex-1"
              >
                {labels.startOver}
              </Button>
              {labels.join && (
                <LinkButton
                  href="/signup"
                  prefetch={false}
                  fullWidth
                  className="flex-1"
                >
                  {labels.join}
                </LinkButton>
              )}
            </>
          )}
        </div>
      )}

      {/* Over the stage rather than in the flow, so it cannot push the buttons
          out of the first viewport. */}
      {likeNotice && (
        <div className="absolute top-3 left-1/2 z-30 w-max max-w-[calc(100%_-_1.5rem)] -translate-x-1/2 rounded-xl border border-line bg-white px-4 py-2 text-center text-sm shadow-lg">
          <p>{likeNotice}</p>
        </div>
      )}

      {/* The reader can try the link here or request a review after scanning. */}
      {handoff && (
        <PhoneHandoffDialog
          name={handoff.product.name}
          href={handoff.product.href}
          host={handoff.product.host}
          phones={handoff.product.phones}
          storeLinks={handoff.product.storeLinks}
          onClose={() => setHandoff(null)}
          onOpenHere={() => onTried(handoff.product, handoff.options)}
          onReview={
            !signedIn || handoff.product.reviewable
              ? () => onTried(handoff.product, { ...handoff.options, requestReview: true })
              : undefined
          }
        />
      )}
    </div>
  );
}

/**
 * The wide panel's stat strip: the average over "{n} ratings", the comment
 * count over "Comments", numerals in the numeral register (CLAUDE.md,
 * Typography). A face only, like
 * CardFooterFace: the words for a screen reader are the link's accessible name.
 *
 * The rating rules hold here too (components/ProductRatingSummary.tsx): the
 * count always travels with the average, an unrated product is an OUTLINE star
 * and "No ratings yet" — never "0.0" — and the palette stays neutral. A zero
 * is muted, so an empty count reads as "not yet", not as a verdict.
 */
function CardStats({
  product,
  locale,
}: {
  product: DeckProduct;
  locale: Locale;
}) {
  const { average, count } = product.rating;
  const rated = average !== null && count > 0;
  const comments = product.commentCount;
  return (
    <>
      <span aria-hidden="true" className="flex min-w-0 flex-col gap-1.5">
        {rated ? (
          <span className="flex items-center gap-1.5">
            <span className="font-serif text-num1 tabular-nums text-ink lg:text-num2 short:text-num1">
              {average.toFixed(1)}
            </span>
            <Star
              className="h-5 w-5 shrink-0 text-navy"
              fill="currentColor"
              strokeWidth={1.5}
            />
          </span>
        ) : (
          <span className="flex h-[2.0625rem] items-center lg:h-[2.625rem] short:h-[2.0625rem]">
            <Star
              className="h-6 w-6 shrink-0 text-ink-muted"
              fill="none"
              strokeWidth={1.5}
            />
          </span>
        )}
        <span className="truncate text-sm text-ink-muted group-hover/stats:text-navy short:text-xs">
          {rated
            ? t(count === 1 ? "{n} rating" : "{n} ratings", locale).replace(
                "{n}",
                count.toLocaleString("en-US"),
              )
            : t("No ratings yet", locale)}
        </span>
      </span>
      <span aria-hidden="true" className="flex min-w-0 flex-col gap-1.5">
        <span
          className={`font-serif text-num1 tabular-nums lg:text-num2 short:text-num1 ${comments > 0 ? "text-ink" : "text-ink-muted"}`}
        >
          {comments.toLocaleString("en-US")}
        </span>
        <span className="truncate text-sm text-ink-muted group-hover/stats:text-navy short:text-xs">
          {t("Comments", locale)}
        </span>
      </span>
    </>
  );
}

/** The footer's rating and comment count, as a face only: the words for a
 *  screen reader are the footer link's accessible name (`footerAria`). */
function CardFooterFace({
  product,
  locale,
}: {
  product: DeckProduct;
  locale: Locale;
}) {
  return (
    <>
      <ProductRatingSummary rating={product.rating} locale={locale} />
      <span className="inline-flex shrink-0 items-center gap-1.5 text-ink-muted">
        <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="tabular-nums">
          {product.commentCount.toLocaleString("en-US")}
        </span>
      </span>
    </>
  );
}
