// /products/<id> — a product's page, for every reader.
//
// ── A PRODUCT IS NOT A POST ───────────────────────────────────────────────
// A product is stored as a forum_posts row (kind 'show_and_tell'), which is
// why its page used to be a post's: /p/<id> for a visitor and /community/<id>
// for a member, under the Community item of the rail, with an address a
// visitor could not open and an onboarding wall for a founder who had not
// finished it. It is one page now, at a product's own address, for anyone:
//   signed out   the product, its rating, the first comments and the ways in
//                (sign in to rate, to comment, to see the rest).
//   signed in    the same product with the member's own stars, the like, the
//                whole thread and the composer, a Share button, and — for its
//                maker — Edit.
// /p/<id> and /community/<id> both send a product here, deck context kept, so
// every link already out there still lands.
//
// A (MARKETING) ROUTE ON PURPOSE. Signed in, app/(marketing)/layout.tsx draws
// the same app shell as every app route but runs none of the (app) layout's
// gates — the deck (/products) is the same, and a product's page is a page of
// the deck. So a founder who has not finished onboarding can read it, as they
// can the deck and its review modal, and an investor can too. The rail marks
// Products: /products/<id> is under /products (components/SidebarNav.tsx).
// What a role may DO here is decided per control below (canComment, canRate),
// and again inside each action.
//
// ── WHAT THE PAGE IS, IN ORDER ────────────────────────────────────────────
// ../ProductDetail.tsx draws the product — the way back to the deck, the
// gallery, the name and description, "Try it", the rating — and this page adds
// who made it, the like / share / edit row, and the comments under the card.
// The deck sends its place along (`?from=products&category=game`), which only
// ever feeds deckReturnHref() and the sign-in links, re-parsed, never echoed
// (../deck-position.ts). The canonical address is the bare /products/<id>.
//
// ── THE TWO GATES ─────────────────────────────────────────────────────────
// Signed out: lib/public-post.ts getPublicPost(), the single gated read behind
// this page AND generateMetadata (it says what it filters and why). Signed in:
// the member's own client, where forum_posts' SELECT policy is `using (true)`,
// so the gate is written here — a hidden product, or one by a suspended member
// or a seeded bot, is a 404 for everyone except its maker and an admin, the two
// readers with a reason to see it, and a blocked pair cannot open each other's.
// In DEVELOPMENT ONLY a product by one of the suspended test accounts still
// renders in both (lib/test-accounts.ts).
//
// ── `?added=1` and `?saved=1` ─────────────────────────────────────────────
// createProductAction lands the maker here after adding a product, and
// updateProductAction after editing one (lib/post-actions.ts). Shown to the
// MAKER only: a short confirmation — for a new one, that it is on the shelf
// and was not announced.
//
// ── DEV FIXTURES HAVE A PAGE TOO, IN DEVELOPMENT ONLY ─────────────────────
// The deck's sample products (../fixtures.ts) have no row. In development a
// `fixture-…` id renders that sample from the module, with nothing on it that
// can be saved: a visitor's buttons all open the join dialog, and a member
// gets no stars and no like row. In a production build findFixture() returns
// null before it looks, so this branch cannot be reached.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getAccountRole } from "@/lib/account";
import { canComment, canRate } from "@/lib/roles";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import { getMyProductRating, getProductRating } from "@/lib/product-ratings";
import { publicProductAuthors } from "@/lib/posts";
import { devTestAuthorIds } from "@/lib/test-accounts";
import { authHref } from "@/lib/auth-href";
import { t, type Locale } from "@/lib/i18n";
import { getLocale, tServer } from "@/lib/i18n-server";
import { timeAgo } from "@/lib/time";
import {
  postImages,
  productPath,
  type ProductRating,
} from "@/lib/post-types";
import {
  getPublicEngagement,
  getPublicPost,
  PRODUCT_KIND,
  type PreviewComment,
  type PublicAuthor,
} from "@/lib/public-post";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import {
  PublicPostActions,
  PublicRateButton,
} from "@/components/PublicPostActions";
import {
  CommentPreview,
  JoinCta,
  StickySignIn,
  publicTimeAgo,
} from "@/components/PublicPostParts";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import {
  buttonClasses,
  Card,
  EmptyState,
  LinkButton,
  Section,
  SectionHeading,
} from "@/components/ui";
import { LikeButton } from "@/app/(app)/community/[id]/LikeButton";
import { RatingControl } from "@/app/(app)/community/[id]/RatingControl";
import { CommentComposer } from "@/app/(app)/community/[id]/CommentComposer";
import { CommentItem } from "@/app/(app)/community/[id]/CommentItem";
import { deckContextQuery, deckReturnHref } from "../deck-position";
import { findFixture } from "../fixtures";
import { ProductDetail, type ProductDetailPost } from "../ProductDetail";
import { productName } from "../product-view";

