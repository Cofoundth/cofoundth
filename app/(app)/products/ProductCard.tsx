// /products — one product on the shelf.
//
// NO "use client": this is pure markup with no hooks, so it renders inside the
// server page and the page's `tServer()` strings arrive as props. Same contract
// as components/ui/** — this file translates NOTHING.
//
// ── THE CARD IS A SHOP WINDOW, NOT A POST ─────────────────────────────────
// The surface exists to send traffic OUT. So the card carries exactly what a
// reader needs in order to decide to leave: cover, name, what it is, who made
// it, and WHERE they are about to land. No likes, no comments, no install
// counts — the maker's own analytics are the maker's business (see the scope
// note in page.tsx).
//
// ── THE WHOLE CARD IS THE LINK (there is no "Try it" button) ──────────────
// There used to be a full-width navy CTA at the foot of every card. Six of
// them in a grid is six of the app's loudest component repeated down a browse
// page, and the tile already reads as a product — which is why the App Store,
// Product Hunt and itch.io all make the tile itself the target.
//
// It is the CARD, not the image. A clickable screenshot above an unclickable
// title is worse than either: the hit area stops where the reader's attention
// does not.
//
// MECHANICALLY this is the stretched-link pattern, because the card already
// contains interactive children and <a> cannot nest in <a>. ONE absolutely-
// positioned <a> covers the card at `z-10`; the two things that must keep
// working sit at `z-20` — the author profile link here, and the gallery's dots
// in ./ProductGallery. They are SIBLINGS of the stretched link in the DOM, not
// descendants, so nothing needs to cancel an event: a press either lands on
// them or on the link, decided by paint order.
//
// The stretched <a> is the FIRST child on purpose. Tab order is DOM order, so
// a card reads: card link -> dots (on the image) -> author link, which is top
// to bottom down the card. Putting it last would make the primary destination
// the last stop.
//
// THREE THINGS THE BUTTON USED TO CARRY, and where each one went:
//   · the rel/target hardening  -> onto the stretched link, unchanged;
//   · the full "Try {name} on {host}" accessible name -> the stretched link's
//     aria-label, so a screen reader still hears the destination;
//   · the ExternalLink icon, i.e. the only glyph saying "this leaves the
//     site" -> onto the HOSTNAME ROW, which replaces the Globe it used to
//     carry. With no button, that row is the entire visible signal that a
//     click goes to a stranger's URL, so it gets the stronger of the two
//     icons. The row itself is NOT optional.
// And because the affordance is now implicit, the card buys it back: a
// pointer cursor (free, it is an <a>), the Card primitive's own `hoverable`
// shadow lift, and the app's `group-hover -> text-gold-ink` title tint. All
// three are suppressed on a card with no usable link, which must not pretend
// to be clickable.
//
// ── THE OUTBOUND LINK IS SECURITY-SENSITIVE ───────────────────────────────
// `link_url` is user-submitted. Three things follow, and none of them are
// styling:
//
//   1. `rel="noopener"` — without it the opened tab gets a live `window.opener`
//      handle back into this origin and can navigate it (reverse tabnabbing:
//      the user comes back to a login page that is not ours).
//   2. `rel="nofollow"` — a members-only shelf must not become an SEO
//      pass-through that is worth spamming to get into.
//   3. The href is PARSED before it is rendered, and only `http:`/`https:`
//      survives. `createPostAction` validates `^https?://` on write today, but
//      the column is plain text and predates that check, so a `javascript:`
//      URL sitting in an older row would otherwise be a one-click script
//      injection on this page. A row that fails the parse renders WITHOUT a
//      link rather than disappearing — see `noLink` below.
//
// ── SCREENSHOTS, AND WHY THIS FILE IS STILL A SERVER COMPONENT ────────────
// A product now carries up to MAX_PRODUCT_IMAGES screenshots, and the card
// cycles through them on a one-second clock while it is on screen. That needs
// the DOM, a timer and an IntersectionObserver — but only the image box does.
// So the box, the fixed ratio and the COVER <Image> stay here, server-
// rendered, and ONE small client child (./ProductGallery) mounts over the box
// to do the cycling. The title, the blurb, the author link and the CTA are
// untouched by it.
//
// The consequence worth stating: a product with ONE image, or none, renders
// exactly the markup it rendered before this feature existed and ships no
// gallery JS at all — `images.length > 1` is checked HERE, before the child is
// reached. There are real rows with a single legacy `image_url` and they must
// not start paying for a feature they cannot use.
//
// EVERY image goes through `postImages()` (never `image_url` / `image_urls`
// directly, per lib/post-types.ts) and then through the SAME `webUrl()` parse
// as the outbound link — the parse above is not about links, it is about not
// handing an attacker-controlled string to a renderer.

