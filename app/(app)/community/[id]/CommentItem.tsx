"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
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
};

export function CommentItem({
  id,
  postId,
  content,
  createdAt,
  isOwn,
  author,
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
                })
              }
              className="text-ink-muted hover:text-red-700 disabled:opacity-60"
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
      </div>
    </div>
  );
}
