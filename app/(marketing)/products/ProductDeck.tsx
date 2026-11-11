"use client";

// The shelf itself: one product at a time, left skips, right tries it. There is
// no grid behind this any more, so a product that is not in this deck is not on
// the page.
//
// ── THE ONE SWIPE IN THE PRODUCT, AND WHAT KEEPS IT FROM BEING A RATING ────
// CLAUDE.md's Language Rules allow exactly this and nothing wider: a deck over
// products, never over a person or a company. Left skips; right (and a tap on
// the card) opens the maker's product itself in a NEW TAB, and this tab stays
// on the deck. The swipe records nothing: no database write, no browser
// storage, no cookie, no analytics. A swipe left is "not now", said to nobody,
// and it changes nothing but the screen. What happens when the reader comes
// back from that tab — a review modal for a member, a sign-in offer for a
// visitor — is ./DeckPrompts.tsx, and a rating there is given by tapping a
// star and pressing send, never by the swipe.
//
// ── RIGHT OPENS THE PRODUCT, IN A NEW TAB, INSIDE THE GESTURE ──────────────
// A right swipe, → on the deck, "Try" and a tap on the card's images or
// description all open `href` — already through webUrl() on the server
// (./ProductShelf.tsx), so this file never sees a raw link_url, and that parse
// is what stands between a member-supplied `javascript:` URL and the tab.
//   · "Try" and the card are REAL links, `target="_blank"` with
//     `rel="noopener noreferrer nofollow"`: the browser opens the tab itself,
//     before hydration too, and a link the reader activated is never
//     popup-blocked. The click handler only moves the deck on.
//   · a swipe and → have no link to activate, so they call window.open() —
//     synchronously, in the pointerup or keydown handler, while the browser
//     still counts the gesture as the user's (a timer or a fly-out's end
//     would be blocked). WITHOUT the "noopener" feature, which would make
//     window.open() return null even on success and leave a blocked popup
//     undetectable; the opener is severed in the same tick instead, before
//     the new page exists to read it. ("noreferrer" would do the same to the
//     return value, so this tab sends a Referer the links do not: the site's
//     strict-origin-when-cross-origin policy (next.config.ts) makes it the
//     bare origin, never the deck's address.)
//   · when that window.open() IS blocked, the card still moves on and a
//     notice over the deck carries a real link to the same product — the
//     fallback a reader can always activate.
//
// ── THE RATING-AND-COMMENTS ROW IS A DIFFERENT DESTINATION ─────────────────
// The card's footer (the rating and the comment count) is a separate, same-tab
// link to the product's page on Cofoundee, /p/<id>, where every comment is.
// It sits ABOVE the card's link (z-20 against z-10, siblings in the DOM — see
// THE CARD'S TWO LINKS), and a press on it never starts a swipe
// ([data-deck-nodrag]).
//
// ── COMING BACK RESUMES THE DECK ───────────────────────────────────────────
// Opening a product — trying it or going to its page — rewrites this page's
// own history entry to `?after=<id>` first, so a reload, browser Back from
// /p/<id>, a phone's swipe-back and that page's back link all land on an
// address that says where the reader was, and the stack starts at the card
// after it. The address is the only place the position is kept;
// ./deck-position.ts has the whole argument, including what a reload does.
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
// it; an absent one cannot disagree with the total. `bucket` came from
// productBucketOf() on the server, the same function that decides which
// category chips the filter offers, so a chip is there exactly when its deck
// has a card.
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
// A card's place in the stack is `--depth`, set by React and read by one CSS
// transform, so the first paint is right before hydration. A drag then writes
// that element's style directly every frame, with no React state per frame: an
// inline transform on the top card, a fractional --depth on the two behind it.
// A commit ends with the DOM already where React is about to put it.
//
// ── THE GESTURE ────────────────────────────────────────────────────────────
//   touch-action: pan-y    A vertical swipe still scrolls the page. The browser
//                          takes it and tells us with pointercancel.
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
//   window.open in the     The transient user activation is gone by the time a
//   pointerup handler      fly-out ends, and the popup would be blocked.
//   `locked`               While a prompt's modal is open, keys, presses and
//                          clicks on the deck do nothing.
//
// ── WHAT THE CARD SHOWS ────────────────────────────────────────────────────
// ONLY the images, the description, the rating and the comment count: CLAUDE.md,
// Language Rules, "Founder decision (2026-11-10)". No visible product name, no
// maker. The name is still in the card link's accessible name ("Try {name} on
// {host}") and in the live region, so a screen reader still hears what it is.
//
// ── THE CARD'S TWO LINKS ───────────────────────────────────────────────────
// The stretched-link pattern, because the card holds a second destination (the
// footer row) and the gallery's arrows, and neither a link nor a button can
// nest in <a>. ONE absolutely-positioned <a> to the product covers the card at
// `z-10`; the footer link and the arrows sit at `z-20`. They are SIBLINGS in
// the DOM, not ancestor and descendant, so nothing needs to cancel an event: a
// press lands on one or the other, decided by paint order. That z-20 is not
// decoration. The stretched <a> is the topmost element over the rest of the
// card (`document.elementsFromPoint()` returns it first at the images and the
// description), so a control added without z-20 paints underneath it, and a
// reader aiming for it opens the maker's site instead.
//
// The stretched <a> is the FIRST thing in the card on purpose: tab order is DOM
// order, and the primary destination should not be the last stop.
//
// ── THE GALLERY ────────────────────────────────────────────────────────────
// components/ProductGallery.tsx, the same component the product's page uses.
// The top card's gallery is active (every image; the arrows on a hovering
// pointer, the one-second autoplay on anything else); the cards behind paint
// their first image only, and the one next in line fetches the rest while it
// waits. The card is the gallery's `data-gallery-scope`, so a finger anywhere
// on it — the start of a swipe, or of a scroll — pauses the autoplay.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ExternalLink, MessageCircle, SearchX, X } from "lucide-react";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import {
  Button,
  Card,
  EmptyState,
  LinkButton,
  buttonClasses,
} from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n-client";
import type { ProductCategory, ProductRating } from "@/lib/post-types";
import {
  productPageHref,
  readAfterFromAddress,
  resumeIndex,
  writeAfterToAddress,
  type DeckRoute,
} from "./deck-position";
import {
  useDeckPrompts,
  type DeckViewer,
  type PromptProduct,
} from "./DeckPrompts";
import { useProductFilter } from "./filter-context";

