// The PUBLIC permalink for one post — the only version of a post an anonymous
// visitor ever sees. A signed-in member is bounced to /community/[id], where
// liking, rating and commenting actually work.
//
// ── IT IS ALSO THE PRODUCT PAGE ───────────────────────────────────────────
// A deck card's rating-and-comments row (/products, and / once it serves the
// shelf) opens here, in the same tab; the rest of the card, a right swipe, →
// and "Try" open the maker's product itself in a new tab instead (CLAUDE.md,
// Language Rules). This is the product's full page: a `show_and_tell` row gets
// ../../products/ProductDetail.tsx, shared with /community/<id> — a way back
// to the deck, every screenshot in the deck's own gallery, the description,
// "Try it" out to the maker's site, the rating, and the comments, in that
// order. It is also what a shared product link opens. Everything else (`post`,
// `milestone`) renders as it did: one body, its images, its link.
//
// ── THE DECK SENDS ITS PLACE ALONG, AND THIS PAGE NEVER ECHOES IT ─────────
// The card's row links to `/p/<id>?from=products&category=game`. This page maps
// those two values onto the back link (deckReturnHref in
// ../../products/deck-position.ts), onto the member redirect below and onto
// its own sign-in links, always re-parsed, never copied: `from` is one of two
// known deck routes or it is ignored, `category` goes through the deck's own
// parser. The canonical URL is the bare /p/<id> (generateMetadata), so the
// variants are one page to a crawler, and the share button shares that bare
// URL too.
//
// ── SIGNING IN COMES BACK HERE ────────────────────────────────────────────
// Every sign-in and sign-up link on this page carries `?next=/p/<id>` plus the
// deck context above (lib/auth-href.ts), percent-encoded: the join dialog,
// "Sign in to rate", the comment prompts, the CTA card and the sticky bar, and
// the header's and footer's own links (components/marketing/AuthReturnLink.tsx
// builds the same path from the address). Signed in, /p/<id> is the member
// redirect below, i.e. the product with its stars and its comment box, and
// its back link still returns to the card after this one. Following `next`
// safely is the auth code's job, not this page's.
//
// ── SERVICE ROLE MEANS EVERY FILTER IS APPLICATION CODE ───────────────────
// `forum_posts`, `forum_comments` and `profiles` each have exactly ONE SELECT
// policy and it is `to authenticated`. `anon` has no read policy on any of
// them, so this page cannot use the cookie-session client: it would get `[]`
// and HTTP 200, with no error, and render an empty post forever. It reads
// through createAdminClient() instead, which BYPASSES RLS — so every row
// filter that RLS would have applied is now this file's job, and a filter
// forgotten here is a leak rather than a bug.
//
// `getPublicPost()` below is the single gate. Both consumers — the page body
// AND generateMetadata — go through it, because two separately-filtered
// queries are exactly how the hole it closes appeared: the page used to filter
// on `id` alone in two places, so an admin-hidden post stayed fully readable
// at its permalink AND kept emitting og:title/og:description/og:image. The
// same single-allowlist posture as lib/public-profile.ts, for the same reason.
//
// WHAT THE GATE FILTERS, and what each one costs if dropped:
//   · `hidden = false`  — moderation. Hiding a post already removes it from
//     the feed, from search and from /products (lib/posts.ts pins it in all
//     three); without this, hiding it did NOT remove it from its own public
//     URL, and /products + the sitemap now advertise that URL.
//   · author not `suspended`, not `is_bot` — a moderated member's post stayed
//     public with their name and photo attached, and a seeded bot profile's
//     post would too. Same flags lib/public-profile.ts uses.
//   · `account_type` in ('founder', 'explorer') — an allowlist, so `investor`
//     is out. public-profile.ts rule 5 says why in writing: "an INVESTOR's
//     presence on the platform is confidential", and this page attaches a name,
//     a photo and an og:image to a post for anonymous traffic. See
//     PUBLIC_AUTHOR_ROLES in lib/public-author.ts for why the explorer half of
//     that rule does NOT transfer here.
//   · NOT `profile_complete`. That one IS purely the directory allowlist
//     (public-profile.ts rule 5): this is not the directory, it is a post that
//     exists, written by whoever wrote it, and an unfinished profile is no
//     reason to 404 their own permalink.
// The author half is lib/public-author.ts isPubliclyAttributable(). In
// DEVELOPMENT ONLY a product by one of the three suspended test accounts also
// passes it (lib/test-accounts.ts), so a test product has a page; nothing else
// widens, and the comment preview below keeps the plain gate.
//
// ── DEV FIXTURES HAVE A PAGE TOO, IN DEVELOPMENT ONLY ─────────────────────
// The deck's sample products (../../products/fixtures.ts) have no row, so
// their cards' rows would open a 404. findFixture() answers first: in
// development a `fixture-…` id renders that sample's product page from the
// module — no comments, its own rating. Nothing on it can be SAVED: a
// logged-out visitor gets the same like / comment / connect buttons and
// "Sign in to rate" as on any product, and every one of them only opens the
// join dialog; a signed-in member gets no stars and no like row, and is NOT
// sent to /community/<id>, because there is nothing there. In a production
// build findFixture() returns null before it looks (NODE_ENV is a build-time
// constant), so this branch cannot be reached.
//
// ── THE COMMENT GATE IS REAL, AND IT WAS NOT ──────────────────────────────
// The intent has always been "show the first couple, then ask them to sign in
// to read the rest". The implementation fetched EVERY comment, rendered every
// one into the HTML, and hid the overflow with `max-h-44 overflow-hidden` plus
// a gradient — a CSS curtain. View-source, or any crawler, read the lot. It
// now slices SERVER-SIDE: PREVIEW_COMMENTS rows for display, and a separate
// exact count for the "{n}" in the button. Nothing past the preview is sent.
//
// Commenting itself still requires an account and that is the whole point of
// the surface: /components/PublicPostActions turns any interaction into a
// join modal. There is deliberately NO logged-out comment box.
//
// ── A PRODUCT SHOWS ITS RATING, READ-ONLY ─────────────────────────────────
// CLAUDE.md, "Founder decision (2026-11-10)": products have 1–5 star ratings.
// This page shows a show_and_tell's PUBLIC average and count, and a "Sign in to
// rate" that opens the same join modal as every other interaction here.
// Nothing is rated on this page: a visitor who signs in comes back through the
// redirect below to /community/<id>, which is where the stars are. The
// aggregate is read through the service role (lib/product-ratings.ts) like
// everything else on this page, and it carries no rater's identity or score.
// Only products: a `post` or a `milestone` gets no rating row.
//
// ── WHY THE APP CARD ON A (MARKETING) ROUTE ───────────────────────────────
// CLAUDE.md splits the two card surfaces — marketing is `rounded-[22px]` with
// a border and no shadow; the app card is 24px, borderless, `shadow-xs` — and
// says not to unify them. This page takes the APP one, and so does its
// closest sibling: app/(marketing)/founders/[slug], the public preview of
// /profile. The split is about marketing PAGES (landing, legal, editorial),
// not about which route group a file happens to sit in; both of these are the
// logged-out view of a member surface, showing one record, and they should
// look like the thing they are a preview of. The product branch takes the
// app's vertical rhythm too (py-14), for the same reason and because on a
// phone the screenshots are what should be in the first viewport.

