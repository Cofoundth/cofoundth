import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABELS } from "@/lib/matching";
import { LikeButton } from "./LikeButton";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, author_id, title, content, tags, created_at")
    .eq("id", id)
    .single();

  if (!post) notFound();

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

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/community"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to community
      </Link>

      <article className="bg-white border border-line p-8 lg:p-12">
        <h1 className="text-3xl lg:text-4xl mb-4 leading-tight">
          {post.title as string}
        </h1>

        {((post.tags as string[] | null) ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {((post.tags ?? []) as string[]).map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-[0.15em] px-2 py-1 border border-gold/40 text-gold"
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
              className="font-serif text-lg text-navy hover:text-gold transition-colors"
            >
              {(author?.full_name as string) ?? "A founder"}
            </Link>
            <div className="text-xs text-ink-muted">
              {author?.i_am && ROLE_LABELS[author.i_am as string]}
              {" · "}
              {new Date(post.created_at as string).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          {(post.content as string).split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-ink leading-relaxed mb-4 whitespace-pre-wrap"
            >
              {para}
            </p>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-line flex items-center gap-3">
          <LikeButton
            postId={post.id as string}
            initialCount={likeCount ?? 0}
            initialLiked={!!myLike}
          />
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-line text-ink-muted">
            <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-medium tabular-nums">
              {comments?.length ?? 0}
            </span>
          </div>
        </div>
      </article>

      {/* Comments thread */}
      <section className="mt-10">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
          Comments
        </div>

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
            No comments yet. Be the first.
          </p>
        )}

        <CommentComposer postId={post.id as string} />
      </section>
    </div>
  );
}