export type DeckProduct = PromptProduct & {
  /** Which category it is filed under, from productBucketOf() on the server. */
  bucket: ProductCategory;
  /** NOT on the card face (see the header). Read by the live region, the
   *  popup-blocked notice's "Open {name}" and the prompts' titles. */
  name: string;
  blurb: string;
  /** The maker's product, already through webUrl(). Never a raw link_url. */
  href: string;
  /** "Try {name} on {host}": the accessible name of the card's link, which
   *  has no visible text, and of the Try button. Starts with the button's
   *  visible word, because a voice-control user says what they see
   *  (WCAG 2.5.3). */
  tryAria: string;
  /** Every image, in order, already through ./product-view.ts's image parse and
   *  capped at MAX_PRODUCT_IMAGES. [] for a product with no screenshots. */
  images: readonly string[];
  /** The PUBLIC aggregate, the same for every audience. */
  rating: ProductRating;
  commentCount: number;
  /** The footer said as one sentence: "4.3 out of 5 from 12 ratings, 3
   *  comments". The footer link's accessible name. */
  footerAria: string;
};

type ProductDeckLabels = {
  deckName: string;
  skip: string;
  /** The right-hand button and the drag hint: "Try" (ลองเลย). Right opens the
   *  product itself. */
  tryIt: string;
  /** "{name}, {n} of {total}", announced to screen readers only. */
  position: string;
  endTitle: string;
  startOver: string;
  /** null unless the reader is logged out. */
  join: string | null;
  /** The popup-blocked notice, and its "Open {name}". */
  blocked: string;
  openBlocked: string;
  noneHereTitle: string;
  noneHereBody: string;
  /** Sets the filter back to "All". */
  seeEverything: string;
  /** The gallery's < and >, which have no visible text. */
  previousImage: string;
  nextImage: string;
};