import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, Rocket, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tServer, getLocale } from "@/lib/i18n-server";
import { t, type Locale } from "@/lib/i18n";
import { postImages, type ProductRating } from "@/lib/post-types";
import { getProductRating } from "@/lib/product-ratings";
import { authHref } from "@/lib/auth-href";
import { isPubliclyAttributable } from "@/lib/public-author";
import { devTestAuthorIds } from "@/lib/test-accounts";
import { webUrl } from "@/lib/web-url";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import {
  PublicPostActions,
  PublicRateButton,
} from "@/components/PublicPostActions";
import {
  buttonClasses,
  Card,
  EmptyState,
  Eyebrow,
  Section,
  SectionHeading,
} from "@/components/ui";
import {
  deckContextQuery,
  deckReturnHref,
} from "../../products/deck-position";
import { findFixture } from "../../products/fixtures";
import {
  ProductDetail,
  type ProductDetailPost,
} from "../../products/ProductDetail";

export const dynamic = "force-dynamic";

type DeckSearch = {
  from?: string | string[];
  category?: string | string[];
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<DeckSearch>;
};

/** How many comments a logged-out visitor is shown before the join gate.
 *  Two is enough to prove a conversation exists without being the archive. */
const PREVIEW_COMMENTS = 2;

/** Fetched before the author-visibility filter, so dropping a moderated
 *  commenter does not leave the preview short of PREVIEW_COMMENTS. */
