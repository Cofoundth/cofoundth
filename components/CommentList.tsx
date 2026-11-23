"use client";

import type { ReactNode } from "react";
import { CommentItem } from "@/app/(app)/community/[id]/CommentItem";
import type { ThreadComment } from "@/lib/comment-thread";
import { useT } from "@/lib/i18n-client";

/** Keep the context for replies in the visible window when it has been loaded. */
export function withCommentParents(all: ThreadComment[], visible: ThreadComment[]) {
  if (all === visible || visible.length === all.length) return visible;
  const byId = new Map(all.map((comment) => [comment.id, comment]));
  const visibleIds = new Set(visible.map(({ id }) => id));
  for (const comment of visible) {
    let parentId = comment.parentId;
    while (parentId && !visibleIds.has(parentId)) {
      const parent = byId.get(parentId);
      if (!parent) break;
      visibleIds.add(parentId);
      parentId = parent.parentId;
    }
  }
  return all.filter(({ id }) => visibleIds.has(id));
}

export function CommentList({
  postId,
  comments,
  compact,
  canReply,
  mentions,
  onDeleted,
  onReplyPosted,
}: {
  postId: string;
  comments: ThreadComment[];
  compact?: boolean;
  canReply?: boolean;
  mentions?: Record<string, string>;
  onDeleted: (id: string) => void;
  onReplyPosted?: () => void;
}) {
  const tr = useT();
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const children = new Map<string, ThreadComment[]>();
  const roots: ThreadComment[] = [];
  for (const comment of comments) {
    const parentId = comment.parentId;
    if (parentId && byId.has(parentId)) {
      const replies = children.get(parentId) ?? [];
      replies.push(comment);
      children.set(parentId, replies);
    } else {
      roots.push(comment);
    }
  }

  function render(comment: ThreadComment, depth: number): ReactNode {
    const parent = comment.parentId ? byId.get(comment.parentId) : undefined;
    const replies = children.get(comment.id);
    const replyContext = depth > 1 && parent?.author?.full_name
      ? tr("In reply to {name}").replace("{name}", () => parent.author?.full_name ?? "")
      : comment.parentId && !parent ? tr("Reply to an earlier comment") : undefined;
    return (
      <li key={comment.id}>
        <CommentItem
          postId={postId}
          comment={comment}
          compact={compact}
          canReply={canReply}
          replyContext={replyContext}
          mentions={mentions}
          onDeleted={onDeleted}
          onReplyPosted={onReplyPosted}
        />
        {replies && (
          <ul className={depth === 0 ? "ms-4 border-s border-line ps-3 sm:ms-9" : undefined}>
            {replies.map((reply) => render(reply, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <ul className={compact ? "space-y-2" : "divide-y divide-line"}>
      {roots.map((comment) => render(comment, 0))}
    </ul>
  );
}