/** The top card and the two behind it. */
const MOUNTED = 3;
/** Travel before a press is read as a horizontal or a vertical gesture. */
const LOCK_PX = 10;
/** Share of the card's width that commits a slow drag. */
const COMMIT_RATIO = 0.3;
const FLICK_PX_PER_MS = 0.5;
/** A flick still has to move the card, or a twitch on release would commit. */
const FLICK_MIN_PX = 24;
const VELOCITY_WINDOW_MS = 100;
const MAX_TILT_DEG = 12;
const FLY_MS = 260;
const SPRING_MS = 200;

/** Every link out to a maker's site. ./product-view.ts says why each word. */
const LINK_REL = "noopener noreferrer nofollow";

/**
 * One height whatever is on the card, so a card change never moves the page: a
 * 3:2 image box, a fixed body, and the 20px the two cards behind peek. Read
 * against the deck's own width through @container, which is why every use sits
 * inside an element carrying that class. The 12rem is that 20px plus a 172px
 * body: 20px padding top and bottom, four 24px lines of description (16px at
 * the 1.5 Thai floor) and the 32px footer row, with ~3px to spare. More body
 * than that is a fifth line the clamp would never show. ./loading.tsx writes
 * the same calc out by hand.
 */
const STAGE_HEIGHT = "[height:calc(66.6667cqw_+_12rem)]";

