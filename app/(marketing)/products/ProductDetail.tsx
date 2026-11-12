// A product's page: the part /p/<id> (anyone) and /community/<id> (members)
// share, so the product looks the same whichever of the two a reader is on.
//
// ── WHAT THE PAGE IS FOR, IN THE ORDER IT SHOWS IT ─────────────────────────
// The deck card itself opens the maker's product in a new tab (CLAUDE.md,
// Language Rules); its rating-and-comments row, and any shared product link,
// open THIS page: the whole product, with every comment. A visitor here may
// not have tried it yet, so the order on the page is the order of what they
// came to do:
//
//   1. a way back to the deck, at the top, to the card after this one
//   2. the images — every one, in the same gallery as the deck card
//   3. the name and the description
//   4. "Try it": the one way out to the maker's site, and the primary button
//   5. the rating, and the door to giving one (`rateSlot`)
//   6. whatever the page adds (`children`: who made it, likes, share)
//
// plus, above all of it and only for the maker who has just added it from
// /products/new, the confirmation /community/<id> passes as `notice`.
//
// and the comments come after the card, from each page, because the two pages
// hold different conversations: a preview behind a sign-in on /p/<id>, the
// whole thread and the composer on /community/<id>.
//
// ── ONE COLUMN ON A PHONE, TWO FROM `lg` ───────────────────────────────────
// Stacked, a 3:2 gallery at the narrow column's 560px is 373px tall, and at
// 1280x800 that put "Try it" at y=753 — under the fixed sign-in bar on /p/<id>,
// i.e. the page's primary action below the first viewport. From `lg` the
// card is the images beside the words (the pages give it the 1120px container
// there: main + aside, CLAUDE.md's "Layout"), so the description and "Try it"
// sit next to the pictures instead of under them. The comments under the card
// stay on the 640px reading column at every width.
//
// ── THE GALLERY IS 3:2 AND CONTAINED HERE ──────────────────────────────────
// The SAME component as the deck card (components/ProductGallery.tsx), so the
// arrows, the one-second autoplay on touch, the pause while pressed and the
// reduced-motion stop all behave the same in both places. One image at a time
// needs one box for all of them, so here the box is a 3:2 (the deck card's
// fills its stage instead, `shape="fill"`), and `contain`, as on the deck: on
// the product's own page nothing the maker uploaded is cropped. What that costs, said plainly: a tall phone screenshot is
// letterboxed (on cream in one column, on white beside the words), narrower
// than it was uploaded. The page used to stack
// every image at its own shape for that reason; a gallery cannot.
//
// ── THE WAY OUT ────────────────────────────────────────────────────────────
// `link_url` is member-submitted. The href goes through webUrl() (http/https
// only, so a `javascript:` row renders no button at all), opens in a new tab,
// and carries `rel="noopener noreferrer nofollow"` — the reasons are in
// ./product-view.ts. The destination's host is printed beside the button and
// is the button's accessible description: a phone has no status bar, and a
// reader is about to leave for a stranger's domain.
//
// No "use client" and no hooks: both pages are server components. Strings go
// through t() with the page's locale, as <ProductRatingSummary> does.

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { Card, CardChip, buttonClasses } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";
import {
  CATEGORY_LABEL,
  PLATFORM_LABEL,
  productCategoryOf,
  productPlatformsOf,
  type ProductRating,
} from "@/lib/post-types";
import {
  displayHost,
  phonePlatformsOf,
  productImages,
  productName,
  webUrl,
} from "./product-view";
import { TryItLink } from "./PhoneHandoff";

/** The columns this reads. Both pages' own selects carry them. */
export type ProductDetailPost = {
  id: string;
  title: string | null;
  content: string;
  link_url: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  tags: string[] | null;
  /** Where it runs (0080); absent or [] when the maker did not say. */
  platforms?: string[] | null;
};

