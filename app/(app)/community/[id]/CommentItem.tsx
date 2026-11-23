"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CommentText } from "@/components/CommentText";
import { ReportButton } from "@/components/ReportButton";
import { Button } from "@/components/ui";
import type { ThreadComment } from "@/lib/comment-thread";
import { useT, useLocale } from "@/lib/i18n-client";
import { deletePostCommentAction } from "@/lib/post-actions";
import { timeAgo } from "@/lib/time";
import { CommentComposer } from "./CommentComposer";

type Props = {
  postId: string;
  comment: ThreadComment;
  compact?: boolean;
  canReply?: boolean;
  replyContext?: string;
  mentions?: Record<string, string>;
  onReplyPosted?: () => void;
  /** After the reader's own delete: components/CommentThread.tsx drops an
   *  earlier comment it fetched itself, which no page refresh would. */
  onDeleted?: (id: string) => void;
};

export function CommentItem({
  postId,
  comment,
  compact,
  canReply,
  replyContext,
  mentions,
  onReplyPosted,
  onDeleted,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [replying, setReplying] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const replyButton = useRef<HTMLButtonElement>(null);
  const tr = useT();
  const locale = useLocale();
  const { id, content, createdAt, author, isOwn } = comment;
  const authorName = author?.full_name ?? tr("A founder");
  const authorHref = author ? `/profile/${author.slug ?? author.id}` : null;
  const avatar = <Avatar name={authorName} url={author?.photo_url} size="sm" />;

  function closeReply() {
    setReplying(false);
    replyButton.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`flex gap-2.5 ${compact ? "py-1" : "py-4"}`}>
      {authorHref
        ? <Link href={authorHref} className="shrink-0" tabIndex={-1}>{avatar}</Link>
        : <div className="shrink-0">{avatar}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {authorHref ? (
              <Link href={authorHref} className="break-words text-navy font-medium hover:text-gold-ink">
                {authorName}
              </Link>
            ) : <span>{authorName}</span>}
            <span className="text-ink-muted">{timeAgo(createdAt, locale)}</span>
          </div>
          {isOwn && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setDeleteError(null);
                  const result = await deletePostCommentAction(id, postId).catch(
                    () => ({ error: "Something went wrong. Try again." }),
                  );
                  if (result?.error) setDeleteError(result.error);
                  else onDeleted?.(id);
                })
              }
              className="text-ink-muted hover:text-danger-ink disabled:opacity-60"
              aria-label={tr("Delete")}
              title={tr("Delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {deleteError && <p role="alert" className="text-xs text-danger-ink">{tr(deleteError)}</p>}
        {replyContext && <p className="mb-1 text-xs text-ink-muted">{replyContext}</p>}
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap wrap-anywhere">
          {mentions ? <CommentText text={content} mentions={mentions} /> : content}
        </p>
        {/* Report, for somebody else's comment — the feed card's comments
            have had it all along; this row is the thread on a post's page and
            on a product's. A row of its own (flex-wrap) so the reason box
            opens under the comment, full width. */}
        {(canReply || !isOwn) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {canReply && (
              <Button
                ref={replyButton}
                variant="ghost"
                size="sm"
                className="-ms-2 min-h-9 px-2 text-xs text-ink-muted"
                aria-label={tr("Reply to {name}").replace("{name}", () => authorName)}
                aria-expanded={replying}
                onClick={() => setReplying(true)}
              >
                {tr("Reply")}
              </Button>
            )}
            {!isOwn && <ReportButton kind="comment" targetId={id} />}
          </div>
        )}
        {canReply && replying && (
          <div className="mt-2 mb-2">
            <CommentComposer
              postId={postId}
              reply={{
                id,
                name: authorName,
                onCancel: closeReply,
                onPosted: () => {
                  closeReply();
                  onReplyPosted?.();
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