type Gesture = {
  pointerId: number;
  element: HTMLElement;
  startX: number;
  startY: number;
  lock: "x" | "y" | null;
  /** The x the drag is measured from, once locked. */
  originX: number;
  dx: number;
  width: number;
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

function writeHints(card: HTMLElement, tryIt: number, skip: number) {
  const hint = (name: string) =>
    card.querySelector<HTMLElement>(`[data-deck-hint="${name}"]`);
  const tryHint = hint("try");
  const skipHint = hint("skip");
  if (tryHint) tryHint.style.opacity = String(tryIt);
  if (skipHint) skipHint.style.opacity = String(skip);
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
  viewer,
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
  /** Who is reading, for the prompts: see ./DeckPrompts.tsx. */
  viewer: DeckViewer;
}) {
  const { selected, matches, select } = useProductFilter();
  const matching = useMemo(
    () => products.filter((p) => matches(p.bucket)),
    [products, matches],
  );
  const [announced, setAnnounced] = useState(() =>
    positionOf(matching, resumeIndex(matching, resumeAfter), labels),
  );
  /** The stack's root: where focus goes back to when a prompt closes. */
  const deckRef = useRef<HTMLDivElement>(null);
  const prompts = useDeckPrompts({
    products,
    viewer,
    category: selected,
    deckRef,
  });

  return (
    <div className="min-w-0">
      <p aria-live="polite" className="sr-only">
        {matching.length > 0 ? announced : labels.noneHereTitle}
      </p>
      {matching.length > 0 ? (
        <Stack
          key={selected ?? ""}
          products={matching}
          labels={labels}
          onAnnounce={setAnnounced}
          route={route}
          category={selected}
          resumeAfter={resumeAfter}
          rootRef={deckRef}
          locked={prompts.locked}
          onTried={prompts.tried}
        />
      ) : (
        <div className="@container mx-auto w-full max-w-[360px]">
          {/* The shelf has products and the filter excludes them all, so this
              asks the reader to widen it. The shelf being EMPTY is a different
              message that needs a maker instead, and ./ProductShelf.tsx renders
              that one: "try another category" on a shelf with nothing on it
              would send someone hunting through categories that are not
              there. */}
          <div className={STAGE_HEIGHT}>
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
      {prompts.dialog}
    </div>
  );
}

function Stack({
  products,
  labels,
  onAnnounce,
  route,
  category,
  resumeAfter,
  rootRef,
  locked,
  onTried,
}: {
  products: readonly DeckProduct[];
  labels: ProductDeckLabels;
  onAnnounce: (text: string) => void;
  route: DeckRoute;
  category: ProductCategory | null;
  resumeAfter: string | null;
  rootRef: RefObject<HTMLDivElement | null>;
  /** A prompt's modal is open: the deck takes no input. */
  locked: boolean;
  /** The product whose tab just opened. Not called for a blocked one. */
  onTried: (product: DeckProduct) => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // WHERE THE STACK STARTS: the server's read of `?after=` for the first paint,
  // then the ADDRESS, before the browser paints (below).
  const [index, setIndex] = useState(() => resumeIndex(products, resumeAfter));
  /** The product whose window.open() was blocked: the notice's link. */
  const [blocked, setBlocked] = useState<DeckProduct | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  /** What the handlers read. `index` is only this, rendered. */
  const indexRef = useRef(index);
  /** The `after` this deck last read from or wrote to the address. undefined
   *  until the first read, which always applies. */
  const knownAfter = useRef<string | null | undefined>(undefined);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);
  const flyTimer = useRef(0);
  const flying = useRef(false);
  const justDragged = useRef(false);
  const restoreFocus = useRef(false);

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
    const first = knownAfter.current === undefined;
    if (!first && after === knownAfter.current) return;
    knownAfter.current = after;
    const start = resumeIndex(products, after);
    if (start === indexRef.current) return;
    if (!first) {
      // An outside navigation: whatever was in flight is moot.
      gesture.current?.listeners.abort();
      gesture.current = null;
      clearTimeout(flyTimer.current);
      flying.current = false;
      setBlocked(null);
    }
    indexRef.current = start;
    setIndex(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the address is what moves the deck; a server refresh of `products` must not
  }, [searchParams]);

  useEffect(
    () => () => {
      gesture.current?.listeners.abort();
      cancelAnimationFrame(frame.current);
      clearTimeout(flyTimer.current);
    },
    [],
  );

  // The drag and fly-out styles have done their job once React has moved every
  // card along. Before paint, so nothing animates between the two states. Every
  // inline style a drag or a fly-out writes is cleared, and --depth set to the
  // card's place, because a jump back (Start over, an outside navigation) can
  // keep a card React does not re-style: its --depth prop did not change, but
  // its inline one did.
  useLayoutEffect(() => {
    stackOf(stageRef.current).forEach((card, depth) => {
      card.style.transition = "";
      card.style.transform = "";
      card.style.opacity = "";
      card.style.pointerEvents = "";
      card.style.setProperty("--depth", String(depth));
      writeHints(card, 0, 0);
    });
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    const root = rootRef.current;
    if (root && !root.contains(document.activeElement)) {
      root.focus({ preventScroll: true });
    }
  }, [index, rootRef]);

  // The three mounted first images are already loading (and the card next in
  // line fetches its others: ProductGallery's `preload`), so "next" is the
  // first image of the card that mounts behind them on the following swipe.
  //
  // These are the requests a swipe causes, and deleting this effect would not
  // remove them: the card that mounts a swipe later asks for the same image.
  // Plain GETs of public images, which say nothing about the swipe's direction.
  useEffect(() => {
    const next = products[index + MOUNTED]?.images[0];
    if (next) new window.Image().src = next;
  }, [products, index]);

  const current = products[index];
  const position = positionOf(products, index, labels);
  const announcement = blocked ? `${labels.blocked} ${position}` : position;

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
    writeAfterToAddress(productId);
  }

  /** Undefined while a card is in flight or being dragged, or a prompt is
   *  open: input then is lost rather than queued, so it can never skip a
   *  card. */
  function actionableProduct(): DeckProduct | undefined {
    if (locked || flying.current || gesture.current) return undefined;
    return products[indexRef.current];
  }

  function advance() {
    flying.current = false;
    // A card leaving the DOM takes its focused link with it, and the last
    // card takes Skip and Try with it too.
    restoreFocus.current =
      rootRef.current?.contains(document.activeElement) ?? false;
    indexRef.current += 1;
    setIndex(indexRef.current);
  }

  function flyOut(sign: 1 | -1) {
    flying.current = true;
    if (prefersReducedMotion()) {
      advance();
      return;
    }
    const [top, ...behind] = stackOf(stageRef.current);
    top.style.pointerEvents = "none";
    top.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1), opacity ${FLY_MS}ms ease-in`;
    top.style.transform = `translate3d(${sign * window.innerWidth}px, 0, 0) rotate(${sign * MAX_TILT_DEG}deg)`;
    top.style.opacity = "0";
    behind.forEach((card, i) => {
      card.style.transition = `transform ${FLY_MS}ms ease-out`;
      card.style.setProperty("--depth", String(i));
    });
    // A timer and not transitionend: trying a product backgrounds this tab,
    // where transitions stop progressing and the event would not come until
    // the reader is back.
    flyTimer.current = window.setTimeout(advance, FLY_MS);
  }

  function skip() {
    if (!actionableProduct()) return;
    setBlocked(null);
    flyOut(-1);
  }

  /** Right without a link to activate (a swipe, →): open the product's tab
   *  here, inside the gesture. See the header. */
  function tryProduct() {
    const product = actionableProduct();
    if (!product) return;
    const opened = window.open(product.href, "_blank");
    // In the same task as the open: before the new page can run, and before
    // the `visibilitychange` that hides this tab, which arrives in a later
    // task.
    if (opened) {
      opened.opener = null;
      onTried(product);
    }
    setBlocked(opened ? null : product);
    writeAfter(product.id);
    flyOut(1);
  }

  /** Right by a real link ("Try", the card): the browser opens the tab, and
   *  this only moves the deck on. */
  function onTryLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    const product = actionableProduct();
    if (!product) {
      // A double click would otherwise open this product twice, and a press
      // through a modal's backdrop would open one behind it.
      event.preventDefault();
      return;
    }
    onTried(product);
    setBlocked(null);
    writeAfter(product.id);
    flyOut(1);
  }

  /** The popup-blocked notice's link: the reader activated it, so the tab
   *  opens, and that is the try. */
  function onBlockedLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (locked || !blocked) {
      event.preventDefault();
      return;
    }
    onTried(blocked);
    setBlocked(null);
  }

  /** The footer row: the product's page on Cofoundee, in this tab. */
  function onPageLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (locked) {
      event.preventDefault();
      return;
    }
    // A new tab is the browser's; the deck stays where it is.
    if (!isPlainClick(event)) return;
    const product = actionableProduct();
    // next/link would navigate on its own (it stands down when the default is
    // prevented); this does it instead, after writing the position.
    event.preventDefault();
    if (!product) return;
    // BEFORE the push: this rewrites the deck's own entry, and once the push
    // lands the current entry is the product's page.
    writeAfter(product.id);
    router.push(pageHrefOf(product));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Alt+Left is the browser's Back, and a held key must not flood tabs.
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
      tryProduct();
    }
  }

  function startOver() {
    restoreFocus.current = true;
    indexRef.current = 0;
    setIndex(0);
    setBlocked(null);
    // Back at card 1, so the address must not resume anywhere else.
    writeAfter(null);
  }

  function paint(g: Gesture) {
    const [top, ...behind] = stackOf(stageRef.current);
    if (!top) return;
    const pull = Math.min(Math.abs(g.dx) / (g.width * COMMIT_RATIO), 1);
    // Full tilt at twice the commit distance, so it reads well before release.
    const lean = g.dx / (g.width * 2 * COMMIT_RATIO);
    const tilt = g.reducedMotion
      ? 0
      : Math.max(-1, Math.min(lean, 1)) * MAX_TILT_DEG;
    top.style.transform = `translate3d(${g.dx}px, 0, 0) rotate(${tilt}deg)`;
    writeHints(top, g.dx > 0 ? pull : 0, g.dx < 0 ? pull : 0);
    behind.forEach((card, i) =>
      card.style.setProperty("--depth", String(i + 1 - pull)),
    );
  }

  function springBack() {
    const [top, ...behind] = stackOf(stageRef.current);
    if (!top) return;
    const transition = prefersReducedMotion()
      ? ""
      : `transform ${SPRING_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1.25)`;
    top.style.transition = transition;
    top.style.transform = "";
    writeHints(top, 0, 0);
    behind.forEach((card, i) => {
      card.style.transition = transition;
      card.style.setProperty("--depth", String(i + 1));
    });
  }

  function endGesture(g: Gesture) {
    g.listeners.abort();
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    gesture.current = null;
    // The click a drag would produce comes straight after pointerup, inside
    // this same task. Later than that it would swallow a keyboard Enter.
    if (justDragged.current) {
      setTimeout(() => {
        justDragged.current = false;
      }, 0);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    if (locked || flying.current || gesture.current) return;
    if ((event.target as Element).closest("[data-deck-nodrag]")) return;

    justDragged.current = false;
    const g: Gesture = {
      pointerId: event.pointerId,
      element: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      lock: null,
      originX: event.clientX,
      dx: 0,
      width: event.currentTarget.offsetWidth,
      samples: [],
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
          if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_PX) return;
          // Either way this press is no longer a tap on the link.
          justDragged.current = true;
          if (Math.abs(dy) > Math.abs(dx)) {
            g.lock = "y";
            return;
          }
          g.lock = "x";
          // Measured from the lock point, so the card does not jump by the
          // travel it took to get here.
          g.originX = g.startX + Math.sign(dx) * LOCK_PX;
          // Left over from a spring-back, it would make every frame lag.
          for (const card of stackOf(stageRef.current)) {
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
        const dragging = g.lock === "x";
        if (dragging) g.dx = e.clientX - g.originX;
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
        // Still inside the pointerup: see "window.open in the pointerup
        // handler" in the header.
        if (g.dx > 0) tryProduct();
        else skip();
      },
      options,
    );

    window.addEventListener("pointercancel", cancel, options);
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
    if (!justDragged.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragStart(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={labels.deckName}
      tabIndex={0}
      onKeyDown={onKeyDown}
      // @container so the stage can be as tall as an image box at THIS width
      // needs.
      className="@container relative mx-auto w-full max-w-[360px] rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
    >
      <div ref={stageRef} className={`relative ${STAGE_HEIGHT}`}>
        {products.slice(index, index + MOUNTED).map((product, depth) => (
          <Card
            key={product.id}
            padding="none"
            data-deck-card=""
            data-gallery-scope=""
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
            className="group/card absolute inset-x-0 top-0 bottom-5 flex origin-bottom cursor-grab touch-pan-y flex-col border border-line shadow-lg select-none active:cursor-grabbing [transform:translateY(calc(var(--depth)_*_10px))_scale(calc(1_-_var(--depth)_*_0.04))]"
          >
            {/* Stretched, and a real link so a tap, a middle-click and
                assistive tech all work before hydration. */}
            <a
              href={product.href}
              target="_blank"
              rel={LINK_REL}
              aria-label={product.tryAria}
              draggable={false}
              onClick={onTryLinkClick}
              className="absolute inset-0 z-10 cursor-grab rounded-3xl active:cursor-grabbing"
            >
              {/* The image box's footprint, inside the link: the only way to
                  know the pointer is over the pictures, because the link
                  covers them (see components/ProductGallery.tsx). Same width
                  as the box (both sit inside the card's border) and the same
                  3:2, so the same height. */}
              <span
                data-gallery-zone=""
                className="block aspect-[3/2] w-full"
              />
            </a>

            <span
              data-deck-hint="try"
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-4 z-30 rounded-full bg-navy px-3 py-1.5 text-sm font-medium text-white opacity-0"
            >
              {labels.tryIt}
            </span>
            <span
              data-deck-hint="skip"
              aria-hidden="true"
              className="pointer-events-none absolute top-4 right-4 z-30 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-navy opacity-0"
            >
              {labels.skip}
            </span>

            <ProductGallery
              images={product.images}
              labels={labels}
              inactive={depth > 0}
              preload={depth === 1}
              sizes="360px"
              className="rounded-t-3xl"
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5">
              {/* The card's main text now: body size, ink. No leading-tight:
                  user-written, mostly Thai, so it keeps text-base's 1.5.
                  Clamped rather than truncated server-side, so the whole
                  description stays in the DOM for anyone who copies the
                  card's text; min-h-0 lets the clamp give way before the
                  footer is pushed off the card. */}
              {product.blurb && (
                <p className="line-clamp-4 min-h-0 text-base whitespace-pre-wrap text-ink">
                  {product.blurb}
                </p>
              )}

              <div className="mt-auto flex min-w-0 items-center pt-3">
                {/* The product's page, in this tab: see "THE RATING-AND-
                    COMMENTS ROW" in the header. Not prefetched: each card
                    mounting would otherwise fetch its page, and a skip must
                    not cause a request of its own. */}
                <Link
                  href={pageHrefOf(product)}
                  prefetch={false}
                  aria-label={product.footerAria}
                  data-deck-nodrag=""
                  draggable={false}
                  onClick={onPageLinkClick}
                  className="relative z-20 -my-2 inline-flex min-w-0 cursor-pointer items-center gap-4 py-2 text-sm"
                >
                  <CardFooterFace product={product} locale={locale} />
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {!current && (
          <Card className="absolute inset-x-0 top-0 bottom-5 grid place-items-center border border-line text-center shadow-lg">
            <h3 className="text-xl">{labels.endTitle}</h3>
          </Card>
        )}
      </div>

      {/* WCAG 2.5.7: everything the drag does also has a control that is not a
          drag. The end state keeps this row's height, so the page below it
          does not jump when the deck runs out. */}
      <div className="mt-3 flex gap-3">
        {current ? (
          <>
            <Button
              variant="secondary"
              fullWidth
              onClick={skip}
              className="flex-1"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
              {labels.skip}
            </Button>
            {/* An EXTERNAL, member-submitted href, so a plain <a> with
                target/rel rather than a client-routed <LinkButton>. */}
            <a
              href={current.href}
              target="_blank"
              rel={LINK_REL}
              aria-label={current.tryAria}
              draggable={false}
              onClick={onTryLinkClick}
              className={buttonClasses({
                fullWidth: true,
                className: "flex-1",
              })}
            >
              {labels.tryIt}
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            </a>
          </>
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

      {/* Over the stage rather than in the flow, so it cannot push the buttons
          out of the first viewport. */}
      {blocked && (
        <div className="absolute inset-x-3 top-3 z-10 rounded-xl border border-line bg-white p-3 text-sm shadow-lg">
          <p className="text-ink-muted">{labels.blocked}</p>
          <a
            href={blocked.href}
            target="_blank"
            rel={LINK_REL}
            aria-label={blocked.tryAria}
            onClick={onBlockedLinkClick}
            className="mt-1 inline-block text-navy underline underline-offset-2"
          >
            {fill(labels.openBlocked, { name: blocked.name })}
          </a>
        </div>
      )}
    </div>
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
