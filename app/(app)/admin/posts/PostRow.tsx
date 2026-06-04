"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adminSetPostHidden, adminDeletePost } from "@/lib/admin-actions";

export type AdminPost = {
  id: string;
  content: string;
  authorName: string | null;
  authorSlug: string | null;
  authorId: string;
  hidden: boolean;
  createdAt: string;
};

const btn =
  "px-2 py-1 text-[11px] border border-line text-ink hover:border-navy disabled:opacity-50 transition-colors";

export function PostRow({ post }: { post: AdminPost }) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = (fn: () => Promise<unknown>) => start(() => fn().then(() => {}));

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-muted mb-1 flex items-center gap-2">
            <Link
              href={`/profile/${post.authorSlug ?? post.authorId}`}
              className="text-navy hover:text-gold font-medium"
            >
              {post.authorName ?? "—"}
            </Link>
            {post.hidden && (
              <span className="text-[9px] uppercase tracking-[0.12em] border border-red-300 text-red-700 px-1 py-0.5">
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
          <button
            disabled={pending}
            onClick={() => run(() => adminSetPostHidden(post.id, !post.hidden))}
            className={btn}
          >
            {post.hidden ? "Unhide" : "Hide"}
          </button>
          {confirmDelete ? (
            <>
              <button
                disabled={pending}
                onClick={() => run(() => adminDeletePost(post.id))}
                className="px-2 py-1 text-[11px] bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
                className={btn}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
              className="px-2 py-1 text-[11px] border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
