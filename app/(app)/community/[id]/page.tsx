// One post's thread, for a signed-in member: /p/<id> sends members here.
//
// A `show_and_tell` is a PRODUCT, and this is the product's full page for a
// member: where a deck card's rating-and-comments row lands (through /p/<id>'s
// redirect), and the other place besides the deck's review modal where a
// member rates it (CLAUDE.md, Language Rules: the card itself opens the
// product in a new tab, and the modal asks for a rating when they come back).
// It renders through ../../../(marketing)/products/ProductDetail.tsx, the same
// top as the public /p/<id>: the way back to the deck, the gallery, the
// description, "Try it", the rating — here with the member's own stars — and
// then the whole thread and the composer. The deck context
// (`?from=…&category=…`) arrives through /p/<id>'s redirect and only ever
// feeds deckReturnHref(), which re-parses it. Every other kind keeps the
// thread layout below.
//
// ── EVERY HREF FROM `link_url` GOES THROUGH webUrl() ──────────────────────
// `link_url` is member-submitted and older than the write-side `^https?://`
// check (createPostAction, createProductAction). It used to be rendered
// straight into an href here, so a row holding `javascript:…` was a one-click
// script injection on a member's session. Now a row whose link does not parse
// as http/https renders NO link.
//
// ── A HIDDEN OR MODERATED POST IS A 404 HERE TOO ───────────────────────────
// This page reads through the member's own client, and forum_posts' member
// SELECT policy is `using (true)`, so RLS restricts nothing: before this gate a
// post an admin had hidden, or one by a suspended member or a seeded bot, was
// fully readable at its id — and a signed-in member opening /p/<id> (which IS
// gated) is redirected straight here, so the public gate was one redirect deep.
// Now such a post 404s for everyone except its author and an admin, the two
// readers with a reason to see it. The author's flags are read through the
// service role, so a column grant can never make the gate fail open, and a
// failed read is a 404 rather than a pass. In DEVELOPMENT ONLY a product by one
// of the suspended test accounts still renders (lib/test-accounts.ts).
//
// ── `?added=1` ────────────────────────────────────────────────────────────
// createProductAction lands the maker here after adding a product from
// /products/new. Shown to the AUTHOR only: a short confirmation that it is on
// the shelf (and was not announced), with the way to the deck.

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Rocket,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getAccountRole } from "@/lib/account";
import { canComment, canRate } from "@/lib/roles";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import { getMyProductRating, getProductRating } from "@/lib/product-ratings";
import { publicProductAuthors } from "@/lib/posts";
import { devTestAuthorIds } from "@/lib/test-accounts";
import { webUrl } from "@/lib/web-url";
import { Avatar } from "@/components/Avatar";
import {
  Card,
  EmptyState,
  LinkButton,
  Section,
  SectionHeading,
} from "@/components/ui";
import { ROLE_LABELS } from "@/lib/matching";
import { t } from "@/lib/i18n";
import { getLocale, tServer } from "@/lib/i18n-server";
import { timeAgo } from "@/lib/time";
import { deckReturnHref } from "@/app/(marketing)/products/deck-position";
import { ProductDetail } from "@/app/(marketing)/products/ProductDetail";
import { LikeButton } from "./LikeButton";
import { RatingControl } from "./RatingControl";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string | string[];
    category?: string | string[];
    added?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

// Same badge vocabulary the feed uses (components/PostCard.tsx) so a post reads
// identically in the feed, on /p/[id], and here.
const KIND_META: Record<
  string,
  { icon: typeof Trophy; en: string; tone: string } | null
> = {
  post: null,
  milestone: { icon: Trophy, en: "hit a milestone", tone: "text-gold-ink" },
  show_and_tell: { icon: Rocket, en: "shipped", tone: "text-navy" },
};

