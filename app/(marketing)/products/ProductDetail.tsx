// A product's page, /products/<id>: the product itself, drawn the same for a
// visitor and for a member (app/(marketing)/products/[id] renders both), and
// in the deck's modal over the deck (./ProductModal.tsx).
//
// ── THE FORMAT (the founder's call, 2026-11-18) ───────────────────────────
// One column of cards, top to bottom, modelled on a game store's game page:
//
//   1. a way back to the deck (the page only; the modal closes instead)
//   2. THE PRODUCT CARD: the first screenshot as a wide banner, then the
//      category, the name, who made it, the rating at a glance, "Try it" at
//      the card's full width with the host it leads to, and whatever the
//      page adds (`children`: the like, Share, Edit, Report row)
//   3. About: the description
//   4. Screenshots: every one at once, in a grid that never cycles; a click
//      opens one large (components/ProductImageGrid.tsx)
//   5. Rate: the stars for a member who may rate, the sign-in door for a
//      visitor (`rateSlot`); left out for anyone who can do neither
//
// and the comments come after, from the page, because the two readers get
// different conversations: a preview behind a sign-in for a visitor, the
// whole thread and the composer for a member. Above all of it, and only for
// the maker who has just added it (or saved an edit), the page's `notice`.
//
// The format's STRUCTURE, in this app's own surfaces: white cards on sand,
// one near-black primary, no accent colour (CLAUDE.md, Design Principles).
// The store's counts strip and its detail tiles are left out: the counts we
// have (likes, rating, comments) are already on the card, and a row of big
// zeros on a new product reads as an empty shelf.
//
// ── THE BANNER ─────────────────────────────────────────────────────────────
// The first screenshot, decorative here (alt="": the grid below carries every
// picture with its alt text, and a reader of it would otherwise hear the
// first one twice). `contain` over a blurred, cropped copy of itself, as on
// the deck card, so a screenshot of any shape fills the banner without being
// cut: nothing the maker uploaded is cropped anywhere on this page.
//
// ── THE WAY OUT ────────────────────────────────────────────────────────────
// `link_url` is member-submitted. The href goes through webUrl() (http/https
// only, so a `javascript:` row renders no button at all), opens in a new tab,
// and carries `rel="noopener noreferrer nofollow"` — the reasons are in
// ./product-view.ts. The destination's host is printed under the button and
// is the button's accessible description: a phone has no status bar, and a
// reader is about to leave for a stranger's domain.
//
// No "use client" and no hooks: both pages are server components. Strings go
// through t() with the page's locale, as <ProductRatingSummary> does.

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductImageGrid } from "@/components/ProductImageGrid";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { Card, CardChip, SectionHeading, buttonClasses } from "@/components/ui";
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
  maker,
  children,
  notice,
}: {
  post: ProductDetailPost;
  locale: Locale;
  /** deckReturnHref() in ./deck-position.ts; null in the deck's modal
   *  (./ProductModal.tsx), which closes instead of linking back. */
  backHref: string | null;
  /** null when the rating could not be read for this kind of post. */
  rating: ProductRating | null;
  /** The Rate card's contents: the stars for a member who may rate, the
   *  sign-in door for a visitor. Nothing (and no card) for anyone else. */
  rateSlot?: ReactNode;
  /** Who made it, under the name. */
  maker?: ReactNode;
  /** The rest of the product card, under "Try it": likes, Share, Report. */
  children?: ReactNode;
  /** Above everything: the "added" / "saved" confirmation for the maker. */
  notice?: ReactNode;
}) {
  const images = productImages(post);
  const link = webUrl(post.link_url);
  const host = link ? displayHost(link) : null;
  const category = productCategoryOf(post.tags ?? []);
  // "Runs on", when the maker said (0080), so a visitor knows before pressing
  // "Try it" where the thing works.
  const platforms = productPlatformsOf(post.platforms);
  // The name as the shelf resolves it: an older row with no title is named by
  // its description's first line, which About then repeats in full.
  const name = productName(post, host ?? t("Product", locale));
  const hostId = `product-host-${post.id}`;
  const description = post.content.trim();

  return (
    <div>
      {notice && <div className="mb-8">{notice}</div>}

      {/* Not prefetched: in production every product page would otherwise
          fetch the whole shelf just by being looked at. */}
      {backHref && (
        <Link
          href={backHref}
          prefetch={false}
          className="mb-5 inline-flex items-center gap-1.5 py-1 text-sm text-ink-muted transition-colors hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {t("Back to products", locale)}
        </Link>
      )}

      {/* A stack of cards: component spacing, the card grid's own gap-4. */}
      <div className="grid gap-4">
        <Card as="article" padding="none" className="overflow-hidden">
          {images.length > 0 && (
            // 16:9 in a phone column, a 21:9 banner from `lg`. Its own
            // overflow-hidden: the blurred copy is scaled past the box and
            // would otherwise bleed over the words below.
            <div className="relative aspect-video overflow-hidden bg-cream lg:aspect-[21/9]">
              {/* `unoptimized` for the reason components/ProductGallery.tsx
                  gives: no image host is configured for next/image. */}
              <Image
                src={images[0]}
                alt=""
                aria-hidden
                fill
                unoptimized
                loading="eager"
                draggable={false}
                sizes="(min-width: 1120px) 1120px, 100vw"
                className="scale-110 object-cover opacity-60 blur-2xl"
              />
              <Image
                src={images[0]}
                alt=""
                aria-hidden
                fill
                unoptimized
                loading="eager"
                fetchPriority="high"
                draggable={false}
                sizes="(min-width: 1120px) 1120px, 100vw"
                className="object-contain"
              />
            </div>
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
            <h1 className="text-d2 mb-2">{name}</h1>

            {maker}

            {(rating || platforms.length > 0) && (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                {rating && <ProductRatingSummary rating={rating} locale={locale} />}
                {rating && platforms.length > 0 && (
                  <span aria-hidden="true">·</span>
                )}
                {platforms.length > 0 && (
                  <span>
                    {t("Runs on {platforms}", locale).replace(
                      "{platforms}",
                      platforms
                        .map((p) => t(PLATFORM_LABEL[p], locale))
                        .join(" · "),
                    )}
                  </span>
                )}
              </p>
            )}

            {link && host && (
              <div className="mt-6">
                {/* A client island only for the phone handoff
                    (./PhoneHandoff.tsx): an app-store link pressed on a
                    computer shows a code to scan. It renders the same <a>, so
                    the link works before hydration. Hand-written
                    buttonClasses() rather than <LinkButton>: an EXTERNAL,
                    member-submitted href needs target and rel and must not be
                    a client-routed next/link. The card's full width, as the
                    format's one big action. */}
                <TryItLink
                  href={link.toString()}
                  host={host}
                  name={name}
                  phones={phonePlatformsOf(link, post.platforms)}
                  productId={post.id}
                  describedBy={hostId}
                  className={buttonClasses({ size: "lg", className: "w-full" })}
                >
                  {t("Try it", locale)}
                  <ExternalLink
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </TryItLink>
                <p
                  id={hostId}
                  className="mt-2 text-center text-sm break-all text-ink-muted"
                >
                  {host}
                </p>
              </div>
            )}

            {children}
          </div>
        </Card>

        {description && (
          <Card as="section" padding="responsive">
            <SectionHeading title={t("About this product", locale)} />
            <p className="text-base leading-relaxed whitespace-pre-wrap text-ink">
              {post.content}
            </p>
          </Card>
        )}

        {images.length > 0 && (
          <Card as="section" padding="responsive">
            <SectionHeading title={t("Screenshots", locale)} />
            <ProductImageGrid
              images={images}
              altPrefix={t("Product image", locale)}
              labels={{
                previousImage: t("Previous image", locale),
                nextImage: t("Next image", locale),
                close: t("Close", locale),
              }}
              sizes="(min-width: 1120px) 340px, (min-width: 640px) 33vw, 50vw"
            />
          </Card>
        )}

        {rating && rateSlot && (
          <Card as="section" padding="responsive">
            <SectionHeading title={t("Rate this product", locale)} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {rateSlot}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