export const dynamic = "force-dynamic";

type Search = {
  from?: string | string[];
  category?: string | string[];
  added?: string | string[];
  saved?: string | string[];
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
};

/** The secondary actions in the card's bottom row: Share, and Edit. */
const ROW_LINK =
  "inline-flex items-center gap-1 text-ink-muted transition-colors hover:text-navy";

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

  // The SAME gate as the signed-out page body. A hidden product, or one by a
  // suspended or bot author, emits no social card at all — the maker and an
  // admin, who can still open it, get a plain title.
  const found = await getPublicPost(id);
  if (!found || found.post.kind !== PRODUCT_KIND) {
    return { title: await tServer("Product") };
  }
  const { post } = found;

  const title = productName(post, post.content.slice(0, 70));
  const description = post.content.slice(0, 160);
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";
  // Always an image, so the social card is rich: the first screenshot, or the
  // branded site image.
  const images = [postImages(post)[0] ?? `${SITE_URL}/og-image.png`];
  return {
    // Bare title — the root layout's "%s · Cofoundee" template adds the suffix.
    title,
    description,
    // The bare address, whatever deck context the request carries: those
    // variants are one page.
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/products/${id}`,
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

export default async function ProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // DEV ONLY: see "DEV FIXTURES" in the header. Null in a production build.
  const fixture = findFixture(id);
  if (fixture) {
    return (
      <PublicProduct
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
        returnPath={`${productPath(fixture.id)}${deckContextQuery(search)}`}
        signedIn={user !== null}
        locale={locale}
      />
    );
  }

  if (user) {
    return (
      <MemberProduct
        id={id}
        viewer={{ id: user.id, email: user.email ?? null }}
        search={search}
        locale={locale}
      />
    );
  }

  const found = await getPublicPost(id);
  if (!found || found.post.kind !== PRODUCT_KIND) notFound();
  const { post, author } = found;
  const [{ likeCount, comments, total }, rating] = await Promise.all([
    getPublicEngagement(id),
    // Degrades to UNRATED on failure (lib/product-ratings.ts), so it can never
    // 500 this page.
    getProductRating(id),
  ]);

  return (
    <PublicProduct
      post={post}
      createdAt={post.created_at}
      author={author}
      rating={rating}
      likeCount={likeCount}
      comments={comments}
      total={total}
      backHref={deckReturnHref(search, post.id, false)}
      returnPath={`${productPath(post.id)}${deckContextQuery(search)}`}
      signedIn={false}
      locale={locale}
    />
  );
}

/**
 * A product for a logged-out visitor (or, in development, a sample for
 * anyone). Read-only: the rating's average and count, "Sign in to rate", the
 * first comments, and the ways in. Every sign-in link carries this page, with
 * the deck context, as `next` (lib/auth-href.ts), so signing in comes back to
 * it with the stars and the comment box.
 */
async function PublicProduct({
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
  /** `next` for every sign-in link here: this page with the deck context. */
  returnPath: string;
  /** Only ever true for a development sample: a real row renders the member
   *  view for a signed-in reader. A signed-in reader is not asked to sign in. */
  signedIn: boolean;
  locale: Locale;
}) {
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
            {publicTimeAgo(createdAt, locale)}
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
          <ShareButton
            path={productPath(post.id)}
            title={post.title ?? post.content.slice(0, 80)}
          />
        </div>
      </ProductDetail>

      {/* The comments, last of what the page is for. ALWAYS shown on a
          product, empty or not: commenting is one of the three things this
          page exists for, so the way to it cannot depend on someone having
          gone first. Read-only here, and only the preview rows reached the
          server render (lib/public-post.ts getPublicEngagement). */}
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

/**
 * A product for a signed-in member: the member's own stars, the like, the
 * whole thread with the composer, Share, and Edit for its maker. Read through
 * the member's own client (forum_posts, forum_comments and profiles are all
 * readable to `authenticated`); only the moderation flags of the maker and the
 * public rating go through the service role.
 */
async function MemberProduct({
  id,
  viewer,
  search,
  locale,
}: {
  id: string;
  /** The signed-in reader; `email` because isAdminUser also accepts the
   *  admin email allowlist. */
  viewer: { id: string; email: string | null };
  search: Search;
  locale: Locale;
}) {
  const supabase = await createClient();
  const userId = viewer.id;

  // `maybeSingle`: a malformed id or a missing row is a plain 404, not a
  // thrown error.
  const { data: post } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, title, content, kind, link_url, image_url, image_urls, tags, platforms, created_at, hidden",
    )
    .eq("id", id)
    .maybeSingle();
  if (!post || post.kind !== PRODUCT_KIND) notFound();

  const authorId = post.author_id as string;
  const isAuthor = authorId === userId;

  // THE MODERATION GATE — see "THE TWO GATES" in the header. The maker's two
  // flags through the service role; a failed or empty read counts as
  // moderated, so it can only fail closed.
  if (!isAuthor) {
    const { data: flags, error: flagsError } = await createAdminClient()
      .from("profiles")
      .select("suspended, is_bot")
      .eq("id", authorId)
      .maybeSingle();
    const authorModerated =
      !!flagsError ||
      !flags ||
      flags.suspended === true ||
      flags.is_bot === true;
    if (post.hidden !== false || authorModerated) {
      // DEVELOPMENT ONLY: a non-hidden product by a test account. The empty
      // Set in a production build, before it reads, so this is false there.
      const devTestProduct =
        post.hidden === false &&
        (await devTestAuthorIds([authorId])).has(authorId);
      if (!devTestProduct && !(await isAdminUser(supabase, viewer))) {
        notFound();
      }
    }
  }

  // A blocked pair can't open each other's products, and 404 (not a message)
  // is the right answer — it says nothing about who blocked whom. Comments
  // from blocked members are dropped the same way the feed drops their posts.
  if (await isBlockedEitherWay(userId, authorId)) notFound();
  const blocked = await getBlockedIds(userId);

  // Commenting: founders AND explorers (canComment). Investors read only.
  const role = await getAccountRole(supabase, userId);
  const mayComment = canComment(role);

  // RATINGS (CLAUDE.md, "Founder decision (2026-11-10)"). The public average
  // and count show to every reader; the five stars render only where
  // setProductRatingAction would accept them: a role that canRate, not the
  // maker, and not a hidden product. The action and 0079's RLS re-check all
  // of it. Both reads degrade to "unrated" on failure (lib/product-ratings.ts).
  const mayRate = canRate(role) && !isAuthor && post.hidden === false;

  const [
    rating,
    myScore,
    { data: author },
    { count: likeCount },
    { data: myLike },
    { data: commentRows },
  ] = await Promise.all([
    getProductRating(id),
    mayRate
      ? getMyProductRating(supabase, id, userId)
      : Promise.resolve(null),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url")
      .eq("id", authorId)
      .maybeSingle(),
    supabase
      .from("forum_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", id),
    supabase
      .from("forum_likes")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("forum_comments")
      .select("id, author_id, content, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const comments = (commentRows ?? []).filter(
    (c) => !blocked.has(c.author_id as string),
  );
  const commentAuthorIds = Array.from(
    new Set(comments.map((c) => c.author_id as string)),
  );
  const { data: commentAuthors } = commentAuthorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", commentAuthorIds)
    : { data: [] };
  const authorMap = new Map(
    (commentAuthors ?? []).map((a) => [a.id as string, a]),
  );

  const [commentsLabel, tShipped, tEdit] = await Promise.all([
    tServer("Comments"),
    tServer("shipped"),
    tServer("Edit"),
  ]);
  const authorName =
    (author?.full_name as string | null) ?? t("A founder", locale);
  const authorHref = `/profile/${authorId}`;

  // `?added=1` / `?saved=1`, for the maker only (see the header). Whether a
  // new product is really on the shelf is ASKED, not assumed: the shelf's own
  // author gate (publicProductAuthors), plus the development-only test-account
  // allowance, decides that — so a maker whose account the shelf cannot show
  // is told it is saved, never that it is on the deck.
  const added = isAuthor && search.added === "1";
  const saved = isAuthor && !added && search.saved === "1";
  const onShelf =
    added &&
    post.hidden === false &&
    (!!(await publicProductAuthors([authorId]))?.has(authorId) ||
      (await devTestAuthorIds([authorId])).has(authorId));

  // In ProductDetail's own column (its `notice` slot), so it lines up with the
  // card at every width. "See it on the deck" is plain /products: the deck is
  // newest first and a fresh visit starts at card 1, which is this product.
  const notice =
    added || saved ? (
      <Card padding="sm" role="status" className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-navy"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {saved
              ? await tServer("Your changes are saved.")
              : onShelf
                ? await tServer("Your product is on the shelf.")
                : await tServer("Your product is saved.")}
          </p>
          {added && (
            <p className="mt-1 text-sm text-ink-muted">
              {await tServer(
                "Nothing was posted to the community feed. If you want to announce it, write a post.",
              )}
            </p>
          )}
          {onShelf && (
            <LinkButton
              href="/products"
              size="sm"
              variant="secondary"
              className="mt-3"
            >
              {await tServer("See it on the deck")}
            </LinkButton>
          )}
        </div>
      </Card>
    ) : null;

  // The 1120px container: from `lg` the product card is images beside words
  // (ProductDetail); the thread under it keeps the 640px column.
  return (
    <Section>
      <ProductDetail
        notice={notice}
        post={{
          id: post.id as string,
          title: (post.title as string | null) ?? null,
          content: post.content as string,
          link_url: (post.link_url as string | null) ?? null,
          image_url: (post.image_url as string | null) ?? null,
          image_urls: (post.image_urls as string[] | null) ?? null,
          platforms: (post.platforms as string[] | null) ?? null,
          tags: (post.tags as string[] | null) ?? null,
        }}
        locale={locale}
        backHref={deckReturnHref(search, post.id as string, true)}
        rating={rating}
        rateSlot={
          mayRate ? (
            <RatingControl postId={post.id as string} initialScore={myScore} />
          ) : null
        }
      >
        {/* Who made it, below the product: the product is what the reader
            came to see. */}
        <div className="mt-6 flex items-center gap-3">
          <Link href={authorHref}>
            <Avatar
              name={author?.full_name as string}
              url={author?.photo_url as string | null}
              size="sm"
            />
          </Link>
          <p className="min-w-0 text-sm text-ink-muted">
            <Link
              href={authorHref}
              className="font-medium text-navy transition-colors hover:text-gold-ink"
            >
              {authorName}
            </Link>
            {" · "}
            {tShipped}
            {" · "}
            {timeAgo(post.created_at as string, locale)}
          </p>
        </div>

        {/* The like control and the comment read-out on the left, one type
            scale; Share and, for its maker, Edit on the right. Share sends the
            bare /products/<id>, which opens for anyone. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-5 text-sm">
          <div className="flex items-center gap-4">
            <LikeButton
              postId={post.id as string}
              initialCount={likeCount ?? 0}
              initialLiked={!!myLike}
            />
            {/* Plain read-out, not a control: the composer below is how you
                comment. */}
            <span className="inline-flex items-center gap-2 text-ink-muted">
              <MessageCircle
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="tabular-nums">{comments.length}</span>
              <span className="sr-only">{commentsLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthor && (
              <Link href={`${productPath(id)}/edit`} className={ROW_LINK}>
                <Pencil
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span>{tEdit}</span>
              </Link>
            )}
            <ShareButton
              path={productPath(id)}
              title={
                (post.title as string | null) ??
                (post.content as string).slice(0, 80)
              }
            />
          </div>
        </div>
      </ProductDetail>

      {/* The thread. `#comments` is where a comment notification and My
          products' "See all {n} comments" land; scroll-mt clears the phone's
          sticky top bar (64.8px) when it jumps here. */}
      <section
        id="comments"
        className="mx-auto mt-14 max-w-[640px] scroll-mt-20"
      >
        <SectionHeading title={commentsLabel} />

        <RealtimeRefresh
          table="forum_comments"
          filter={`post_id=eq.${id}`}
          currentUserId={userId}
          senderColumn="author_id"
          kind="comments"
        />

        {comments.length ? (
          <Card
            padding="none"
            className="mb-6 divide-y divide-line overflow-hidden px-6"
          >
            {comments.map((c) => {
              const a = authorMap.get(c.author_id as string);
              return (
                <CommentItem
                  key={c.id as string}
                  id={c.id as string}
                  postId={id}
                  content={c.content as string}
                  createdAt={c.created_at as string}
                  isOwn={userId === c.author_id}
                  author={
                    a
                      ? {
                          id: a.id as string,
                          full_name: (a.full_name as string) ?? null,
                          photo_url: (a.photo_url as string | null) ?? null,
                        }
                      : null
                  }
                />
              );
            })}
          </Card>
        ) : (
          // No comments yet. The composer renders directly below for anyone
          // who may comment, so the copy names two easy openings instead of
          // repeating a button; an investor gets the statement of fact.
          <EmptyState
            padding="lg"
            dense
            className="mb-6"
            description={
              mayComment
                ? await tServer(
                    "No comments yet. Ask a question or add what you know.",
                  )
                : await tServer("No comments yet.")
            }
          />
        )}

        {mayComment && <CommentComposer postId={id} />}
      </section>
    </Section>
  );
}