import Link from "next/link";
import Image from "next/image";
import { isFixture } from "./fixtures";
import { ProductGallery } from "./ProductGallery";
import { ExternalLink, ImageOff } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CardHoverScope } from "./card-hover";
import { Card, CardChip, cn } from "@/components/ui";
import { timeAgo } from "@/lib/time";
import { MAX_PRODUCT_IMAGES, postImages } from "@/lib/post-types";
import type { PostItem } from "@/lib/post-types";

export type ProductCardLabels = {
  /** The product's category, already translated. */
  category: string;
  /** Accessible name for the whole-card link, with {name} and {host}
   *  placeholders. It is the ONLY name that link has — the element is empty,
   *  by necessity, because an <a> stretched over the card cannot also hold the
   *  card's own markup. There is no `cta` any more; the button it labelled is
   *  gone (see the header). */
  ctaAria: string;
  /** Shown instead of the button when there is no usable link. */
  noLink: string;
  /** Author fallback when a profile has no name. */
  anonymous: string;
};

/**
 * How wide this box actually is, so the cover and the screenshots over it can
 * never disagree: 328px in the xl 3-up grid (1120px container minus two 16px
 * gaps, divided by three), half the viewport in the sm 2-up, full width below
 * that. It has no effect while every src is `unoptimized` — there is no
 * srcset for it to choose from — and is kept because it is the one line that
 * starts working the day the storage host joins `remotePatterns`.
 */
const COVER_SIZES = "(min-width: 1280px) 328px, (min-width: 640px) 50vw, 100vw";

/** A URL we are willing to put in an href, or null. See the header. */
function webUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

// The ONE narrow exception to that parse, and it is deliberately not inside
// webUrl() — ./fixtures.ts asks for it by name and says why the fix must not
// land there instead.
//
// The dev-only sample products draw their screenshots as inline
// `data:image/svg+xml` URIs (no files in public/, no placeholder CDN, nothing
// in the build output — see that file's header). webUrl() refuses them, as it
// should for anything out of the database, so without this the one page you
// open BECAUSE you want to look at the gallery is the one page that renders
// coverless.
//
// Three independent things have to be true before a `data:` URI renders, and
// in production the first one is already false:
//   1. not a production build — `productFixtures()` returns [] there, so this
//      branch is unreachable, and this check says so rather than relying on
//      it;
//   2. the row is a fixture — `forum_posts.id` is a uuid and cannot begin
//      "fixture-", so no database row can claim this;
//   3. the prefix is exactly `data:image/svg+xml`, which is what the
//      generator emits.
// An SVG referenced by <img>/next/image cannot execute script, and these
// bytes come from our own module rather than from a submitted field — but the
// gate is the id and the build, not the harmlessness of SVG.
const FIXTURE_IMAGE = "data:image/svg+xml";

/** An image src we are willing to render, or null. */
function imageSrc(raw: string, fixture: boolean): string | null {
  if (
    fixture &&
    process.env.NODE_ENV !== "production" &&
    raw.startsWith(FIXTURE_IMAGE)
  ) {
    return raw;
  }
  return webUrl(raw)?.toString() ?? null;
}

