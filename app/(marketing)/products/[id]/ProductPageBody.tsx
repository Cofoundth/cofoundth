// A product's page, as a component: its own route (./page.tsx, which holds
// the long story — the two gates, `?added=1`, the dev fixtures) and the deck's
// modal (`?product=<id>`, ../ProductModal.tsx, the founder's call 2026-11-18)
// both render this, so the product a reader sees, and what they may do on it,
// cannot drift between the two. ProductMode says what the modal leaves out.

import Link from "next/link";
import type { ReactNode } from "react";
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
import { productPath, type ProductRating } from "@/lib/post-types";
import {
  getPublicEngagement,
  getPublicPost,
  PRODUCT_KIND,
  type PreviewComment,
  type PublicAuthor,
} from "@/lib/public-post";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import { ReportButton } from "@/components/ReportButton";
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
import { CommentThread } from "@/components/CommentThread";
import { countComments, readCommentBatch } from "@/lib/comment-thread";
import { readListingWithAvailability } from "@/lib/product-store-data";
import { hasTriedProduct, TRY_BEFORE_COMMENTING } from "@/lib/product-tries";
import {
  PRODUCT_PARAM,
  VIEW_PARAM,
  deckContextQuery,
  deckReturnHref,
  parseProductView,
} from "../deck-position";
import { PARAM, parseCategoryParam } from "../categories";
import { findFixture } from "../fixtures";
import { ProductDetail, type ProductDetailPost } from "../ProductDetail";

export type ProductSearch = {
  from?: string | string[];
  category?: string | string[];
  view?: string | string[];
  added?: string | string[];
  saved?: string | string[];
};

/** The secondary actions in the card's bottom row: Share, and Edit. */
const ROW_LINK =
  "inline-flex items-center gap-1 text-ink-muted transition-colors hover:text-navy";

/**
 * Where a product is drawn: its own page, /products/<id>, or the deck's
 * modal (`?product=<id>` on / and /products, ../ProductModal.tsx). The same
 * product, the same gates and the same controls in both; the modal leaves out
 * only what belongs to a page of its own — the way back to the deck (the modal
 * closes instead), the bar pinned to the bottom of the screen, the "added" and
 * "saved" confirmations — and says a product is not available where the page
 * would 404, because a 404 inside a modal would take the deck down with it.
 */
export type ProductMode = "page" | "modal";

export async function ProductPageBody({
  id,
  search,
  mode = "page",
}: {
  id: string;
  search: ProductSearch;
  mode?: ProductMode;
}) {
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // DEV ONLY: see "DEV FIXTURES" in the header. Null in a production build.
  const fixture = findFixture(id);
  if (fixture) {
    const role = user ? await getAccountRole(supabase, user.id) : null;
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
        backHref={
          mode === "page"
            ? deckReturnHref(search, fixture.id, user !== null)
            : null
        }
        returnPath={returnPathOf(fixture.id, search, mode)}
        signedIn={user !== null}
        sampleCanComment={role !== null && canComment(role)}
        locale={locale}
        mode={mode}
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
        mode={mode}
      />
    );
  }

  const found = await getPublicPost(id);
  if (!found || found.post.kind !== PRODUCT_KIND) return missing(mode, locale);
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
      backHref={mode === "page" ? deckReturnHref(search, post.id, false) : null}
      returnPath={returnPathOf(post.id, search, mode)}
      signedIn={false}
      locale={locale}
      mode={mode}
    />
  );
}

/** `next` for every sign-in link on the product: its own page with the deck
 *  context, or — in the modal — the deck, on the same category, with this
 *  product open again (at /products: / sends a member to their own home). */
function returnPathOf(id: string, search: ProductSearch, mode: ProductMode): string {
  if (mode === "page") return `${productPath(id)}${deckContextQuery(search)}`;
  const query = new URLSearchParams();
  const category = parseCategoryParam(search.category);
  if (category) query.set(PARAM, category);
  if (parseProductView(search.view) === "grid") query.set(VIEW_PARAM, "grid");
  query.set(PRODUCT_PARAM, id);
  return `/products?${query}`;
}

