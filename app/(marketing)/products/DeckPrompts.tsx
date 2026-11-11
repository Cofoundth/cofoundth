"use client";

// What the deck asks a reader once they come back from trying a product.
//
// ── WHEN, EXACTLY ──────────────────────────────────────────────────────────
// CLAUDE.md, Language Rules: right on the deck opens the maker's product in a
// new tab, and "when the visitor comes back from trying it, a signed-in member
// is asked in a modal to rate and comment; a visitor who is not signed in is
// offered sign-in, at most once per visit". So the deck tells useDeckPrompts()
// which product was opened (`tried`), and the prompt waits for the deck's tab:
//
//   · it shows when the reader COMES BACK: the deck's tab was hidden or its
//     window lost focus after the product opened, and now it is visible and
//     focused again. Both signals are watched — `visibilitychange` and the
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
//
// Which modal:
//   signed in, `reviewable`   the review modal: stars (required), a comment
//                             box if the role may comment (canComment), send.
//                             `reviewable` was decided on the server: a role
//                             that canRate, and not the reader's own product.
//   signed in, not reviewable nothing, ever: their own product, or a role
//                             that may not rate (none today; lib/roles.ts).
//   not signed in             the sign-in modal, ONCE per page visit. The
//                             "once" is a ref in this component's memory and
//                             nowhere else — a reload or a fresh visit is a new
//                             visit, and nothing about it is written down.
//
// ── NOTHING HERE IS STORED, AND THE SWIPE STILL WRITES NOTHING ─────────────
// The swipe is still a browse gesture: what is remembered between the swipe
// and the return is one product id, in a ref, for as long as the page lives.
// A rating is given by tapping a star and pressing send, in the modal —
// deliberately, the same action (setProductRatingAction) as the stars on the
// product's page, with the same server-side checks and 0079's RLS behind it.
// Until 0079 is applied that action fails, and the modal says so in words
// without losing what was typed.
//
// ── COMING BACK FROM SIGNING IN ────────────────────────────────────────────
// The sign-in modal's links carry `next=` deckReviewPath(): /products, the
// category, `after=` this product and `review=` this product. Signed in, the
// deck opens the review modal from `review=` on mount and removes it at once
// (./deck-position.ts takeReviewFromAddress), so a reload does not reopen it.
// A founder who has not onboarded meets /onboarding first, whichever way they
// signed in: signupAction wraps `next` in it, and signInAction and the OAuth
// callback do the same for an account that owes it (lib/roles.ts
// owesOnboarding, lib/auth-href.ts throughOnboarding). Onboarding's finish
// then follows `next` back here. /products itself has no onboarding gate, so
// without those wraps a new Google sign-up landed straight in the review modal.
//
// ── THE MODALS ─────────────────────────────────────────────────────────────
// components/ui/Dialog.tsx, as the join dialog on /p/<id> uses it: focus moves
// in and is trapped, Escape closes. The overlay surface (Dialog's default —
// rounded-xl, border-line, shadow-lg; CLAUDE.md "Surfaces"), not the join
// dialog's card surface: these float over a page the reader is using. Focus
// goes back to the deck when one closes. The review modal does NOT close on a
// click on the backdrop: a stray tap there would throw away a typed comment,
// so only Escape and "Maybe later" close it. While either is open the deck's
// keys and gestures do nothing (ProductDeck's `locked`).
//
// ── DEV SAMPLES ────────────────────────────────────────────────────────────
// A fixture (./fixtures.ts) has no row, so nothing about it can be saved. In
// development its review modal still opens, so the flow can be looked at, with
// send disabled and a sentence saying why. `sample` is computed on the server
// and is false in a production build, where there are no fixtures at all.

