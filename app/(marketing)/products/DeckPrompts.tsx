"use client";

// What we ask a reader once they come back from trying a product.
//
// ── WHEN, EXACTLY ──────────────────────────────────────────────────────────
// The deck and product page tell useProductPrompts() which product was opened.
// Members are offered feedback on return. Guests get one sign-in invite
// after a right-swipe try:
//
//   · it shows when the reader COMES BACK: the deck's tab was hidden or its
//     window lost focus after the product opened, and now it is visible again
//     or focus has returned. Both signals are watched — `visibilitychange` and the
//     window's `blur`/`focus` — because a product that opens in a separate
//     window leaves this tab "visible" the whole time, and only focus moves.
//     There is no minimum time away: an earlier version waited for 5 seconds
//     and the owner, testing, reasonably came back sooner and saw nothing.
//   · if the reader never leaves at all (the product opened in a background
//     tab), the prompt shows here after AWAY_GRACE_MS instead of waiting for a
//     return that is not coming.
//   · it is about the MOST RECENT product opened. Several opened in a row
//     (background tabs, a Ctrl-click) and then one return is one prompt, for
//     the last of them; the rest are dropped, not queued.
//   · ONE modal at a time. A return while one is open shows nothing new.
//   · a product whose tab never opened (the popup was blocked, so there is a
//     fallback link instead) is not "tried" until that link is followed.
//   · scanning a QR code happens off-device. "I've tried it" in the handoff
//     dialog explicitly requests the review without waiting for a tab return.
//
// Which modal:
//   signed in, `reviewable`   stars and, after a try, a comment box for
//                             eligible members who liked the product.
//                             `reviewable` was decided on the server: a role
//                             that canRate, and not the reader's own product.
//   signed in, not reviewable nothing, ever: their own product, or a role
//                             that may not rate (none today; lib/roles.ts).
// Guests can try products and choose to sign in from the feedback controls
// on the product page.
//
// ── SAVING FEEDBACK ──────────────────────────────────────────────────────
// A rating is given by tapping a star and pressing send, in the modal —
// deliberately, the same action (setProductRatingAction) as the stars on the
// product's page, with the same server-side checks and row-level security.
//
// An anonymous try is remembered in this tab if the reader later signs in
// from the same product.
//
// ── THE MODALS ─────────────────────────────────────────────────────────────
// components/ui/Dialog.tsx, as the join dialog on /p/<id> uses it: focus moves
// in and is trapped, Escape closes. The overlay surface (Dialog's default —
// rounded-xl, border-line, shadow-lg; CLAUDE.md "Surfaces"), not the join
// dialog's card surface: these float over a page the reader is using. Focus
// goes back to the deck when one closes. The review modal does NOT close on a
// click on the backdrop: a stray tap there would throw away a typed comment,
// so only Escape and "Maybe later" close it. While either is open the deck's
// keys and gestures do nothing (ProductDeck's `locked`). A try from the
// product details opens the prompt over the details, using Dialog's stack.
//
// ── DEV SAMPLES ────────────────────────────────────────────────────────────
// A fixture (./fixtures.ts) has no row, so nothing about it can be saved. In
// development its review modal still opens, so the flow can be looked at, with
// send disabled and a sentence saying why. `sample` is computed on the server
// and is false in a production build, where there are no fixtures at all.