const PREVIEW_FETCH = 10;

// Named columns, never `select("*")`, on a table whose rows are about to be
// handed to anonymous traffic. `author_id` is read to resolve the author and
// never rendered; `hidden` is not selected because the gate below filters on
// it rather than deciding in JS.
const PUBLIC_POST_COLUMNS =
  "id, author_id, title, content, kind, link_url, image_url, image_urls, tags, created_at";

// The author fields a public page may show, plus the three columns the gate
// reads. `email`, `age` and the rest of profiles stay out of this file (the
// development-only test-account check reads the email inside
// lib/test-accounts.ts, never here).
const PUBLIC_AUTHOR_COLUMNS =
  "full_name, photo_url, suspended, is_bot, account_type";

// Who may be credited — isPubliclyAttributable() and the allowlist of roles
// behind it — lives in lib/public-author.ts, because the landing's "Happening
// now" asks the same question about the same kind of author. Used here by BOTH
// the post gate and the comment-preview filter, so the two cannot drift.

function timeAgo(iso: string, locale: Locale): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return t("just now", locale);
  if (m < 60) return t("{n}m ago", locale).replace("{n}", String(m));
  if (h < 24) return t("{n}h ago", locale).replace("{n}", String(h));
  if (d < 7) return t("{n}d ago", locale).replace("{n}", String(d));
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type PublicPostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  kind: string | null;
  link_url: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  tags: string[] | null;
  created_at: string;
};

type PublicAuthor = { full_name: string | null; photo_url: string | null };

type PreviewComment = {
  id: string;
  content: string;
  created_at: string;
  author: PublicAuthor;
};

/**
 * The ONE gated read of a post for a logged-out visitor. `cache()` so the page
 * body and generateMetadata share a single round trip inside one request —
 * and, more importantly, so they can never disagree about whether a post is
 * public.
 *
 * FAILS CLOSED. A read error returns null (a 404) rather than an unfiltered
 * row: this is the only thing standing between a moderated post and the open
 * internet, and the failure mode of "fail open" here is publishing exactly
 * what an admin hid.
 */
