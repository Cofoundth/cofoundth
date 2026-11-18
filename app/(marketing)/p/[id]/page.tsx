// The PUBLIC permalink for one community post or milestone — the only version
// of one an anonymous visitor ever sees. A signed-in member is bounced to
// /community/[id], where liking and commenting actually work.
//
// ── A PRODUCT IS NOT SERVED HERE ──────────────────────────────────────────
// Products are stored as forum_posts rows too (kind 'show_and_tell'), and
// this page used to double as the product page. A product now has its own,
// /products/<id> (app/(marketing)/products/[id]), for every reader, signed in
// or not. This page only redirects one there — deck context and all — so
// every /p/<id> product link already shared keeps working. The same goes for
// a development sample (`fixture-…`). The decision reads the row's kind and
// nothing else (lib/public-post.ts getPostKind); the product page applies its
// own gate.
//
// It is a permanentRedirect() but NOT an HTTP 308: this page streams (it has
// a loading.tsx), and once streaming has begun Next answers 200 and redirects
// in the browser with a meta tag (node_modules/next/dist/docs, redirect /
// permanentRedirect: "streaming context"). That is why generateMetadata gives
// a product its full card here too — a link-preview fetcher reads this
// response's tags — with canonical and og:url on /products/<id>.
//
// ── SIGNING IN COMES BACK HERE ────────────────────────────────────────────
// Every sign-in and sign-up link on this page carries `?next=/p/<id>`
// (lib/auth-href.ts), percent-encoded: the join dialog, the comment prompt,
// the CTA card and the sticky bar, and the header's and footer's own links
// (components/marketing/AuthReturnLink.tsx builds the same path from the
// address). Signed in, /p/<id> is the member redirect below, i.e. the thread
// with its comment box. Following `next` safely is the auth code's job, not
// this page's.
//
// ── THE GATE ──────────────────────────────────────────────────────────────
// lib/public-post.ts getPublicPost() is the single gated read, for the page
// body AND generateMetadata — it says what it filters and why, and why it
// reads through the service role (every filter is application code).
//
// ── THE COMMENT GATE IS REAL ──────────────────────────────────────────────
// Only the preview rows reach the render (lib/public-post.ts
// getPublicEngagement); the rest are behind "Sign in to see all {n}
// comments". Commenting itself requires an account and that is the whole
// point of the surface: components/PublicPostActions turns any interaction
// into a join modal. There is deliberately NO logged-out comment box.
//
// ── WHY THE APP CARD ON A (MARKETING) ROUTE ───────────────────────────────
// CLAUDE.md splits the two card surfaces — marketing is `rounded-[22px]` with
// a border and no shadow; the app card is 24px, borderless, `shadow-xs` — and
// says not to unify them. This page takes the APP one, and so does its
// closest sibling: app/(marketing)/founders/[slug], the public preview of
// /profile. The split is about marketing PAGES (landing, legal, editorial),
// not about which route group a file happens to sit in; both of these are the
// logged-out view of a member surface, showing one record, and they should
// look like the thing they are a preview of.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ExternalLink, Rocket, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { postImages } from "@/lib/post-types";
import { authHref } from "@/lib/auth-href";
import {
  getPostKind,
  getPublicEngagement,
  getPublicPost,
  PRODUCT_KIND,
} from "@/lib/public-post";
import { webUrl } from "@/lib/web-url";
import { viewerKind } from "@/lib/device";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import { PublicPostActions } from "@/components/PublicPostActions";
import {
  CommentPreview,
  JoinCta,
  StickySignIn,
  publicTimeAgo as timeAgo,
} from "@/components/PublicPostParts";
import { buttonClasses, Card, Eyebrow, Section } from "@/components/ui";
import { deckContextQuery } from "../../products/deck-position";
import { findFixture } from "../../products/fixtures";
import { productMetadata } from "../../products/product-metadata";
import { isPhoneOnly } from "../../products/product-view";