import {
  createContext,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
import { Star } from "lucide-react";
import { Button, Dialog, LinkButton, Textarea } from "@/components/ui";
import { authHref } from "@/lib/auth-href";
import { useT } from "@/lib/i18n-client";
import { createPostCommentAction, recordProductTryAction } from "@/lib/post-actions";
import { TRY_BEFORE_COMMENTING } from "@/lib/product-tries";
import { MAX_RATING } from "@/lib/post-types";
import { setProductRatingAction } from "@/app/(app)/community/[id]/actions";
import { useRouter } from "next/navigation";
import { PRODUCT_PARAM, productCardHref, takeReviewFromAddress } from "./deck-position";

/** How long after a product opens the deck waits to see the reader leave
 *  (this tab hidden, or this window blurred). If they have not left by then,
 *  the product opened somewhere they are not looking, and the prompt shows
 *  now. Long enough for a foreground tab to take focus on a slow machine. */
export const AWAY_GRACE_MS = 1500;
const GUEST_TRY_KEY = "cofoundee:recent-product-try";

/** What a prompt needs to know about a product. A subset of DeckProduct, so
 *  this file does not import the deck. */
export type PromptProduct = {
  id: string;
  name: string;
  reviewable: boolean;
  liked: boolean;
  myScore: number | null;
  sample: boolean;
};

export type DeckViewer = {
  signedIn: boolean;
  /** canComment(role): the review modal's comment box. False when signed out. */
  canComment: boolean;
};

export type ProductTryOptions = {
  fromDetails?: boolean;
  fromSwipe?: boolean;
  requestReview?: boolean;
  /** A swipe may still be saving its like when the reader comes back. */
  liking?: Promise<boolean>;
};

export type ProductTry = (product: PromptProduct, options?: ProductTryOptions) => void;

/** Share the deck's prompt with Try it inside the product details dialog. */
export const DeckProductTry = createContext<ProductTry | null>(null);

type Try = { product: PromptProduct; recording?: Promise<boolean> } & ProductTryOptions;
type Prompt =
  | { kind: "review"; product: PromptProduct; recording?: Promise<boolean> }
  | { kind: "signin"; product: PromptProduct };

function readerIsAway(): boolean {
  return document.visibilityState === "hidden" || !document.hasFocus();
}

const STARS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

/** A server action that threw (offline, a dropped request) rather than
 *  answering with its own error. An existing dictionary key. */
const UNREACHABLE = "Something went wrong. Try again.";

/**
 * Returns `tried` to call when a tab opens or the reader requests a review
 * from the QR handoff, `locked` while a prompt is open, and the prompt itself.
 */
export function useProductPrompts({
  products,
  viewer,
  deckRef,
  productModalId = null,
  standaloneProductId,
}: {
  /** The WHOLE shelf, not the filtered deck: `?review=` can name any of it. */
  products: readonly PromptProduct[];
  viewer: DeckViewer;
  /** Where focus goes when a modal closes, unless it is already inside. */
  deckRef?: RefObject<HTMLElement | null>;
  /** The details currently open, including while they load. */
  productModalId?: string | null;
  /** The product on a standalone detail route. */
  standaloneProductId?: string;
}): {
  tried: ProductTry;
  locked: boolean;
  dialog: ReactNode;
} {
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  /** Scores saved from a modal during this visit, so reopening one for the
   *  same product (after Start over) shows what was just given. */
  const [saved, setSaved] = useState<Record<string, number>>({});
  const promptRef = useRef<Prompt | null>(null);
  const latestTry = useRef<Try | null>(null);
  const pending = useRef<Try | null>(null);
  /** The reader left after `pending` opened: this tab hidden or window blurred. */
  const away = useRef(false);
  const graceTimer = useRef<number | undefined>(undefined);
  const guestInviteShown = useRef(false);
  const wasOpen = useRef(false);

  // The product's own page open over the deck (./ProductModal.tsx): a prompt
  // that comes due then — a try opened in a background tab, whose grace timer
  // ends while the reader is reading another product — waits for it to close
  // rather than opening on top of it.
  const productModalRef = useRef(productModalId);
  const deferred = useRef<Try | null>(null);
  useEffect(() => {
    productModalRef.current = productModalId;
  }, [productModalId]);

  const show = useCallback(
    (attempt: Try) => {
      const { product } = attempt;
      if (viewer.signedIn ? !product.reviewable : !attempt.fromSwipe || guestInviteShown.current)
        return;

      function present(swipeLiked = false) {
        if (promptRef.current) return;
        if (attempt.liking && latestTry.current !== attempt) return;
        const modalId = productModalRef.current;
        if (modalId && (!attempt.fromDetails || modalId !== product.id)) {
          deferred.current = attempt;
          return;
        }
        const next: Prompt = viewer.signedIn
          ? {
              kind: "review",
              product: swipeLiked ? { ...product, liked: true } : product,
              recording: attempt.recording,
            }
          : { kind: "signin", product };
        if (next.kind === "signin") guestInviteShown.current = true;
        promptRef.current = next;
        setPrompt(next);
      }

      if (attempt.liking) void attempt.liking.then(present);
      else present();
    },
    [viewer.signedIn],
  );

  const close = useCallback(() => {
    promptRef.current = null;
    setPrompt(null);
  }, []);

  // ...and is asked once the product's modal has closed.
  useEffect(() => {
    if (productModalId || !deferred.current) return;
    const attempt = deferred.current;
    deferred.current = null;
    show(attempt);
  }, [productModalId, show]);

  const record = useCallback((product: PromptProduct, fromDetails = false) => {
    if (!viewer.canComment) return undefined;
    if (product.sample) return Promise.resolve(true);
    return recordProductTryAction(product.id).then((ok) => {
      if (ok && (standaloneProductId === product.id || (fromDetails && productModalRef.current === product.id))) {
        router.refresh();
      }
      return ok;
    }).catch(() => false);
  }, [standaloneProductId, router, viewer.canComment]);

  const tried = useCallback<ProductTry>(
    (product, options) => {
      if (!viewer.signedIn) {
        try {
          sessionStorage.setItem(GUEST_TRY_KEY, product.id);
        } catch {
          // Storage can be disabled; the member can try again after sign-in.
        }
        if (!options?.fromSwipe || guestInviteShown.current) return;
      }
      const attempt = {
        product,
        ...options,
        recording: viewer.signedIn ? record(product, options?.fromDetails) : undefined,
      };
      latestTry.current = attempt;
      deferred.current = null;
      window.clearTimeout(graceTimer.current);
      if (attempt.requestReview) {
        pending.current = null;
        away.current = false;
        show(attempt);
        return;
      }
      pending.current = attempt;
      // window.open can move focus before its caller has registered the try.
      away.current = readerIsAway();
      graceTimer.current = window.setTimeout(() => {
        if (pending.current !== attempt) return;
        if (readerIsAway()) {
          away.current = true;
          return;
        }
        pending.current = null;
        away.current = false;
        show(attempt);
      }, AWAY_GRACE_MS);
    },
    [record, show, viewer.signedIn],
  );

  useEffect(() => {
    function leave() {
      if (pending.current) away.current = true;
    }
    function back() {
      if (document.visibilityState === "hidden") return;
      const attempt = pending.current;
      if (!attempt || !away.current) return;
      // Answered: a second return is not a second try.
      pending.current = null;
      away.current = false;
      window.clearTimeout(graceTimer.current);
      show(attempt);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") leave();
      else back();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      window.clearTimeout(graceTimer.current);
    };
  }, [show]);

  // A previous guest try counts after signing in on that same product.
  // Older `?review=` links also open the review once.
  useEffect(() => {
    if (!viewer.signedIn) return;
    const reviewId = takeReviewFromAddress();
    const id = reviewId ?? productModalId ?? standaloneProductId;
    if (!id) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    let triedAsGuest = false;
    try {
      triedAsGuest = sessionStorage.getItem(GUEST_TRY_KEY) === id;
      if (triedAsGuest) sessionStorage.removeItem(GUEST_TRY_KEY);
    } catch {
      // A review link by itself does not establish a try.
    }
    const fromDetails = productModalId === id;
    const recording = triedAsGuest ? record(product, fromDetails) : undefined;
    if (reviewId) show({ product, fromDetails, recording });
  }, [products, viewer.signedIn, productModalId, standaloneProductId, record, show]);

  // Focus back to the deck once a modal has closed. Dialog hands focus back
  // to whatever had it when it opened (its own cleanup, which runs before
  // this effect); on a return from another tab that is often <body>.
  useEffect(() => {
    if (prompt) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (productModalId) return;
    const deck = deckRef?.current;
    if (deck && !deck.contains(document.activeElement)) {
      deck.focus({ preventScroll: true });
    }
  }, [prompt, deckRef, productModalId]);

  const onSaved = useCallback((id: string, score: number) => {
    setSaved((s) => ({ ...s, [id]: score }));
  }, []);

  let dialog: ReactNode = null;
  if (prompt?.kind === "review") {
    const product = prompt.product;
    dialog = (
      <ReviewDialog
        // A fresh form for each product, never one product's stars carried
        // into the next.
        key={product.id}
        product={product}
        initialScore={saved[product.id] ?? product.myScore}
        recording={prompt.recording}
        onSaved={onSaved}
        onClose={close}
      />
    );
  } else if (prompt?.kind === "signin") {
    dialog = <SignInDialog product={prompt.product} onClose={close} />;
  }

  return { tried, locked: prompt !== null, dialog };
}

/** Feedback after a try, with rating available to members who liked it. */
function ReviewDialog({
  product,
  initialScore,
  recording,
  onSaved,
  onClose,
}: {
  product: PromptProduct;
  initialScore: number | null;
  recording?: Promise<boolean>;
  onSaved: (id: string, score: number) => void;
  onClose: () => void;
}) {
  const tr = useT();
  const titleId = useId();
  const starsLabelId = useId();
  const commentLabelId = useId();
  const [score, setScore] = useState<number | null>(initialScore);
  // A mouse's hover preview only: on touch a pointerenter fires on the tap and
  // no leave follows, so a preview would stick (the same rule as the product
  // page's RatingControl).
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  /** What has already gone through, so a retry after a partial failure
   *  re-sends only what failed — above all, never the same comment twice. */
  const [savedScore, setSavedScore] = useState<number | null>(initialScore);
  const [commentPosted, setCommentPosted] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = hover ?? score ?? 0;
  const text = comment.trim();
  const canRate = product.liked || product.sample;
  const canComment = canRate && recording !== undefined;
  const canSendComment = canComment && !!text && !commentPosted;
  const newScore = score !== savedScore ? score : null;
  const canSend = product.liked && !product.sample && !isPending &&
    (newScore !== null || canSendComment);

  // Not while a save is in flight: closing then would drop its answer, and
  // with it any error the reader needs to see.
  const dismiss = () => {
    if (!isPending) onClose();
  };

  const send = () => {
    if (!canSend) return;
    startTransition(async () => {
      setRatingError(null);
      setCommentError(null);
      let ok = true;
      if (newScore !== null) {
        const res = await setProductRatingAction(product.id, newScore).catch(
          () => ({ error: UNREACHABLE }),
        );
        if (res?.error) {
          ok = false;
          setRatingError(res.error);
        } else {
          setSavedScore(newScore);
          onSaved(product.id, newScore);
        }
      }
      // Independent of the rating: a comment is its own thing, and a rating
      // that failed is no reason not to post what they wrote.
      if (canSendComment) {
        const fd = new FormData();
        fd.set("content", text);
        const res = (await recording)
          ? await createPostCommentAction(product.id, null, fd).catch(() => ({ error: UNREACHABLE }))
          : { error: TRY_BEFORE_COMMENTING };
        if (res?.error) {
          ok = false;
          setCommentError(res.error);
        } else {
          setCommentPosted(true);
        }
      }
      if (ok) onClose();
    });
  };

  return (
    <Dialog
      onClose={dismiss}
      dismissible={false}
      onEscape={dismiss}
      labelledBy={titleId}
      size="md"
    >
      <h3 id={titleId} className="mb-5 text-xl">
        {tr("How was {name}?").replace("{name}", () => product.name)}
      </h3>

      {canRate ? (
        <>
          <p id={starsLabelId} className="mb-2 text-sm text-ink-muted">
            {tr("Your rating")}
          </p>
          <div
            role="group"
            aria-labelledby={starsLabelId}
            className="-mx-1.5 flex items-center"
            onPointerLeave={() => setHover(null)}
          >
            {STARS.map((n) => (
              <button
                key={n}
                type="button"
                aria-label={tr("Rate {n} out of 5").replace("{n}", String(n))}
                aria-pressed={score === n}
                onClick={() => {
                  if (!isPending) setScore(n);
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setHover(n);
                }}
                className="grid h-12 w-12 place-items-center text-navy transition-colors hover:bg-cream"
              >
                <Star
                  aria-hidden="true"
                  className="h-8 w-8"
                  fill={n <= shown ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-muted">{tr("Swipe right on the product card to like it.")}</p>
          <LinkButton href={productCardHref(product.id)} onClick={dismiss} variant="secondary" size="sm">
            {tr("Open product card")}
          </LinkButton>
        </div>
      )}
      {ratingError && (
        <p role="alert" className="mt-2 text-sm text-danger-ink">
          {tr(ratingError)}
        </p>
      )}

      {canComment && (
        <div className="mt-5">
          <p id={commentLabelId} className="mb-2 text-sm text-ink-muted">
            {tr("Add a comment (optional)")}
          </p>
          <Textarea
            aria-labelledby={commentLabelId}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            readOnly={commentPosted}
            rows={3}
            maxLength={2000}
            resize="y"
            placeholder={tr("What worked, and what would you change?")}
          />
          {commentPosted && (
            <p className="mt-2 text-sm text-ink-muted">
              {tr("Your comment is posted.")}
            </p>
          )}
          {commentError && (
            <p role="alert" className="mt-2 text-sm text-danger-ink">
              {tr(commentError)}
            </p>
          )}
        </div>
      )}

      {product.sample && (
        <p className="mt-5 text-sm text-ink-muted">
          {tr("This is a sample product, so nothing here is saved.")}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={dismiss} aria-disabled={isPending}>
          {tr("Maybe later")}
        </Button>
        {canRate && (
          <Button onClick={send} disabled={!canSend}>
            {isPending ? tr("Sending…") : tr("Send")}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

function SignInDialog({ product, onClose }: { product: PromptProduct; onClose: () => void }) {
  const tr = useT();
  const titleId = useId();
  const next = `/products?${new URLSearchParams({ [PRODUCT_PARAM]: product.id })}`;
  const productName = () => product.name;

  return (
    <Dialog onClose={onClose} labelledBy={titleId} size="sm">
      <h3 id={titleId} className="mb-2 text-xl">
        {tr("How was {name}?").replace("{name}", productName)}
      </h3>
      <p className="mb-6 text-sm text-ink-muted">
        {tr("Sign in to rate {name} and comment on it.").replace("{name}", productName)}
      </p>
      <div className="space-y-3">
        <LinkButton href={authHref("/login", next)} fullWidth>
          {tr("Sign in")}
        </LinkButton>
        <LinkButton href={authHref("/signup", next)} variant="secondary" fullWidth>
          {tr("Join Cofoundee")}
        </LinkButton>
        <Button variant="ghost" fullWidth onClick={onClose}>
          {tr("Maybe later")}
        </Button>
      </div>
    </Dialog>
  );
}