export function ProductCard({
  post,
  labels,
  locale,
}: {
  post: PostItem;
  labels: ProductCardLabels;
  locale: string;
}) {
  const link = webUrl(post.link_url);
  // `www.` is noise in a 304px column and tells the reader nothing about where
  // they are going; the registrable name is the whole signal.
  const host = link?.hostname.replace(/^www\./, "") ?? null;

  // Every screenshot goes through `imageSrc()`, i.e. the same parse as the
  // link plus the dev-fixture exception above. next/image would otherwise
  // THROW on an unconfigured host (see the `unoptimized` note below), and a
  // bad cover must not take the card down with it — so an unusable URL is
  // DROPPED from the list rather than rendered, which also means a row whose
  // only image is a bad one falls back to the no-image card.
  //
  // Deduped before the cap: the same file uploaded twice is a maker's slip,
  // and the visible cost of not catching it is a dot that appears to do
  // nothing. Capped after, so five DISTINCT screenshots survive.
  const fixture = isFixture(post.id);
  const images = [
    ...new Set(
      postImages(post)
        .map((raw) => imageSrc(raw, fixture))
        .filter((src): src is string => src !== null),
    ),
  ].slice(0, MAX_PRODUCT_IMAGES);
  const cover = images[0] ?? null;

  // `title` is the product NAME per the contract, but it is nullable on
  // forum_posts, so an older show_and_tell may have none. The first non-empty
  // line of the description is the only honest fallback.
  const name =
    post.title?.trim() ||
    post.content.split("\n").find((l) => l.trim())?.trim() ||
    labels.anonymous;

  const authorHref = post.author
    ? `/profile/${post.author.slug ?? post.author.id}`
    : null;

  // One name for "this card goes somewhere", used by the link, the hover lift
  // and the title tint, so the three can never disagree.
  const clickable = Boolean(link && host);

  return (
    <Card
      padding="none"
      hoverable={clickable}
      // `group/card` is NAMED: the author link below carries a plain `group`
      // of its own for its own hover, and Tailwind's unnamed `group-hover:`
      // matches ANY ancestor `.group` — so an unnamed group here would make
      // hovering the card tint the author's name too.
      //
      // NOTE `overflow-hidden` is NOT on this element. It used to be, to clip
      // the cover to the 24px corners, and it also clipped the stretched
      // link's focus ring (the global :focus-visible outline in globals.css
      // draws 2px OUTSIDE the element, and an ancestor's overflow:hidden cuts
      // an outline). The clip moved to the cover box, which is the only thing
      // that needed it.
      className="group/card relative flex h-full min-w-0 flex-col"
    >
      {/* The hover scope must be an ANCESTOR of the stretched link below —
          see ./card-hover for why nothing else can hear the hover. */}
      <CardHoverScope>
      {/* THE CARD LINK. Empty and absolutely positioned: see the header for
          why it is first, why it is z-10, and why its accessible name is a
          prop. Rendered only when there is a URL that survived the parse, so
          a card with a bad link has no invisible target over it. */}
      {clickable && link && host && (
        <a
          href={link.toString()}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={labels.ctaAria
            .replace("{name}", name)
            .replace("{host}", host)}
          // `rounded-3xl` so the focus outline follows the card's corners
          // rather than drawing a square around a rounded card.
          className="absolute inset-0 z-10 rounded-3xl"
        />
      )}

      {/* ALWAYS RENDERED, with or without a screenshot. A card with no image
          used to render no box at all, so in a row beside a card that had one
          its text started ~300px higher and the grid looked broken.

          The empty state is a STATIC placeholder, deliberately not a loading
          skeleton. A skeleton promises that something is arriving; for a
          product whose maker never attached a screenshot nothing ever will, so
          a shimmer would pulse forever and mean nothing. */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-3xl bg-cream">
        {cover ? (
          <>
            {/* `unoptimized` is NOT a shortcut — it is the only way next/image
                renders these today. next.config.ts declares no `images` block,
                so the default `remotePatterns: []` applies and image-loader.js
                throws "hostname … is not configured" for EVERY remote src.
                With `unoptimized` the loader is never reached. Delete this one
                prop the day the storage host joins remotePatterns, and the
                `sizes` below starts doing something. */}
            <Image
              src={cover}
              alt=""
              fill
              unoptimized
              sizes={COVER_SIZES}
              className="object-cover"
            />
            {/* The ONLY image requested for this card on page load, however
                many a product has. The gallery fetches the rest on hover. */}
            {images.length > 1 && (
              <ProductGallery images={images} sizes={COVER_SIZES} />
            )}
          </>
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center bg-gold-soft"
          >
            <ImageOff
              className="h-7 w-7 text-gold-ink/50"
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-6">
        {/* META ROW — the card body order from CLAUDE.md: meta, title, excerpt.
            There is no footer row any more: the author folded up into here and
            the hostname row is gone (see the header), which is where most of
            the card's height went. ONE line, non-wrapping, so a card's height
            does not depend on how long an author's name is — the name is the
            flexible item and truncates; everything else is `shrink-0`. */}
        <div className="flex min-w-0 items-center gap-2">
          <CardChip>{labels.category}</CardChip>
          {/* DEV ONLY and deliberately ugly. productFixtures() returns [] in a
              production build, so this never renders there — but while it DOES
              render, an unlabelled sample is worse than no sample: it is a
              product that cannot be clicked, cannot be liked, and whose maker
              does not exist. Untranslated on purpose; it is a developer note,
              not product copy. */}
          {fixture && (
            <span className="shrink-0 rounded-full bg-danger-surface px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] text-danger-ink">
              Test
            </span>
          )}

          {post.author && authorHref && (
            <Link
              href={authorHref}
              // `relative z-20` lifts it above the stretched card link.
              //
              // `min-w-0` + a truncating name is what keeps this row one line
              // tall. It is also the only FLEXIBLE item here, so when the card
              // is narrow the name gives way rather than the category or the
              // date — the two things a reader scans by.
              className="group relative z-20 flex min-w-0 items-center gap-1.5"
            >
              <Avatar
                name={post.author.full_name}
                url={post.author.photo_url}
                size="xs"
              />
              <span className="min-w-0 truncate text-xs text-ink-muted transition-colors group-hover:text-navy">
                {post.author.full_name ?? labels.anonymous}
              </span>
            </Link>
          )}

          <span className="ml-auto shrink-0 text-xs text-ink-muted">
            {timeAgo(post.created_at, locale)}
          </span>

          {link && host ? (
            // THE ONLY VISIBLE "this leaves the site" SIGNAL LEFT, and that is
            // a decision, not an oversight.
            //
            // The card used to show the hostname in full. It was removed on
            // the founder's call once the whole card became the link: the
            // image is the affordance, and a domain on every tile is a row of
            // noise for something most readers do not read.
            //
            // WHAT THAT COSTS, written down so nobody reverses it by accident:
            // `link_url` is SUBMITTED BY A MEMBER, and this surface exists to
            // send visitors to third-party sites. The hostname was the one
            // thing on screen telling a visitor where a click went, and a
            // sighted user now has only the browser's status bar on hover —
            // which a phone has not got at all.
            //
            // It is acceptable TODAY because posting is limited to onboarded
            // community members and an admin can hide a post
            // (forum_posts.hidden). IF POSTING EVER OPENS UP MORE WIDELY, OR
            // THE FIRST ABUSIVE LINK APPEARS, bringing the visible hostname
            // back is the mitigation — not a new one.
            //
            // Two things keep the signal from vanishing entirely, and both
            // must stay: this glyph, and the HOST inside the card link's
            // aria-label ("Try {name} on {host}"). A screen-reader user has no
            // status bar, so that label is the only place the destination
            // survives for them — do not simplify it to the product name.
            //
            // `webUrl()` is untouched and is doing more than feeding a label:
            // it is what resolves `https://apps.apple.com@evil.example.com/`
            // to evil.example.com and refuses `javascript:`/`data:`, and it
            // still decides whether an anchor renders at all.
            <ExternalLink
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-ink-muted"
              strokeWidth={1.5}
            />
          ) : (
            // Reachable, and not dead code: `getProductsPage` already drops
            // rows whose `link_url` IS NULL, so what lands here is a row that
            // HAS a link the parse above refused — a legacy `javascript:` or
            // mailto: value, or something that is not a URL at all. Rendered
            // rather than hidden so the maker sees their own card asking for a
            // real link instead of wondering why the shelf never showed it.
            <span className="shrink-0 text-xs text-ink-muted">
              {labels.noLink}
            </span>
          )}
        </div>

        {/* No `leading-tight` here, ever: card titles are user-written and most
            of them are Thai, where 1.25 is under the measured 1.28 collision
            threshold. text-xl's own 1.4 wraps a long Thai name safely.

            The hover tint is the app's existing idiom for "this text is the
            thing you are about to click" (same pair as the author name above
            and the names in /matches and /dashboard). It is conditional
            because an unlinked card must not imply one. */}
        <h3
          className={cn(
            "mt-3 text-xl line-clamp-2",
            clickable && "transition-colors group-hover/card:text-gold-ink",
          )}
        >
          {name}
        </h3>

        {/* TWO lines, not three. The blurb is the most compressible thing on
            the card — the name and the screenshot are what a reader chooses
            on — and on a phone the text block had grown nearly as tall as the
            image. Clamping rather than truncating server-side keeps the whole
            blurb in the DOM for anyone who copies the card's text. */}
        {post.content && (
          <p className="mt-2 line-clamp-2 text-sm whitespace-pre-wrap text-ink-muted leading-relaxed">
            {post.content}
          </p>
        )}
      </div>
      </CardHoverScope>
    </Card>
  );
}