export const dynamic = "force-dynamic";

type DeckSearch = {
  from?: string | string[];
  category?: string | string[];
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<DeckSearch>;
};

/** Where a product's /p/<id> link goes now, deck context kept. */
function productHref(id: string, search: DeckSearch): string {
  return `/products/${encodeURIComponent(id)}${deckContextQuery(search)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // A development sample is a product: the page redirects it. Never indexed.
  if (findFixture(id)) return { robots: { index: false, follow: false } };

  // The SAME gate as the page body — see the header. A hidden post, or one by
  // a suspended or bot author, emits no social card at all.
  const found = await getPublicPost(id);
  if (!found) return { title: "Post" };
  const { post } = found;

  // A product redirects to its own page — in the browser, because this page
  // streams (see the header) — so a link preview of an OLD product link reads
  // THIS response. It gets the product's own card, canonical and og:url on
  // the new address (../../products/product-metadata.ts). Except on a
  // computer, for a product that only runs on a phone: its page 404s there
  // (../../products/[id]/page.tsx), so the tab does not get its name either.
  // Link-preview bots are not computers, so a shared link keeps its card.
  if (post.kind === PRODUCT_KIND) {
    if (isPhoneOnly(post.link_url, post.platforms) && (await viewerKind()) === "computer") {
      return { title: await tServer("Product") };
    }
    return productMetadata(post);
  }

  const title = post.title ?? post.content.slice(0, 70);
  const description = post.content.slice(0, 160);
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";
  // Always emit an image so the social card is rich — the post's first image
  // (postImages() covers both the legacy scalar and `image_urls`), or the
  // branded site image as a fallback.
  const images = [postImages(post)[0] ?? `${SITE_URL}/og-image.png`];
  return {
    // Bare title — the root layout's "%s · Cofoundee" template adds the suffix.
    title,
    description,
    alternates: { canonical: `/p/${id}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/p/${id}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

const KIND_META: Record<
  string,
  { icon: typeof Trophy; en: string; tone: string } | null
> = {
  post: null,
  milestone: { icon: Trophy, en: "hit a milestone", tone: "text-gold-ink" },
  show_and_tell: { icon: Rocket, en: "shipped", tone: "text-navy" },
};

export default async function PublicPostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;

  // A PRODUCT, or a development sample of one, has its own page now — for
  // every reader, so this runs before the member redirect. See the header.
  if (findFixture(id)) permanentRedirect(productHref(id, search));
  if ((await getPostKind(id)) === PRODUCT_KIND) {
    permanentRedirect(productHref(id, search));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-in members get the full in-app thread (interactions work there).
  if (user) redirect(`/community/${encodeURIComponent(id)}`);

  const found = await getPublicPost(id);
  if (!found) notFound();
  const { post, author } = found;

  const locale = await getLocale();
  const { likeCount, comments, total } = await getPublicEngagement(id);

  // The bare permalink: what the share button shares, and `next` for every
  // sign-in link (see "SIGNING IN COMES BACK HERE").
  const self = `/p/${post.id}`;
  const returnPath = self;
  const commentsGated = total > comments.length;
  const meta = KIND_META[post.kind ?? "post"];
  const KindIcon = meta?.icon;
  const aFounder = await tServer("A founder");
  const authorName = author.full_name ?? aFounder;
  const tags = post.tags ?? [];

  // Every image, through postImages() — never `image_url`/`image_urls`
  // directly, per lib/post-types.ts. Parsed through the same webUrl() as the
  // link: an unusable src is dropped rather than handed to a renderer.
  const images = postImages(post)
    .map((raw) => webUrl(raw)?.toString() ?? null)
    .filter((src): src is string => src !== null);

  const link = webUrl(post.link_url);
  const host = link?.hostname.replace(/^www\./, "") ?? null;

  // A post's link is whatever the member linked — an article, a demo, a
  // launch page — so the button says what it does, "Open link", with the
  // destination printed beside it. Not "Try {name}": that is a PRODUCT's
  // button, and products have their own page now (/products/<id>).
  const tOpenLink = link ? await tServer("Open link") : null;
  // The images' alt is their position: nobody wrote a description, and a
  // positional alt is honest where an invented one is not.
  const tPhoto = await tServer("Photo");

  return (
    <Section width="narrow" rhythm="marketing" className="pb-28">
      <Card as="article" padding="lg">
        {/* Author */}
        <div className="flex items-center gap-3 mb-5">
          <Avatar name={author.full_name} url={author.photo_url} size="md" />
          <div className="min-w-0">
            <div className="text-navy font-medium">{authorName}</div>
            <div className="text-xs text-ink-muted flex items-center gap-2">
              {meta && KindIcon && (
                <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
                  <KindIcon className="w-3 h-3" strokeWidth={1.5} />
                  {await tServer(meta.en)}
                </span>
              )}
              {meta && <span>·</span>}
              <span>{timeAgo(post.created_at, locale)}</span>
            </div>
          </div>
        </div>

        {post.title && <h1 className="text-d2 lg:text-d3 mb-4">{post.title}</h1>}

        <p className="text-ink leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {/* The post's link, as a button. Hand-written `buttonClasses()` rather
            than <LinkButton> because this is an EXTERNAL, member-submitted
            href: it needs target/rel and it must not be a client-routed
            next/link. `rel` carries noopener (reverse tabnabbing), noreferrer,
            and nofollow, which matters here because this page is indexable. */}
        {link && host && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={link.toString()}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={buttonClasses({ size: "md" })}
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              {tOpenLink}
            </a>
            {/* The destination in plain text: on a phone there is no status
                bar to hover for. */}
            <span className="text-sm text-ink-muted break-all">{host}</span>
          </div>
        )}

        {/* The post's images, stacked, each at its own shape. `alt` is the
            index, not a description: nobody wrote one, and a positional alt
            is honest where an invented description is not. */}
        {images.length > 0 && (
          <div className="mt-6 space-y-3">
            {images.map((src, i) => (
              <div
                key={src}
                className="min-h-24 w-full overflow-hidden rounded-xl border border-line bg-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${tPhoto} ${i + 1}`}
                  className="mx-auto h-auto max-h-[75vh] w-auto max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-xs uppercase tracking-[0.1em] px-2 py-0.5 border border-line text-ink-muted rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-line flex items-center justify-between gap-4">
          <PublicPostActions
            likeCount={likeCount}
            commentCount={total}
            next={returnPath}
          />
          <ShareButton
            path={self}
            title={post.title ?? post.content.slice(0, 80)}
          />
        </div>
      </Card>

      {/* Comments — READ-ONLY, and only the preview rows reached the server
          render. See the header: this used to send every comment and hide the
          overflow with CSS. */}
      {total > 0 && (
        <Card as="section" padding="responsive" className="mt-6">
          <Eyebrow as="h2" className="mb-5">
            {await tServer("Comments")}
          </Eyebrow>
          {/* Keyed off `total`, not off the preview: when every commenter in
              the preview window turns out to be moderated the list is empty
              but the conversation is real, and a visitor should still be told
              it exists rather than shown a post that looks untouched. */}
          <CommentPreview comments={comments} locale={locale} />
          {commentsGated && (
            // A real gate, so it is a plain row under the list rather than a
            // gradient laid over clipped content: there is nothing left to
            // fade out. Commenting is the one thing an account is for here.
            <Link
              href={authHref("/signup", returnPath)}
              className={buttonClasses({ size: "sm", className: "mt-5" })}
            >
              {(await tServer("Sign in to see all {n} comments")).replace(
                "{n}",
                String(total),
              )}
            </Link>
          )}
        </Card>
      )}

      <JoinCta next={returnPath} className="mt-6" />
      <StickySignIn next={returnPath} authorName={authorName} />
    </Section>
  );
}

