// A product's page, /products/<id>: the product itself, drawn the same for a
// visitor and for a member (app/(marketing)/products/[id] renders both), and
// in the deck's modal over the deck (./ProductModal.tsx).
//
// ── THE FORMAT (the founder's call, 2026-11-18) ───────────────────────────
// One column of cards, top to bottom, modelled on a game store's game page:
//
//   1. a way back to the deck (the page only; the modal closes instead)
//   2. THE PRODUCT CARD: category, name, maker, rating summary and controls,
//      "Try it" at the card's full width with the host it leads to, and whatever
//      the page adds (`children`: the like, Share, Edit, Report row)
//   3. About: the description
//   4. Screenshots: every one at once, in a grid that never cycles; a click
//      opens one large (components/ProductImageGrid.tsx)
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

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ProductImageGrid } from "@/components/ProductImageGrid";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { Card, CardChip, SectionHeading } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";
import { STORE_LABEL, STORE_PLATFORMS, productStoreLinksOf } from "@/lib/product-store-links";
import {
  CATEGORY_LABEL,
  platformLabelsOf,
  productCategoryOf,
  type ProductRating,
} from "@/lib/post-types";
import {
  displayHost,
  phoneOnly,
  phonePlatformsOf,
  productImages,
  productName,
  webUrl,
} from "./product-view";
import type { DeckViewer, PromptProduct } from "./DeckPrompts";
import { ProductTryLinks } from "./PhoneHandoff";

/** The columns this reads. Both pages' own selects carry them. */
export type ProductDetailPost = {
  id: string;
  title: string | null;
  content: string;
  link_url: string | null;
  ios_store_url?: string | null;
  android_store_url?: string | null;
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
  feedback,
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
  feedback: Omit<PromptProduct, "id" | "name"> & {
    viewer: DeckViewer;
    returnPath: string;
  };
  /** Stars for an eligible member, a sign-in link for a visitor, or a note
   *  explaining rating eligibility to the maker. */
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
  const mobileOnly = link !== null && phoneOnly(link, post.platforms);
  // "Runs on", when the maker said (0080), so a visitor knows before pressing
  // "Try it" where the thing works.
  const platforms = platformLabelsOf(post.platforms);
  // The name as the shelf resolves it: an older row with no title is named by
  // its description's first line, which About then repeats in full.
  const name = productName(post, host ?? t("Product", locale));
  const description = post.content.trim();
  const storeLinks = productStoreLinksOf(post);
  const stores = STORE_PLATFORMS.flatMap((platform) => {
    const href = storeLinks[platform];
    return href ? [{
      platform,
      href,
      host: displayHost(new URL(href)),
      label: t(STORE_LABEL[platform], locale),
      phones: [platform],
    }] : [];
  });
  const main = link && host && !stores.some(({ href }) => href === link.href)
    ? { href: link.href, host, label: t("Try it", locale), phones: phonePlatformsOf(link, post.platforms) }
    : null;

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
        <Card as="article" padding="responsive">
          {(category || mobileOnly) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {category && (
                <CardChip>{t(CATEGORY_LABEL[category], locale)}</CardChip>
              )}
              {mobileOnly && <CardChip>{t("Mobile only", locale)}</CardChip>}
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
                    platforms.map((p) => t(p, locale)).join(" · "),
                  )}
                </span>
              )}
            </p>
          )}

          {rateSlot && (
            <div className="mt-3">{rateSlot}</div>
          )}

          {(main || stores.length > 0) && (
            <ProductTryLinks
              main={main}
              stores={stores}
              product={{
                id: post.id,
                name,
                reviewable: feedback.reviewable,
                liked: feedback.liked,
                myScore: feedback.myScore,
                sample: feedback.sample,
              }}
              viewer={feedback.viewer}
              returnPath={feedback.returnPath}
            />
          )}

          {children}
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
      </div>
    </div>
  );
}
