// A product's PUBLIC rating, read-only: "★ 4.3 (12)", or "☆ No ratings yet".
//
// No "use client" and no hooks, so ONE component renders it on a server page
// (/p/<id>, /community/<id>) and inside a client tree (the deck) alike. The
// caller passes the locale it already has: getLocale() on the server,
// useLocale() on the client.
//
// The rules it holds, from CLAUDE.md's "Founder decision (2026-11-10)":
//   * the count ALWAYS travels with the average — a 5.0 from one person and a
//     4.3 from 1,204 people must not look alike;
//   * zero ratings is an OUTLINE star and "No ratings yet", never "0.0";
//   * neutral palette only. The star is navy (= ink), filled or outlined — no
//     gold, no yellow, no accent hue. Weight carries the emphasis, as
//     everywhere else in the app.
//
// The visible "4.3 (12)" is cryptic read aloud, so it is aria-hidden and the
// full sentence ("4.3 out of 5 from 12 ratings") is in an sr-only span beside
// it. productRatingLabel() is that sentence, exported so a control that carries
// the rating inside a larger accessible name can say the same words.

import { Star } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import type { ProductRating } from "@/lib/post-types";
import { cn } from "@/components/ui";

/** "1,204", in every locale — the digits are the same in th and en, and a
 *  fixed locale keeps the server's markup and the client's identical. */
function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function isRated(
  rating: ProductRating,
): rating is { average: number; count: number } {
  return rating.average !== null && rating.count > 0;
}

/** The rating as one spoken sentence, in `locale`. */
export function productRatingLabel(
  rating: ProductRating,
  locale: Locale,
): string {
  if (!isRated(rating)) return t("No ratings yet", locale);
  return t(
    rating.count === 1
      ? "{avg} out of 5 from {n} rating"
      : "{avg} out of 5 from {n} ratings",
    locale,
  )
    .replace("{avg}", rating.average.toFixed(1))
    .replace("{n}", formatCount(rating.count));
}

export function ProductRatingSummary({
  rating,
  locale,
  className,
}: {
  rating: ProductRating;
  locale: Locale;
  /** Layout only (margins, text size). The colours are the rule above. */
  className?: string;
}) {
  const rated = isRated(rating);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Star
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-navy"
        fill={rated ? "currentColor" : "none"}
        strokeWidth={1.5}
      />
      {rated ? (
        <>
          <span aria-hidden="true" className="tabular-nums">
            <span className="font-semibold text-ink">
              {rating.average.toFixed(1)}
            </span>{" "}
            <span className="text-ink-muted">({formatCount(rating.count)})</span>
          </span>
          <span className="sr-only">{productRatingLabel(rating, locale)}</span>
        </>
      ) : (
        <span className="text-ink-muted">{t("No ratings yet", locale)}</span>
      )}
    </span>
  );
}
