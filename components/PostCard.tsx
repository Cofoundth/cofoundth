"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Rocket,
  Send,
  Trash2,
  Trophy,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import { useT } from "@/lib/i18n-client";
import { t, type Locale } from "@/lib/i18n";
import type { PostComment, PostItem, PostKind } from "@/lib/post-types";
import {
  createPostCommentAction,
  deletePostAction,
  deletePostCommentAction,
  fetchPostCommentsAction,
  togglePostLikeAction,
} from "@/lib/post-actions";

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
  });
}

const KIND_META: Record<
  PostKind,
  { icon: typeof Trophy; en: string; tone: string; bg: string } | null
> = {
  post: null,
  milestone: {
    icon: Trophy,
    en: "hit a milestone",
    tone: "text-gold",
    bg: "bg-gold/5",
  },
  show_and_tell: {
    icon: Rocket,
    en: "shipped",
    tone: "text-navy",
    bg: "bg-cream",
  },
};

export function PostCard({
  post,
  locale,
}: {
  post: PostItem;
  locale: Locale;
}) {
  const tr = useT();
  const [optimistic, setOptimistic] = useOptimistic(
    { count: post.likeCount, liked: post.myLike },
    (s) => ({ count: s.liked ? s.count - 1 : s.count + 1, liked: !s.liked }),
  );
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [draft, setDraft] = useState("");
  const [submitting, startSubmit] = useTransition();

  const meta = KIND_META[post.kind];
  const KindIcon = meta?.icon;
  const authorHref = post.author
    ? `/profile/${post.author.slug ?? post.author.id}`
    : "#";
  const fresh = Date.now() - new Date(post.created_at).getTime() < 3 * 3600_000;

  async function loadComments() {
    setLoading(true);
    const c = await fetchPostCommentsAction(post.id);
    setComments(c);
    setCommentCount(c.length);
    setLoading(false);
  }

  function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) void loadComments();
  }

  function doSubmitComment() {
    const text = draft.trim();
    if (!text || submitting) return;
    startSubmit(async () => {
      const fd = new FormData();
      fd.set("content", text);
      const res = await createPostCommentAction(post.id, null, fd);
      if (!res?.error) {
        setDraft("");
        await loadComments();
      }
    });
  }
  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    doSubmitComment();
  }

  function removeComment(id: string) {
    startSubmit(async () => {
      await deletePostCommentAction(id, post.id);
      setComments((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
      setCommentCount((n) => Math.max(0, n - 1));
    });
  }

  return (
    <article className={`bg-white border border-line ${meta?.bg ?? ""}`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Link href={authorHref} className="shrink-0">
            <Avatar
              name={post.author?.full_name}
              url={post.author?.photo_url}
              size="sm"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs flex items-center gap-2 flex-wrap min-w-0">
                <Link
                  href={authorHref}
                  className="text-navy font-medium hover:text-gold truncate"
                >
                  {post.author?.full_name ?? tr("A founder")}
                </Link>
                {meta && KindIcon && (
                  <span
                    className={`inline-flex items-center gap-1 ${meta.tone}`}
                  >
                    <KindIcon className="w-3 h-3" strokeWidth={1.5} />
                    <span className="text-ink-muted">{tr(meta.en)}</span>
                  </span>
                )}
                <span className="text-ink-muted">·</span>
                <span className="text-ink-muted">
                  {timeAgo(post.created_at, locale)}
                </span>
                {fresh && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                )}
              </div>
              {post.isOwn && (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await deletePostAction(post.id);
                    })
                  }
                  className="text-ink-muted hover:text-red-700 shrink-0"
                  aria-label={tr("Delete")}
                  title={tr("Delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {post.title && (
              <Link href={`/community/${post.id}`} className="block group mt-1">
                <h3 className="font-serif text-lg text-navy leading-tight group-hover:text-gold transition-colors">
                  {post.title}
                </h3>
              </Link>
            )}

            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-1">
              {post.content}
            </p>

            {post.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.image_url}
                alt=""
                loading="lazy"
                className="mt-3 max-h-[28rem] w-auto border border-line"
              />
            )}

            {post.link_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-navy hover:text-gold underline underline-offset-4 decoration-gold/30 break-all"
              >
                <ExternalLink className="w-3 h-3" />
                {(() => {
                  try {
                    return new URL(post.link_url).hostname.replace(
                      /^www\./,
                      "",
                    );
                  } catch {
                    return post.link_url;
                  }
                })()}
              </a>
            )}

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 border border-line text-ink-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: like + comment */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    setOptimistic(null);
                    await togglePostLikeAction(post.id);
                  })
                }
                className={`inline-flex items-center gap-1 transition-colors ${
                  optimistic.liked ? "text-gold" : "text-ink-muted hover:text-navy"
                }`}
                aria-pressed={optimistic.liked}
                aria-label={optimistic.liked ? tr("Unlike") : tr("Like")}
              >
                <Heart
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  fill={optimistic.liked ? "currentColor" : "none"}
                />
                <span className="tabular-nums">{optimistic.count}</span>
              </button>
              <button
                type="button"
                onClick={toggleComments}
                className={`inline-flex items-center gap-1 transition-colors ${
                  open ? "text-navy" : "text-ink-muted hover:text-navy"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="tabular-nums">{commentCount}</span>
              </button>
              <ShareButton
                path={`/p/${post.id}`}
                className="inline-flex items-center gap-1 text-ink-muted hover:text-navy transition-colors ml-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inline comments */}
      {open && (
        <div className="border-t border-line bg-cream/40 px-5 py-4">
          <form onSubmit={submitComment} className="flex items-start gap-2 mb-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              maxLength={2000}
              placeholder={tr("Write a comment…")}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  doSubmitComment();
                }
              }}
              className="flex-1 px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
            />
            <button
              type="submit"
              disabled={submitting || draft.trim().length === 0}
              className="inline-flex items-center gap-1 px-3 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {loading && comments === null ? (
            <p className="text-xs text-ink-muted">{tr("Loading…")}</p>
          ) : comments && comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((c) => {
                const cHref = c.author
                  ? `/profile/${c.author.slug ?? c.author.id}`
                  : "#";
                return (
                  <li key={c.id} className="flex items-start gap-2.5">
                    <Link href={cHref} className="shrink-0 mt-0.5">
                      <Avatar
                        name={c.author?.full_name}
                        url={c.author?.photo_url}
                        size="sm"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-ink-muted">
                          <Link
                            href={cHref}
                            className="text-navy font-medium hover:text-gold"
                          >
                            {c.author?.full_name ?? tr("A founder")}
                          </Link>
                          {" · "}
                          {timeAgo(c.created_at, locale)}
                        </div>
                        {c.isOwn && (
                          <button
                            type="button"
                            onClick={() => removeComment(c.id)}
                            className="text-ink-muted hover:text-red-700 shrink-0"
                            aria-label={tr("Delete")}
                            title={tr("Delete")}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-0.5">
                        {c.content}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">{tr("No comments yet.")}</p>
          )}
        </div>
      )}
    </article>
  );
}