export default async function PostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `image_urls` for a product's gallery (every screenshot, through
  // postImages() inside ProductDetail); the thread layout below still shows
  // only the legacy cover, as it always has.
  const { data: post } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, title, content, kind, link_url, image_url, image_urls, tags, created_at, hidden",
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  const isProduct = post.kind === "show_and_tell";
  const isAuthor = !!user && post.author_id === user.id;

  // THE MODERATION GATE — see "A HIDDEN OR MODERATED POST" in the header. The
  // author's two flags through the service role; a failed or empty read counts
  // as moderated, so it can only fail closed.
  if (!isAuthor) {
    const { data: flags, error: flagsError } = await createAdminClient()
      .from("profiles")
      .select("suspended, is_bot")
      .eq("id", post.author_id as string)
      .maybeSingle();
    const authorModerated =
      !!flagsError ||
      !flags ||
      flags.suspended === true ||
      flags.is_bot === true;
    if (post.hidden !== false || authorModerated) {
      // DEVELOPMENT ONLY: a non-hidden PRODUCT by a test account. The empty
      // Set in a production build, before it reads, so this is false there.
      const devTestProduct =
        isProduct &&
        post.hidden === false &&
        (await devTestAuthorIds([post.author_id as string])).has(
          post.author_id as string,
        );
      if (!devTestProduct && !(await isAdminUser(supabase, user))) notFound();
    }
  }

  // A blocked pair can't read each other's threads. The feed already drops
  // these posts; this closes the direct-link path, and 404 (not a message) is
  // the right answer — it says nothing about who blocked whom.
  if (user && (await isBlockedEitherWay(user.id, post.author_id as string))) {
    notFound();
  }
  // Comments from blocked members are dropped the same way the feed drops
  // their posts. Post-filter, not a query clause: the reverse direction of a
  // block is RLS-invisible to this client.
  const blocked = user ? await getBlockedIds(user.id) : new Set<string>();

  // Commenting — founders AND explorers. This page is the one surface where
  // an explorer writes, so the flag here is canComment and nothing else:
  // /community (the feed) separately computes a canPostThread for its
  // composer, and the two must NOT be collapsed back into one "canWrite".
  const role = user ? await getAccountRole(supabase, user.id) : null;
  const mayComment = role !== null && canComment(role);

  // RATINGS — products only (CLAUDE.md, "Founder decision (2026-11-10)"). The
  // public average + count shows to every reader of a product; the five stars
  // render only where setProductRatingAction would accept them: a role that
  // canRate (every role today), not the author, and not a hidden post. The
  // action and 0079's RLS re-check all of it; this only avoids drawing a
  // control that would be refused.
  //
  // Both reads degrade to "unrated" on failure (lib/product-ratings.ts), so a
  // missing table or a bad read never takes the thread down.
  const mayRate =
    isProduct &&
    !!user &&
    role !== null &&
    canRate(role) &&
    post.author_id !== user.id &&
    post.hidden === false;
  const [rating, myScore] = isProduct
    ? await Promise.all([
        getProductRating(id),
        mayRate && user
          ? getMyProductRating(supabase, id, user.id)
          : Promise.resolve(null),
      ])
    : [null, null];

  const { data: author } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, i_am")
    .eq("id", post.author_id as string)
    .single();

  // Likes — count + whether the current viewer liked.
  const [{ count: likeCount }, { data: myLike }] = await Promise.all([
    supabase
      .from("forum_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", id),
    user
      ? supabase
          .from("forum_likes")
          .select("post_id")
          .eq("post_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Comments + authors
  const { data: commentRows } = await supabase
    .from("forum_comments")
    .select("id, author_id, content, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true });
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

  const meta = KIND_META[(post.kind as string) ?? "post"];
  const KindIcon = meta?.icon;
  const commentsLabel = await tServer("Comments");
  // The ONE parse before an href: see the header. null renders no link.
  const link = webUrl(post.link_url as string | null);

  // The thread: the same on a product and on any other post.
  const thread = (
    <section className="mt-14">
      <SectionHeading title={commentsLabel} />

      <RealtimeRefresh
        table="forum_comments"
        filter={`post_id=eq.${id}`}
        currentUserId={user?.id ?? ""}
        senderColumn="author_id"
        kind="comments"
      />

      {comments.length ? (
        <Card padding="none" className="divide-y divide-line px-6 mb-6 overflow-hidden">
          {comments.map((c) => {
            const a = authorMap.get(c.author_id as string);
            return (
              <CommentItem
                key={c.id as string}
                id={c.id as string}
                postId={post.id as string}
                content={c.content as string}
                createdAt={c.created_at as string}
                isOwn={user?.id === c.author_id}
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
        // KIND A — no replies yet. The composer renders directly below for
        // anyone who may comment (founders and explorers), so the copy names
        // two easy openings instead of repeating a button. Investors can read
        // this thread but not comment, so they get the statement of fact.
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

      {mayComment && <CommentComposer postId={post.id as string} />}
    </section>
  );

  // The like control and the comment read-out, one row, one type scale.
  const engagement = (
    <>
      <LikeButton
        postId={post.id as string}
        initialCount={likeCount ?? 0}
        initialLiked={!!myLike}
      />
      {/* Plain read-out, not a control — the composer below is how you comment. */}
      <span className="inline-flex items-center gap-2 text-ink-muted">
        <MessageCircle
          className="w-4 h-4"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="tabular-nums">{comments.length}</span>
        <span className="sr-only">{commentsLabel}</span>
      </span>
    </>
  );

  if (isProduct) {
    const authorName =
      (author?.full_name as string | null) ?? t("A founder", locale);
    const search = await searchParams;

    // `?added=1`, for the maker only (see the header). Whether it is really on
    // the shelf is ASKED, not assumed: the shelf's own author gate
    // (publicProductAuthors), plus the development-only test-account
    // allowance, decides that — so a maker whose account the shelf cannot show
    // is told it is saved, never that it is on the deck.
    const authorId = post.author_id as string;
    const added = isAuthor && search.added === "1";
    const onShelf =
      added &&
      !!link &&
      (!!(await publicProductAuthors([authorId]))?.has(authorId) ||
        (await devTestAuthorIds([authorId])).has(authorId));

    // In ProductDetail's own column (its `notice` slot), so it lines up with
    // the card at every width. "See it on the deck" is plain /products: the
    // deck is newest first and a fresh visit starts at card 1, which is this
    // product.
    const notice = added ? (
      <Card padding="sm" role="status" className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-navy"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {onShelf
              ? await tServer("Your product is on the shelf.")
              : await tServer("Your product is saved.")}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {await tServer(
              "Nothing was posted to the community feed. If you want to announce it, write a post.",
            )}
          </p>
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
            tags: (post.tags as string[] | null) ?? null,
          }}
          locale={locale}
          backHref={deckReturnHref(search, post.id as string, true)}
          rating={rating}
          rateSlot={
            mayRate ? (
              <RatingControl
                postId={post.id as string}
                initialScore={myScore}
              />
            ) : null
          }
        >
          {/* Who made it, below the product: the product is what the reader
              came to see. */}
          <div className="mt-6 flex items-center gap-3">
            <Link href={`/profile/${author?.id}`}>
              <Avatar
                name={author?.full_name as string}
                url={author?.photo_url as string | null}
                size="sm"
              />
            </Link>
            <p className="min-w-0 text-sm text-ink-muted">
              <Link
                href={`/profile/${author?.id}`}
                className="font-medium text-navy transition-colors hover:text-gold-ink"
              >
                {authorName}
              </Link>
              {" · "}
              {await tServer("shipped")}
              {" · "}
              {timeAgo(post.created_at as string, locale)}
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-line flex items-center gap-4 text-sm">
            {engagement}
          </div>
        </ProductDetail>

        <div className="mx-auto max-w-[640px]">{thread}</div>
      </Section>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-[88px]">
      <Link
        href="/community"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> {await tServer("Back to community")}
      </Link>

      <Card as="article" padding="lg" className="lg:p-12">
        {meta && KindIcon && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] mb-4 ${meta.tone}`}
          >
            <KindIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="text-ink-muted">{await tServer(meta.en)}</span>
          </div>
        )}

        {post.title ? (
          <h1 className="text-d2 mb-2">
            {post.title as string}
          </h1>
        ) : null}

        {((post.tags as string[] | null) ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {((post.tags ?? []) as string[]).map((tag) => (
              <span
                key={tag}
                className="text-xs uppercase tracking-[0.15em] px-2 py-1 border border-line text-gold-ink rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-line">
          <Link href={`/profile/${author?.id}`}>
            <Avatar
              name={author?.full_name as string}
              url={author?.photo_url as string | null}
              size="md"
            />
          </Link>
          <div>
            <Link
              href={`/profile/${author?.id}`}
              className="font-serif text-lg text-navy hover:text-gold-ink transition-colors"
            >
              {(author?.full_name as string) ?? t("A founder", locale)}
            </Link>
            <div className="text-xs text-ink-muted">
              {[
                ((author?.i_am as string[] | null) ?? [])
                  .map((r) => t(ROLE_LABELS[r] ?? r, locale))
                  .join(" · "),
                timeAgo(post.created_at as string, locale),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>

        <div>
          {(post.content as string).split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-ink leading-relaxed mb-4 whitespace-pre-wrap"
            >
              {para}
            </p>
          ))}
        </div>

        {post.image_url ? (
          // Fixed ratio reserves the space so the page doesn't shift on load;
          // object-contain keeps the whole image visible on its own page.
          <div className="mt-4 aspect-[3/2] w-full overflow-hidden border border-line bg-cream rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url as string}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        ) : null}

        {link ? (
          <a
            href={link.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-navy hover:text-gold-ink underline underline-offset-4 decoration-line break-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {link.hostname.replace(/^www\./, "")}
          </a>
        ) : null}

        {/* Same footer vocabulary as the feed card (components/PostCard.tsx):
            borderless icon + count pairs sitting side by side. The row owns the
            type scale so the like control and the comment read-out can never
            drift apart. */}
        <div className="mt-8 pt-6 border-t border-line flex items-center gap-4 text-sm">
          {engagement}
        </div>
      </Card>

      {thread}
    </div>
  );
}