/** What the page's 404 is in the modal: the product is not there for this
 *  reader, said in the modal itself. notFound() never returns, so either way
 *  the caller can `return` it. */
function missing(mode: ProductMode, locale: Locale) {
  if (mode === "page") notFound();
  return (
    <EmptyState
      padding="lg"
      description={t("The product isn’t available", locale)}
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
  sampleCanComment = false,
  locale,
  mode,
}: {
  post: ProductDetailPost;
  createdAt: string;
  author: PublicAuthor;
  rating: ProductRating | null;
  likeCount: number;
  comments: PreviewComment[];
  total: number;
  /** null in the modal, which closes instead. */
  backHref: string | null;
  /** `next` for every sign-in link here: this page with the deck context. */
  returnPath: string;
  /** Only ever true for a development sample: a real row renders the member
   *  view for a signed-in reader. A signed-in reader is not asked to sign in. */
  signedIn: boolean;
  sampleCanComment?: boolean;
  locale: Locale;
  mode: ProductMode;
}) {
  const aFounder = await tServer("A founder");
  const authorName = author.full_name ?? aFounder;
  const commentsGated = total > comments.length;

  // One 1120px column of cards, the comments included (ProductDetail, "THE
  // FORMAT").
  return (
    <ProductFrame mode={mode} className="pb-28">
      <ProductDetail
        post={post}
        locale={locale}
        backHref={backHref}
        rating={rating}
        feedback={{
          reviewable: signedIn,
          myScore: null,
          sample: signedIn,
          viewer: { signedIn, canComment: sampleCanComment },
          returnPath,
        }}
        rateSlot={signedIn ? null : <PublicRateButton next={returnPath} />}
        maker={
          <div className="flex items-center gap-3">
            <Avatar name={author.full_name} url={author.photo_url} size="sm" />
            <p className="min-w-0 text-sm text-ink-muted">
              <span className="font-medium text-navy">{authorName}</span>
              {" · "}
              {await tServer("shipped")}
              {" · "}
              {publicTimeAgo(createdAt, locale)}
            </p>
          </div>
        }
      >
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
      <section className="mt-14">
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
          <JoinCta next={returnPath} className="mt-14" />
          {/* Pinned to the bottom of the SCREEN: a page's, not a modal's. */}
          {mode === "page" && (
            <StickySignIn next={returnPath} authorName={authorName} />
          )}
        </>
      )}
    </ProductFrame>
  );
}

/** The modal provides its own padding for both the skeleton and the content. */
function ProductFrame({
  mode,
  className,
  children,
}: {
  mode: ProductMode;
  className?: string;
  children: ReactNode;
}) {
  return mode === "page" ? (
    <Section className={className}>{children}</Section>
  ) : (
    children
  );
}

/**
 * A product for a signed-in member: the member's own stars, the like, the
 * whole thread with the composer, Share, Edit for its maker and Report for
 * everyone else (the product, and each comment). Read through
 * the member's own client (forum_posts, forum_comments and profiles are all
 * readable to `authenticated`); only the moderation flags of the maker and the
 * public rating go through the service role.
 */