import {
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
import { createPostCommentAction } from "@/lib/post-actions";
import { MAX_RATING, type ProductCategory } from "@/lib/post-types";
import { setProductRatingAction } from "@/app/(app)/community/[id]/actions";
import { deckReviewPath, takeReviewFromAddress } from "./deck-position";

/** How long after a product opens the deck waits to see the reader leave
 *  (this tab hidden, or this window blurred). If they have not left by then,
 *  the product opened somewhere they are not looking, and the prompt shows
 *  now. Long enough for a foreground tab to take focus on a slow machine. */
export const AWAY_GRACE_MS = 1500;

/** What a prompt needs to know about a product. A subset of DeckProduct, so
 *  this file does not import the deck. */
export type PromptProduct = {
  id: string;
  name: string;
  reviewable: boolean;
  myScore: number | null;
  sample: boolean;
};

export type DeckViewer = {
  signedIn: boolean;
  /** canComment(role): the review modal's comment box. False when signed out. */
  canComment: boolean;
};

type Prompt =
  | { kind: "review"; product: PromptProduct }
  | { kind: "signin"; product: PromptProduct };

const STARS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

/** A server action that threw (offline, a dropped request) rather than
 *  answering with its own error. An existing dictionary key. */
const UNREACHABLE = "Something went wrong. Try again.";

/**
 * The deck's prompts. Returns `tried` for the deck to call the moment a
 * product's tab opens, `locked` while a modal is open, and the modal itself.
 */
export function useDeckPrompts({
  products,
  viewer,
  category,
  deckRef,
}: {
  /** The WHOLE shelf, not the filtered deck: `?review=` can name any of it. */
  products: readonly PromptProduct[];
  viewer: DeckViewer;
  category: ProductCategory | null;
  /** Where focus goes when a modal closes, unless it is already inside. */
  deckRef: RefObject<HTMLElement | null>;
}): {
  /** The product whose tab just opened. A blocked popup is not a try. */
  tried: (product: PromptProduct) => void;
  locked: boolean;
  dialog: ReactNode;
} {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  /** Scores saved from a modal during this visit, so reopening one for the
   *  same product (after Start over) shows what was just given. */
  const [saved, setSaved] = useState<Record<string, number>>({});
  const promptRef = useRef<Prompt | null>(null);
  const pending = useRef<PromptProduct | null>(null);
  /** The reader left after `pending` opened: this tab hidden or window blurred. */
  const away = useRef(false);
  const graceTimer = useRef<number | undefined>(undefined);
  const signInOffered = useRef(false);
  const wasOpen = useRef(false);

  const show = useCallback(
    (product: PromptProduct) => {
      if (promptRef.current) return; // never two at once
      let next: Prompt | null = null;
      if (viewer.signedIn) {
        if (product.reviewable) next = { kind: "review", product };
      } else if (!signInOffered.current) {
        signInOffered.current = true;
        next = { kind: "signin", product };
      }
      if (!next) return;
      promptRef.current = next;
      setPrompt(next);
    },
    [viewer.signedIn],
  );

  const close = useCallback(() => {
    promptRef.current = null;
    setPrompt(null);
  }, []);

  const tried = useCallback(
    (product: PromptProduct) => {
      pending.current = product;
      away.current = false;
      window.clearTimeout(graceTimer.current);
      graceTimer.current = window.setTimeout(() => {
        if (away.current || pending.current !== product) return;
        pending.current = null;
        show(product);
      }, AWAY_GRACE_MS);
    },
    [show],
  );

  useEffect(() => {
    function leave() {
      if (pending.current) away.current = true;
    }
    function back() {
      if (document.visibilityState === "hidden") return;
      const product = pending.current;
      if (!product || !away.current) return;
      // Answered: a second return is not a second try.
      pending.current = null;
      away.current = false;
      window.clearTimeout(graceTimer.current);
      show(product);
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

  // `?review=` — the way back from the sign-in modal. Read and removed once,
  // on mount; see the header.
  useEffect(() => {
    const id = takeReviewFromAddress();
    if (!id || !viewer.signedIn) return;
    const product = products.find((p) => p.id === id);
    if (product) show(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount: the parameter is consumed by this read
  }, []);

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
    const deck = deckRef.current;
    if (deck && !deck.contains(document.activeElement)) {
      deck.focus({ preventScroll: true });
    }
  }, [prompt, deckRef]);

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
        canComment={viewer.canComment}
        onSaved={onSaved}
        onClose={close}
      />
    );
  } else if (prompt?.kind === "signin") {
    dialog = (
      <SignInDialog
        product={prompt.product}
        next={deckReviewPath(prompt.product.id, category)}
        onClose={close}
      />
    );
  }

  return { tried, locked: prompt !== null, dialog };
}

/** "How was X?", five stars, an optional comment, send. */
function ReviewDialog({
  product,
  initialScore,
  canComment,
  onSaved,
  onClose,
}: {
  product: PromptProduct;
  initialScore: number | null;
  canComment: boolean;
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
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [commentPosted, setCommentPosted] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = hover ?? score ?? 0;
  const text = comment.trim();
  const canSend = score !== null && !product.sample && !isPending;

  // Not while a save is in flight: closing then would drop its answer, and
  // with it any error the reader needs to see.
  const dismiss = () => {
    if (!isPending) onClose();
  };

  const send = () => {
    if (!canSend || score === null) return;
    startTransition(async () => {
      setRatingError(null);
      setCommentError(null);
      let ok = true;
      if (score !== savedScore) {
        const res = await setProductRatingAction(product.id, score).catch(
          () => ({ error: UNREACHABLE }),
        );
        if (res?.error) {
          ok = false;
          setRatingError(res.error);
        } else {
          setSavedScore(score);
          onSaved(product.id, score);
        }
      }
      // Independent of the rating: a comment is its own thing, and a rating
      // that failed is no reason not to post what they wrote.
      if (canComment && text && !commentPosted) {
        const fd = new FormData();
        fd.set("content", text);
        const res = await createPostCommentAction(product.id, null, fd).catch(
          () => ({ error: UNREACHABLE }),
        );
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
        <Button onClick={send} disabled={!canSend}>
          {isPending ? tr("Sending…") : tr("Send")}
        </Button>
      </div>
    </Dialog>
  );
}

/** "How was X?" for a visitor who is not signed in: the way in, once. */
function SignInDialog({
  product,
  next,
  onClose,
}: {
  product: PromptProduct;
  /** deckReviewPath(): back to this deck, with this product's review open. */
  next: string;
  onClose: () => void;
}) {
  const tr = useT();
  const titleId = useId();

  return (
    <Dialog onClose={onClose} labelledBy={titleId} size="sm">
      <h3 id={titleId} className="mb-2 text-xl">
        {tr("How was {name}?").replace("{name}", () => product.name)}
      </h3>
      <p className="mb-6 text-sm text-ink-muted">
        {tr("Sign in to rate {name} and comment on it.").replace(
          "{name}",
          () => product.name,
        )}
      </p>
      <div className="space-y-3">
        <LinkButton href={authHref("/signup", next)} fullWidth>
          {tr("Join Cofoundee")}
        </LinkButton>
        <LinkButton
          href={authHref("/login", next)}
          variant="secondary"
          fullWidth
        >
          {tr("Sign in")}
        </LinkButton>
        <Button variant="ghost" fullWidth onClick={onClose}>
          {tr("Maybe later")}
        </Button>
      </div>
    </Dialog>
  );
}
