"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ReportButton } from "@/components/ReportButton";
import { useT, useLocale } from "@/lib/i18n-client";
import { timeAgo } from "@/lib/time";
import { deleteCommentAction } from "./actions";

type Props = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  author: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
  } | null;
  /** After the reader's own delete: components/CommentThread.tsx drops an
   *  earlier comment it fetched itself, which no page refresh would. */
  onDeleted?: (id: string) => void;
};

export function CommentItem({
  id,
  postId,
  content,
  createdAt,
  isOwn,
  author,
  onDeleted,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const tr = useT();
  const locale = useLocale();
  const authorName = author?.full_name ?? tr("A founder");

  return (
    <div className="flex gap-3 py-4">
      <Link href={`/profile/${author?.id}`} className="shrink-0">
        <Avatar name={authorName} url={author?.photo_url} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/profile/${author?.id}`}
              className="text-navy font-medium hover:text-gold-ink"
            >
              {authorName}
            </Link>
            <span className="text-ink-muted">{timeAgo(createdAt, locale)}</span>
          </div>
          {isOwn && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteCommentAction(id, postId);
                  onDeleted?.(id);
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
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
        {/* Report, for somebody else's comment — the feed card's comments
            have had it all along; this row is the thread on a post's page and
            on a product's. A row of its own (flex-wrap) so the reason box
            opens under the comment, full width. */}
        {!isOwn && (
          <div className="mt-1 flex flex-wrap items-center">
            <ReportButton kind="comment" targetId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
