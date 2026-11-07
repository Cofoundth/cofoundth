// /products — one product on the shelf.
//
// NO "use client": this is pure markup with no hooks, so it renders inside the
// server page and the page's `tServer()` strings arrive as props. Same contract
// as components/ui/** — this file translates NOTHING.
//
// ── THE CARD IS A SHOP WINDOW, NOT A POST ─────────────────────────────────
// The surface exists to send traffic OUT. So the card carries exactly what a
// reader needs in order to decide to leave: cover, name, what it is, who made
// it, WHERE they are about to land, and one button. No likes, no comments, no
// install counts — the maker's own analytics are the maker's business (see the
// scope note in page.tsx).
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

import Link from "next/link";
import Image from "next/image";
import { isFixture } from "./fixtures";
import { ExternalLink, Globe } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Card, CardChip, buttonClasses } from "@/components/ui";
import { timeAgo } from "@/lib/time";
import type { PostItem } from "@/lib/post-types";

export type ProductCardLabels = {
  /** The product's category, already translated. */
  category: string;
  /** The button face, e.g. "Try it". */
  cta: string;
  /** Accessible name for the button, with {name} and {host} placeholders. */
  ctaAria: string;
  /** Shown instead of the button when there is no usable link. */
  noLink: string;
  /** Author fallback when a profile has no name. */
  anonymous: string;
};

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

  // The cover goes through the same parse as the link. next/image would
  // otherwise THROW on an unconfigured host (see the `unoptimized` note below),
  // and a bad cover must not take the card down with it.
  const cover = webUrl(post.image_url);

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

  return (
    <Card
      padding="none"
      className="flex h-full min-w-0 flex-col overflow-hidden"
    >
      {cover && (
        // Fixed-ratio box, so the grid does not reflow as covers load (CLS).
        //
        // `unoptimized` is NOT a shortcut — it is the only way next/image can
        // render these at all today. next.config.ts declares no `images` block,
        // so the config default `remotePatterns: []` applies, and
        // image-loader.js throws "hostname … is not configured" for EVERY
        // remote src. With `unoptimized` the loader is never reached
        // (generateImgAttrs returns early), so the browser fetches the original
        // bytes directly — identical to the plain <img> the rest of the app
        // uses for post images, and still lazy + CLS-safe, which a bare <img>
        // is not. If the Supabase storage host is ever added to remotePatterns,
        // delete this one prop.
        <div className="relative aspect-[3/2] w-full bg-cream">
          <Image
            src={cover.toString()}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1280px) 328px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-6">
        {/* META ROW — the card body order from CLAUDE.md: meta, title, excerpt,
            footer. */}
        <div className="flex min-w-0 items-center gap-2">
          <CardChip>{labels.category}</CardChip>
          {/* DEV ONLY and deliberately ugly. productFixtures() returns [] in a
              production build, so this never renders there — but while it DOES
              render, an unlabelled sample is worse than no sample: it is a
              product that cannot be clicked, cannot be liked, and whose maker
              does not exist. Untranslated on purpose; it is a developer note,
              not product copy. */}
          {isFixture(post.id) && (
            <span className="rounded-full bg-danger-surface px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] text-danger-ink">
              Test
            </span>
          )}
          <span className="truncate text-xs text-ink-muted">
            {timeAgo(post.created_at, locale)}
          </span>
        </div>

        {/* No `leading-tight` here, ever: card titles are user-written and most
            of them are Thai, where 1.25 is under the measured 1.28 collision
            threshold. text-xl's own 1.4 wraps a long Thai name safely. */}
        <h3 className="mt-3 text-xl line-clamp-2">{name}</h3>

        {post.content && (
          <p className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-ink-muted leading-relaxed">
            {post.content}
          </p>
        )}

        {/* FOOTER — pushed to the bottom with mt-auto so a row of uneven cards
            still lines its buttons up. */}
        <div className="mt-auto flex flex-col gap-3 pt-5">
          {post.author && authorHref && (
            <Link
              href={authorHref}
              className="group flex min-w-0 items-center gap-2"
            >
              <Avatar
                name={post.author.full_name}
                url={post.author.photo_url}
                size="sm"
              />
              <span className="min-w-0 truncate text-sm text-ink transition-colors group-hover:text-gold-ink">
                {post.author.full_name ?? labels.anonymous}
              </span>
            </Link>
          )}

          {link && host ? (
            <>
              {/* WHERE YOU ARE ABOUT TO GO, shown before the click rather than
                  in a status bar on hover — which a phone has not got. */}
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
                <Globe className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{host}</span>
              </span>
              <a
                href={link.toString()}
                target="_blank"
                rel="noopener noreferrer nofollow"
                // The visible label is the same two words on every card, so the
                // accessible name carries the product and the host instead —
                // otherwise a screen reader reads "Try it" twelve times.
                aria-label={labels.ctaAria
                  .replace("{name}", name)
                  .replace("{host}", host)}
                className={buttonClasses({ size: "sm", fullWidth: true })}
              >
                {labels.cta}
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            </>
          ) : (
            // Reachable, and not dead code: `getProductsPage` already drops
            // rows whose `link_url` IS NULL, so what lands here is a row that
            // HAS a link the parse above refused — a legacy `javascript:` or
            // mailto: value, or something that is not a URL at all. Rendered
            // rather than hidden so the maker sees their own card asking for a
            // real link instead of wondering why the shelf never showed it.
            <span className="text-xs text-ink-muted">{labels.noLink}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