async function MemberProduct({
  id,
  viewer,
  search,
  locale,
  mode,
}: {
  id: string;
  /** The signed-in reader; `email` because isAdminUser also accepts the
   *  admin email allowlist. */
  viewer: { id: string; email: string | null };
  search: ProductSearch;
  locale: Locale;
  mode: ProductMode;
}) {
  const supabase = await createClient();
  const userId = viewer.id;

  // `maybeSingle`: a malformed id or a missing row is a plain 404, not a
  // thrown error.
  const { data: post } = await readListingWithAvailability(supabase, id);
  if (!post || post.kind !== PRODUCT_KIND) return missing(mode, locale);

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
        return missing(mode, locale);
      }
    }
  }

  // A blocked pair can't open each other's products, and 404 (not a message)
  // is the right answer — it says nothing about who blocked whom. Comments
  // from blocked members are dropped the same way the feed drops their posts.
  if (await isBlockedEitherWay(userId, authorId)) return missing(mode, locale);

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
    batch,
    commentTotal,
    mayPostFeedback,
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
    // The thread's newest batch and how many there are in all
    // (lib/comment-thread.ts): never the whole thread at once.
    readCommentBatch(supabase, { postId: id, viewerId: userId, blocked }).catch(
      () => ({ comments: [], hasEarlier: false, cursor: null }),
    ),
    countComments(supabase, id, blocked),
    mayComment && (isAuthor || hasTriedProduct(supabase, userId, id)),
  ]);

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
  // A page's only: the modal is never where a save lands.
  const added = mode === "page" && isAuthor && search.added === "1";
  const saved = mode === "page" && isAuthor && !added && search.saved === "1";
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

  // One 1120px column of cards, the thread included (ProductDetail, "THE
  // FORMAT").
  return (
    <ProductFrame mode={mode}>
      <ProductDetail
        notice={notice}
        post={{
          id: post.id as string,
          title: (post.title as string | null) ?? null,
          content: post.content as string,
          link_url: (post.link_url as string | null) ?? null,
          ios_store_url: post.ios_store_url,
          android_store_url: post.android_store_url,
          platforms: post.platforms,
          image_url: (post.image_url as string | null) ?? null,
          image_urls: (post.image_urls as string[] | null) ?? null,
          tags: (post.tags as string[] | null) ?? null,
        }}
        locale={locale}
        backHref={
          mode === "page" ? deckReturnHref(search, post.id as string, true) : null
        }
        rating={rating}
        feedback={{
          reviewable: mayRate,
          myScore,
          sample: false,
          viewer: { signedIn: true, canComment: mayComment },
          returnPath: returnPathOf(id, search, mode),
        }}
        rateSlot={
          mayRate ? (
            <RatingControl postId={id} initialScore={myScore} />
          ) : isAuthor && post.hidden === false ? (
            <p className="text-sm text-ink-muted">
              {t("Only other members can rate your product.", locale)}
            </p>
          ) : null
        }
        maker={
          <div className="flex items-center gap-3">
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
        }
      >

        {/* The like control and the comment read-out on the left, one type
            scale; Share and, for its maker, Edit on the right — and for
            everyone else Report, the last and quietest item, as on the feed
            card. Share sends the bare /products/<id>, which opens for anyone.
            Report is a DIRECT child of this flex-wrap row on purpose: opening
            it swaps the link for a full-width reason box, which wraps onto its
            own line under the row (components/ReportButton.tsx). */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-5 text-sm">
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
              <span className="tabular-nums">{commentTotal}</span>
              <span className="sr-only">{commentsLabel}</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
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
          {!isAuthor && <ReportButton kind="post" targetId={id} size="sm" />}
        </div>
      </ProductDetail>

      {/* The thread. `#comments` is where a comment notification and My
          products' "See all {n} comments" land; scroll-mt clears the phone's
          sticky top bar (64.8px) when it jumps here. */}
      <section id="comments" className="mt-14 scroll-mt-20">
        <SectionHeading title={commentsLabel} />

        <RealtimeRefresh
          table="forum_comments"
          filter={`post_id=eq.${id}`}
          currentUserId={userId}
          senderColumn="author_id"
          kind="comments"
        />

        {batch.comments.length > 0 || batch.hasEarlier ? (
          <CommentThread
            postId={id}
            initial={batch.comments}
            total={commentTotal}
            hasEarlier={batch.hasEarlier}
            cursor={batch.cursor}
          />
        ) : (
          // No comments yet. The composer renders directly below for anyone
          // who may comment, so the copy names two easy openings instead of
          // repeating a button; an investor gets the statement of fact.
          <EmptyState
            padding="lg"
            dense
            className="mb-6"
            description={
              mayPostFeedback
                ? await tServer(
                    "No comments yet. Ask a question or add what you know.",
                  )
                : await tServer("No comments yet.")
            }
          />
        )}

        {mayPostFeedback && <CommentComposer postId={id} centerText />}
        {mayComment && !mayPostFeedback && (
          <p className="text-sm text-ink-muted">{t(TRY_BEFORE_COMMENTING, locale)}</p>
        )}
      </section>
    </ProductFrame>
  );
}
