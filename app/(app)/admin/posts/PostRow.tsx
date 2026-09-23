"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adminSetPostHidden, adminDeletePost } from "@/lib/admin-actions";
import { Button } from "@/components/ui";

export type AdminPost = {
  id: string;
  content: string;
  authorName: string | null;
  authorSlug: string | null;
  authorId: string;
  hidden: boolean;
  createdAt: string;
};

// See UserRow: px-2 py-1 / 11px is off both scales, so the pixels ride along
// as a className override and cn() merges them over the size.
const DENSE = "px-2 py-1 text-[11px]";

export function PostRow({ post }: { post: AdminPost }) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = (fn: () => Promise<unknown>) => start(() => fn().then(() => {}));

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-muted mb-1 flex items-center gap-2">
            <Link
              href={`/profile/${post.authorSlug ?? post.authorId}`}
              className="text-navy hover:text-gold-ink font-medium"
            >
              {post.authorName ?? "—"}
            </Link>
            {post.hidden && (
              <span className="text-xs uppercase tracking-[0.12em] border border-danger-line text-danger-ink px-1 py-0.5 rounded-full">
                Hidden
              </span>
            )}
          </div>
          <Link href={`/community/${post.id}`} className="block">
            <p className="text-sm text-ink leading-relaxed line-clamp-3 whitespace-pre-wrap hover:text-navy">
              {post.content}
            </p>
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
          <Button
            variant="secondary"
            size="xs"
            className={DENSE}
            disabled={pending}
            onClick={() => run(() => adminSetPostHidden(post.id, !post.hidden))}
          >
            {post.hidden ? "Unhide" : "Hide"}
          </Button>
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                size="xs"
                className={DENSE}
                disabled={pending}
                onClick={() => run(() => adminDeletePost(post.id))}
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className={DENSE}
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="danger-outline"
              size="xs"
              className={DENSE}
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
