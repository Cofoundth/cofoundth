"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
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

  return (
    <div className="flex gap-3 py-4">
      <Link href={`/profile/${author?.id}`} className="shrink-0">
        <Avatar
          name={author?.full_name ?? "Founder"}
          url={author?.photo_url}
          size="sm"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/profile/${author?.id}`}
              className="text-navy font-medium hover:text-gold"
            >
              {author?.full_name ?? "A founder"}
            </Link>
            <span className="text-ink-muted">
              {new Date(createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
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
              aria-label="Delete comment"
              title="Delete"
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
