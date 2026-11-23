"use client";

// A like unlocks the product's rating control. Members can take back their
// own rating after unliking.
//
// Buttons, not radios: a radio group changes its value on every arrow key, and
// each change here is a database write. Five buttons are five deliberate
// choices; aria-pressed marks the one that is yours.

import { useId, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { productCardHref } from "@/app/(marketing)/products/deck-position";
import { useT } from "@/lib/i18n-client";
import { MAX_RATING } from "@/lib/post-types";
import { clearProductRatingAction, setProductRatingAction } from "./actions";

const STARS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

export function RatingControl({
  postId,
  initialScore,
  liked,
  canTry,
}: {
  postId: string;
  /** The member's own current score, or null when they have not rated it. */
  initialScore: number | null;
  liked: boolean;
  canTry: boolean;
}) {
  const tr = useT();
  const labelId = useId();
  const [score, setOptimisticScore] = useOptimistic<
    number | null,
    number | null
  >(initialScore, (_, next) => next);
  // Hover PREVIEW only, and only for a mouse: on touch, pointerenter fires on
  // the tap and no leave ever follows, so a preview would stick on screen.
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = hover ?? score ?? 0;

  // Ignored while a save is in flight rather than `disabled`: disabling the
  // focused button drops keyboard focus to <body> mid-interaction.
  const commit = (next: number | null) => {
    if (isPending || next === score || (next !== null && !liked)) return;
    startTransition(async () => {
      setError(null);
      setOptimisticScore(next);
      const res =
        next === null
          ? await clearProductRatingAction(postId)
          : await setProductRatingAction(postId, next);
      // On failure the optimistic value falls back to `initialScore` by
      // itself when the transition ends; only the message needs saying.
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {liked ? (
          <>
            <span id={labelId} className="text-sm text-ink-muted">
              {tr("Your rating")}
            </span>
            <div
              role="group"
              aria-labelledby={labelId}
              aria-busy={isPending}
              className="-mx-1 flex items-center"
              onPointerLeave={() => setHover(null)}
            >
              {STARS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={tr("Rate {n} out of 5").replace("{n}", String(n))}
                  aria-pressed={score === n}
                  onClick={() => commit(n)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setHover(n);
                  }}
                  className="grid h-10 w-10 place-items-center text-navy transition-colors hover:bg-cream"
                >
                  <Star
                    aria-hidden="true"
                    className="h-6 w-6"
                    fill={n <= shown ? "currentColor" : "none"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </>
        ) : canTry ? (
          <p className="text-sm text-ink-muted">
            {tr("Try the product, then choose Like and send in the review.")}
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">{tr("Swipe right on the product card to like it.")}</p>
            <Link href={productCardHref(postId)} className="text-sm text-navy underline underline-offset-4">
              {tr("Open product card")}
            </Link>
          </>
        )}
        {score !== null && (
          <button
            type="button"
            onClick={() => commit(null)}
            className="px-1 py-2 text-sm text-ink-muted underline decoration-line underline-offset-4 hover:text-navy"
          >
            {tr("Remove my rating")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger-ink">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