export function ProductDetail({
  post,
  locale,
  backHref,
  rating,
  rateSlot,
  children,
  notice,
}: {
  post: ProductDetailPost;
  locale: Locale;
  /** deckReturnHref() in ./deck-position.ts. */
  backHref: string;
  /** null when the rating could not be read for this kind of post. */
  rating: ProductRating | null;
  /** Beside the rating: the stars for a member who may rate, the sign-in door
   *  for a visitor, nothing for anyone else. */
  rateSlot?: ReactNode;
  /** The rest of the card: the maker, likes, share. */
  children?: ReactNode;
  /** Above everything, in the same column as the card: /community/<id>'s
   *  "added" confirmation for the maker. */
  notice?: ReactNode;
}) {
  const images = productImages(post);
  const link = webUrl(post.link_url);
  const host = link ? displayHost(link) : null;
  const category = productCategoryOf(post.tags ?? []);
  // "Runs on", when the maker said (0080). Shown under "Try it", so a visitor
  // knows before pressing it where the thing works.
  const platforms = productPlatformsOf(post.platforms);
  // The name as the shelf resolves it. A row with no title gets an h1 for the
  // outline only: its first line is already the description's first line, and
  // printing it twice would read as a mistake.
  const name = productName(post, host ?? t("Product", locale));
  const hostId = `product-host-${post.id}`;

  return (
    // The 640px column, released at `lg` only when there are pictures to put
    // beside the words: a product with none stays a single readable column.
    <div
      className={
        images.length > 0
          ? "mx-auto max-w-[640px] lg:max-w-none"
          : "mx-auto max-w-[640px]"
      }
    >
      {notice && <div className="mb-8">{notice}</div>}

      {/* Not prefetched: in production every product page would otherwise
          fetch the whole shelf just by being looked at. */}
      <Link
        href={backHref}
        prefetch={false}
        className="mb-5 inline-flex items-center gap-1.5 py-1 text-sm text-ink-muted transition-colors hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {t("Back to products", locale)}
      </Link>

      <Card
        as="article"
        padding="none"
        className={
          images.length > 0
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            : undefined
        }
      >
        {images.length > 0 && (
          <ProductGallery
            images={images}
            labels={{
              previousImage: t("Previous image", locale),
              nextImage: t("Next image", locale),
            }}
            fit="contain"
            sizes="(min-width: 1024px) 520px, (min-width: 640px) 560px, 100vw"
            altPrefix={t("Product image", locale)}
            // From `lg`, the whole left half: stretched to the row, which is
            // at least the 3:2 height (the box's aspect ratio is its minimum
            // there) and taller when the words are, with the contained image
            // letterboxed rather than a box ending mid-card — on WHITE there,
            // not the gallery's cream: cream is the page's own colour, and a
            // cream left half made the card read as only its right half.
            className="rounded-t-3xl lg:self-stretch lg:rounded-tr-none lg:rounded-bl-3xl lg:bg-white"
          />
        )}

        <div className="p-6 lg:p-8">
          {category && (
            <div className="mb-3">
              <CardChip>{t(CATEGORY_LABEL[category], locale)}</CardChip>
            </div>
          )}

          {/* The page title: flat text-d2, the app-route title (CLAUDE.md),
              on both pages, because this is one record shown to two
              audiences. Its paired 1.3 is the Thai display floor. */}
          <h1 className={post.title?.trim() ? "text-d2 mb-2" : "sr-only"}>
            {name}
          </h1>

          <p className="text-base leading-relaxed whitespace-pre-wrap text-ink">
            {post.content}
          </p>

          {link && host && (
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* A client island only for the phone handoff (./PhoneHandoff.tsx):
                  an app-store link pressed on a computer shows a code to scan.
                  It renders the same <a>, so the link works before hydration. */}
              <TryItLink
                href={link.toString()}
                host={host}
                name={name}
                phones={phonePlatformsOf(link, post.platforms)}
                describedBy={hostId}
                // Hand-written buttonClasses() rather than <LinkButton>: this
                // is an EXTERNAL, member-submitted href, so it needs target and
                // rel and must not be a client-routed next/link. Full width on
                // a phone, where it is the thing the thumb is for.
                className={buttonClasses({
                  size: "md",
                  className: "w-full sm:w-auto",
                })}
              >
                {t("Try it", locale)}
                <ExternalLink
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </TryItLink>
              <span id={hostId} className="text-sm break-all text-ink-muted">
                {host}
              </span>
            </div>
          )}

          {platforms.length > 0 && (
            <p className="mt-3 text-sm text-ink-muted">
              {t("Runs on {platforms}", locale).replace(
                "{platforms}",
                platforms.map((p) => t(PLATFORM_LABEL[p], locale)).join(" · "),
              )}
            </p>
          )}

          {rating && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <ProductRatingSummary rating={rating} locale={locale} />
              {rateSlot}
            </div>
          )}

          {children}
        </div>
      </Card>
    </div>
  );
}