const getPublicPost = cache(
  async (
    id: string,
  ): Promise<{ post: PublicPostRow; author: PublicAuthor } | null> => {
    const admin = createAdminClient();

    const { data: post, error } = await admin
      .from("forum_posts")
      .select(PUBLIC_POST_COLUMNS)
      .eq("id", id)
      .eq("hidden", false)
      .maybeSingle();
    if (error || !post) return null;

    const { data: author, error: authorError } = await admin
      .from("profiles")
      .select(PUBLIC_AUTHOR_COLUMNS)
      .eq("id", (post as PublicPostRow).author_id)
      .maybeSingle();
    // A post with no readable author is not publishable: the author's
    // moderation flags and role are part of the gate, so "could not read them"
    // has to mean no.
    if (authorError || !author) return null;
    if (!isPubliclyAttributable(author)) {
      // DEVELOPMENT ONLY: a PRODUCT by one of the suspended test accounts
      // still renders, so a test product can be opened and its whole flow
      // tried (lib/test-accounts.ts). Products only — a test account's post or
      // milestone stays a 404 — and `hidden = false` above still applies.
      // devTestAuthorIds() is the empty Set in a production build, before it
      // reads anything, so this arm always returns null there.
      const authorId = (post as PublicPostRow).author_id;
      const devTestProduct =
        (post as PublicPostRow).kind === "show_and_tell" &&
        (await devTestAuthorIds([authorId])).has(authorId);
      if (!devTestProduct) return null;
    }

    return {
      post: post as PublicPostRow,
      author: {
        full_name: author.full_name as string | null,
        photo_url: author.photo_url as string | null,
      },
    };
  },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // A development sample: a title for the tab, and never indexed. Null in a
  // production build, like the page branch it names.
  const fixture = findFixture(id);
  if (fixture) {
    return {
      title: fixture.title ?? "Product",
      robots: { index: false, follow: false },
    };
  }

  // The SAME gate as the page body — see the header. A hidden post, or one by
  // a suspended or bot author, emits no social card at all.
  const found = await getPublicPost(id);
  if (!found) return { title: "Post" };
  const { post } = found;

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
    // The bare permalink, whatever deck context (`?from=…&category=…`) the
    // address carries: those variants are one page.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // DEV ONLY, and ahead of the member redirect on purpose: see "DEV FIXTURES"
  // in the header. Null in a production build before it looks.
  const fixture = findFixture(id);
  if (fixture) {
    return (
      <ProductPage
        post={fixture}
        createdAt={fixture.created_at}
        author={{
          full_name: fixture.author?.full_name ?? null,
          photo_url: fixture.author?.photo_url ?? null,
        }}
        rating={fixture.rating}
        likeCount={0}
        comments={[]}
        total={0}
        backHref={deckReturnHref(search, fixture.id, user !== null)}
        returnPath={`/p/${fixture.id}${deckContextQuery(search)}`}
        signedIn={user !== null}
        locale={await getLocale()}
      />
    );
  }

  // Logged-in members get the full in-app experience (interactions work there).
  // This is also the role split behind the deck's card: ONE href, /p/<id>,
  // lands an anonymous reader on the gated public view and a member on the
  // real thread. Do not duplicate this decision at the link. The deck context
  // rides along, re-built from parsed values, so the member's back link still
  // returns to the card after this one.
  if (user) {
    redirect(`/community/${encodeURIComponent(id)}${deckContextQuery(search)}`);
  }

  const found = await getPublicPost(id);
  if (!found) notFound();
  const { post, author } = found;

  const admin = createAdminClient();
  const locale = await getLocale();
  const isProduct = post.kind === "show_and_tell";

  const [
    { count: likeCount },
    { data: commentRows, count: commentCount },
    rating,
  ] = await Promise.all([
    admin
      .from("forum_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", id),
    // `count: "exact"` alongside `limit()` returns the FULL tally in the
    // Content-Range header while the body carries only the preview rows —
    // which is what makes the gate below real instead of a CSS curtain.
    admin
      .from("forum_comments")
      .select("id, author_id, content, created_at", { count: "exact" })
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .limit(PREVIEW_FETCH),
    // Products only. Degrades to UNRATED on failure — see
    // lib/product-ratings.ts — so it can never 500 this page.
    isProduct ? getProductRating(id) : Promise.resolve(null),
  ]);

  // The preview's authors, filtered the same way the post's author is. A
  // moderated account must not get an avatar and a name on a public page just
  // because it commented rather than posted.
  const previewAuthorIds = Array.from(
    new Set((commentRows ?? []).map((c) => c.author_id as string)),
  );
  const { data: previewAuthors } = previewAuthorIds.length
    ? await admin
        .from("profiles")
        .select(`id, ${PUBLIC_AUTHOR_COLUMNS}`)
        .in("id", previewAuthorIds)
    : { data: [] };
  const visibleAuthors = new Map(
    (previewAuthors ?? [])
      .filter(isPubliclyAttributable)
      .map((a) => [a.id as string, a]),
  );
  const comments: PreviewComment[] = (commentRows ?? [])
    .filter((c) => visibleAuthors.has(c.author_id as string))
    .slice(0, PREVIEW_COMMENTS)
    .map((c) => {
      const a = visibleAuthors.get(c.author_id as string);
      return {
        id: c.id as string,
        content: c.content as string,
        created_at: c.created_at as string,
        author: {
          full_name: (a?.full_name as string | null) ?? null,
          photo_url: (a?.photo_url as string | null) ?? null,
        },
      };
    });

  // The tally counts every comment on the post, including any whose author was
  // later moderated — the comment exists, so the number is honest; it is the
  // RENDERING of a moderated account that the filter above is about.
  const total = commentCount ?? 0;

  if (isProduct) {
    return (
      <ProductPage
        post={post}
        createdAt={post.created_at}
        author={author}
        rating={rating}
        likeCount={likeCount ?? 0}
        comments={comments}
        total={total}
        backHref={deckReturnHref(search, post.id, false)}
        returnPath={`/p/${post.id}${deckContextQuery(search)}`}
        signedIn={false}
        locale={locale}
      />
    );
  }

  // The bare permalink for the share button; the deck context rides along on
  // the sign-in links only (see "SIGNING IN COMES BACK HERE").
  const self = `/p/${post.id}`;
  const returnPath = `${self}${deckContextQuery(search)}`;
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

  // The button's name, resolved the way the shelf resolves a product's: the
  // title, else the first non-empty line, and the HOST as the last resort —
  // never the author, which would put "Try Wasit Jingjit" on a button that
  // opens an app.
  const linkName =
    post.title?.trim() ||
    post.content.split("\n").find((l) => l.trim())?.trim() ||
    host;
  const tTryIt = link
    ? (await tServer("Try {name}")).replace("{name}", linkName ?? "")
    : null;
  // An EXISTING dictionary key, already Thai, so this ships translated instead
  // of waiting on new copy; the org pages name a screenshot the same way
  // (`${t("Product image", locale)} ${i + 1}`).
  const tProductImage = await tServer("Product image");

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
              {tTryIt}
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
                  alt={`${tProductImage} ${i + 1}`}
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
            likeCount={likeCount ?? 0}
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

/**
 * A show_and_tell's page for a logged-out visitor (or, in development, a
 * sample's page for anyone). The product itself is <ProductDetail>, shared
 * with /community/<id>; this adds who made it, the like/comment/connect row,
 * the comment preview and the ways in.
 */
async function ProductPage({
  post,
  createdAt,
  author,
  rating,
  likeCount,
  comments,
  total,
  backHref,
  returnPath,
  signedIn,
  locale,
}: {
  post: ProductDetailPost;
  createdAt: string;
  author: PublicAuthor;
  rating: ProductRating | null;
  likeCount: number;
  comments: PreviewComment[];
  total: number;
  backHref: string;
  /** `next` for every sign-in link here: /p/<id> with the deck context. */
  returnPath: string;
  /** Only ever true for a development sample: a real row redirects a member
   *  to /community/<id> before this renders. A signed-in reader is not asked
   *  to sign in. */
  signedIn: boolean;
  locale: Locale;
}) {
  // The bare permalink, for the share button.
  const self = `/p/${post.id}`;
  const aFounder = await tServer("A founder");
  const authorName = author.full_name ?? aFounder;
  const commentsGated = total > comments.length;

  // The 1120px container, because from `lg` the product card is images beside
  // words (see ProductDetail); everything under it keeps the 640px column.
  return (
    <Section className="pb-28">
      <ProductDetail
        post={post}
        locale={locale}
        backHref={backHref}
        rating={rating}
        rateSlot={signedIn ? null : <PublicRateButton next={returnPath} />}
      >
        {/* Who made it: below the product, because the product is what the
            visitor came to see. */}
        <div className="mt-6 flex items-center gap-3">
          <Avatar name={author.full_name} url={author.photo_url} size="sm" />
          <p className="min-w-0 text-sm text-ink-muted">
            <span className="font-medium text-navy">{authorName}</span>
            {" · "}
            {await tServer("shipped")}
            {" · "}
            {timeAgo(createdAt, locale)}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
          {signedIn ? (
            <span />
          ) : (
            <PublicPostActions
              likeCount={likeCount}
              commentCount={total}
              next={returnPath}
            />
          )}
          <ShareButton path={self} title={post.title ?? post.content.slice(0, 80)} />
        </div>
      </ProductDetail>

      {/* The comments, last of what the page is for. ALWAYS shown on a
          product, empty or not: commenting is one of the three things this
          page exists for, so the way to it cannot depend on someone having
          gone first. Read-only here, and only the preview rows reached the
          server render. */}
      <section className="mx-auto mt-14 max-w-[640px]">
        <SectionHeading title={await tServer("Comments")} />
        {comments.length > 0 ? (
          <Card padding="responsive">
            <CommentPreview comments={comments} locale={locale} />
          </Card>
        ) : (
          // No preview rows. With `total` at zero that is "nobody has yet";
          // above zero, every commenter in the preview window was moderated,
          // and the conversation is still real, so the gate below says so.
          total === 0 && (
            <EmptyState
              padding="lg"
              dense
              description={await tServer("No comments yet.")}
            />
          )
        )}
        {/* "Sign in to …" goes to sign-in, and both carry this product as
            `next`, so the reader comes back to it with the comment box. */}
        {!signedIn && (
          <div className="mt-5 flex flex-wrap gap-3">
            {commentsGated && (
              <Link
                href={authHref("/login", returnPath)}
                className={buttonClasses({ size: "sm", variant: "secondary" })}
              >
                {(await tServer("Sign in to see all {n} comments")).replace(
                  "{n}",
                  String(total),
                )}
              </Link>
            )}
            <Link
              href={authHref("/login", returnPath)}
              className={buttonClasses({ size: "sm" })}
            >
              {await tServer("Sign in to comment")}
            </Link>
          </div>
        )}
      </section>

      {!signedIn && (
        <>
          <JoinCta next={returnPath} className="mx-auto mt-14 max-w-[640px]" />
          <StickySignIn next={returnPath} authorName={authorName} />
        </>
      )}
    </Section>
  );
}

/** The preview rows: avatar, name, time, text. */
function CommentPreview({
  comments,
  locale,
}: {
  comments: PreviewComment[];
  locale: Locale;
}) {
  return (
    <ul className="space-y-4 empty:hidden">
      {comments.map((c) => (
        <li key={c.id} className="flex items-start gap-2.5">
          <Avatar name={c.author.full_name} url={c.author.photo_url} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-muted">
              <span className="text-navy font-medium">
                {c.author.full_name ?? t("A founder", locale)}
              </span>
              {" · "}
              {timeAgo(c.created_at, locale)}
            </div>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-0.5">
              {c.content}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The dark "join" panel under the post. */
async function JoinCta({
  next,
  className,
}: {
  next: string;
  className?: string;
}) {
  return (
    <Card tone="navy" padding="lg" className={`${className ?? ""} text-center`}>
      {/* `text-white` on the heading itself: @layer base gives every h1–h6
          `color: navy`, which the panel's inherited white does not override,
          so without it this heading rendered navy on navy (measured: both
          rgb(27, 26, 23)). */}
      <h2 className="text-d1 mb-2 text-white">
        {await tServer("Where Thai founders connect")}
      </h2>
      <p className="text-sm text-white/70 leading-relaxed max-w-md mx-auto mb-5">
        {await tServer(
          "Community, partners, and co-founders — in one place. Free to join.",
        )}
      </p>
      <Link
        href={authHref("/signup", next)}
        className={buttonClasses({ variant: "inverse", size: "md" })}
      >
        {await tServer("Create your profile")}
      </Link>
    </Card>
  );
}

/** Persistent sign-in gate — LinkedIn-style, always visible. */
async function StickySignIn({
  next,
  authorName,
}: {
  next: string;
  authorName: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-line shadow-[0_-2px_16px_rgba(27,26,23,0.08)]">
      <div className="max-w-[640px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-ink min-w-0 truncate">
          {(
            await tServer(
              "{name} is on Cofoundee — sign in to connect and see more.",
            )
          ).replace("{name}", authorName)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={authHref("/login", next)}
            className="px-3 py-2 text-sm text-ink-muted hover:text-navy"
          >
            {await tServer("Sign in")}
          </Link>
          <Link
            href={authHref("/signup", next)}
            className={buttonClasses({
              size: "sm",
              className: "whitespace-nowrap",
            })}
          >
            {await tServer("Join free")}
          </Link>
        </div>
      </div>
    </div>
  );
}
