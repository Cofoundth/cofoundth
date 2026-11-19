// One community post's thread, for a signed-in member: /p/<id> sends members
// here.
//
// ── A PRODUCT IS NOT SERVED HERE ──────────────────────────────────────────
// A product is stored as a forum_posts row too (kind 'show_and_tell'), and
// this used to be the product's member page. A product has its own page now,
// /products/<id> (app/(marketing)/products/[id]), for every reader, so this
// page sends one there — deck context kept — and every old /community/<id>
// product link (a notification, a bookmark) still lands.
//
// ── EVERY HREF FROM `link_url` GOES THROUGH webUrl() ──────────────────────
// `link_url` is member-submitted and older than the write-side `^https?://`
// check (createPostAction). It used to be rendered straight into an href
// here, so a row holding `javascript:…` was a one-click script injection on a
// member's session. Now a row whose link does not parse as http/https renders
// NO link.
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
// failed read is a 404 rather than a pass.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Rocket,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getAccountRole } from "@/lib/account";
import { canComment } from "@/lib/roles";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import { productPath } from "@/lib/post-types";
import { PRODUCT_KIND } from "@/lib/public-post";
import { webUrl } from "@/lib/web-url";
import { Avatar } from "@/components/Avatar";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/matching";
import { t } from "@/lib/i18n";
import { getLocale, tServer } from "@/lib/i18n-server";
import { timeAgo } from "@/lib/time";
import { deckContextQuery } from "@/app/(marketing)/products/deck-position";
import { LikeButton } from "./LikeButton";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "@/components/CommentThread";
import { countComments, readCommentBatch } from "@/lib/comment-thread";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { ReportButton } from "@/components/ReportButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string | string[];
    category?: string | string[];
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

  const { data: post } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, title, content, kind, link_url, image_url, tags, created_at, hidden",
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  // A product has its own page — see the header. Its gate is that page's.
  if (post.kind === PRODUCT_KIND) {
    redirect(`${productPath(id)}${deckContextQuery(await searchParams)}`);
  }

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
      if (!(await isAdminUser(supabase, user))) notFound();
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

  // The thread's newest batch and how many there are in all
  // (lib/comment-thread.ts): never the whole thread at once.
  const [batch, commentTotal] = await Promise.all([
    readCommentBatch(supabase, {
      postId: id,
      viewerId: user?.id ?? null,
      blocked,
    }).catch(() => ({ comments: [], hasEarlier: false, cursor: null })),
    countComments(supabase, id, blocked),
  ]);

  const meta = KIND_META[(post.kind as string) ?? "post"];
  const KindIcon = meta?.icon;
  const commentsLabel = await tServer("Comments");
  // The ONE parse before an href: see the header. null renders no link.
  const link = webUrl(post.link_url as string | null);

  // The thread. scroll-mt clears the phone's sticky top bar (64.8px) when a
  // link jumps to `#comments`.
  const thread = (
    <section id="comments" className="mt-14 scroll-mt-20">
      <SectionHeading title={commentsLabel} />

      <RealtimeRefresh
        table="forum_comments"
        filter={`post_id=eq.${id}`}
        currentUserId={user?.id ?? ""}
        senderColumn="author_id"
        kind="comments"
      />

      {batch.comments.length > 0 || batch.hasEarlier ? (
        <CommentThread
          postId={post.id as string}
          initial={batch.comments}
          total={commentTotal}
          hasEarlier={batch.hasEarlier}
          cursor={batch.cursor}
        />
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
        <span className="tabular-nums">{commentTotal}</span>
        <span className="sr-only">{commentsLabel}</span>
      </span>
    </>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-14">
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
        <div className="mt-8 pt-6 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
          {engagement}
          {/* Report, for somebody else's post — as on its feed card, the last
              and quietest item. A direct child of this flex-wrap row, so the
              reason box opens on its own line (components/ReportButton.tsx). */}
          {user && user.id !== post.author_id && (
            <ReportButton
              kind="post"
              targetId={post.id as string}
              className="ml-auto"
              size="sm"
            />
          )}
        </div>
      </Card>

      {thread}
    </div>
  );
}
