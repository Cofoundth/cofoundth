import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Rocket,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isInvestorAccount } from "@/lib/account";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABELS } from "@/lib/matching";
import { t } from "@/lib/i18n";
import { getLocale, tServer } from "@/lib/i18n-server";
import { timeAgo } from "@/lib/time";
import { LikeButton } from "./LikeButton";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

// Same badge vocabulary the feed uses (components/PostCard.tsx) so a post reads
// identically in the feed, on /p/[id], and here.
const KIND_META: Record<
  string,
  { icon: typeof Trophy; en: string; tone: string } | null
> = {
  post: null,
  milestone: { icon: Trophy, en: "hit a milestone", tone: "text-gold" },
  show_and_tell: { icon: Rocket, en: "shipped", tone: "text-navy" },
};

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, title, content, kind, link_url, image_url, tags, created_at",
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  // Investors read the founder community but don't comment in it.
  const canWrite = !!user && !(await isInvestorAccount(supabase, user.id));

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
  const { data: comments } = await supabase
    .from("forum_comments")
    .select("id, author_id, content, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const commentAuthorIds = Array.from(
    new Set((comments ?? []).map((c) => c.author_id as string)),
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

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/community"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> {await tServer("Back to community")}
      </Link>

      <article className="bg-white border border-line p-8 lg:p-12">
        {meta && KindIcon && (
          <div
            className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] mb-4 ${meta.tone}`}
          >
            <KindIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="text-ink-muted">{await tServer(meta.en)}</span>
          </div>
        )}

        {post.title ? (
          <h1 className="text-3xl lg:text-4xl mb-4 leading-tight">
            {post.title as string}
          </h1>
        ) : null}

        {((post.tags as string[] | null) ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {((post.tags ?? []) as string[]).map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-[0.15em] px-2 py-1 border border-gold/40 text-gold-ink"
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
          <div className="mt-4 aspect-[3/2] w-full overflow-hidden border border-line bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url as string}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        ) : null}

        {post.link_url ? (
          <a
            href={post.link_url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-navy hover:text-gold-ink underline underline-offset-4 decoration-gold/30 break-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {(() => {
              try {
                return new URL(post.link_url as string).hostname.replace(
                  /^www\./,
                  "",
                );
              } catch {
                return post.link_url as string;
              }
            })()}
          </a>
        ) : null}

        {/* Same footer vocabulary as the feed card (components/PostCard.tsx):
            borderless icon + count pairs sitting side by side. The row owns the
            type scale so the like control and the comment read-out can never
            drift apart. */}
        <div className="mt-8 pt-6 border-t border-line flex items-center gap-4 text-sm">
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
            <span className="tabular-nums">{comments?.length ?? 0}</span>
            <span className="sr-only">{commentsLabel}</span>
          </span>
        </div>
      </article>

      {/* Comments thread */}
      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-4">
          {commentsLabel}
        </h2>

        <RealtimeRefresh
          table="forum_comments"
          filter={`post_id=eq.${id}`}
          currentUserId={user?.id ?? ""}
          senderColumn="author_id"
          kind="comments"
        />

        {comments?.length ? (
          <div className="bg-white border border-line divide-y divide-line px-6 mb-6">
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
          </div>
        ) : (
          <p className="text-sm text-ink-muted mb-6">
            {await tServer("No comments yet. Be the first.")}
          </p>
        )}

        {canWrite && <CommentComposer postId={post.id as string} />}
      </section>
    </div>
  );
}
