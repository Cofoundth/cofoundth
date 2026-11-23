"use client";

// A post's comments, as a thread that stays short (lib/comment-thread.ts has
// the why). The page hands over the NEWEST batch (up to COMMENT_BATCH), how
// many comments there are in all, and the cursor to read on from; this shows
// them oldest first, newest last, right above the comment box, where people
// reply.
//
//   up to COLLAPSE_OVER loaded   all of them, no button
//   more than that               the newest SHOW_NEWEST, and above them
//                                "Show earlier comments (n)"
//   pressed                      every loaded comment; pressed again while
//                                the server has more, the next batch
//
// NEVER page numbers (the founder's call, 2026-11-19): a conversation is read
// as one scroll, and a second page of comments is where reading stops.
//
// ── NEW COMMENTS WHILE IT IS OPEN ──────────────────────────────────────────
// RealtimeRefresh (and any revalidating action) re-renders the page, which
// hands over a fresh newest batch. Batches fetched here are kept across that.
// When the newest batch moves on a little, a comment that slides out of it is
// kept too (it is older than the new batch's oldest, and the reader already
// had it), so nothing vanishes from the middle of a thread being read; a
// comment missing from INSIDE the new batch's range was deleted, and goes.
// When it moves on by a whole batch or more, nothing held is contiguous with
// it any more, so the thread starts again from the new batch, collapsed,
// rather than leave a hole the button could never fill.
//
// The reader's own deletes are remembered here (`gone`): the action resolves
// before the page's fresh batch arrives, and a deleted comment that was the
// oldest of the old batch would otherwise come back as "slid".
//
// Paging reads on from the SERVER's cursor (the oldest raw row it read, which
// may be a comment this reader cannot see), never from the oldest comment
// shown: past a run of a blocked account's comments, those two differ.

import { useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { Card } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import type { CommentCursor, ThreadComment } from "@/lib/comment-thread";
import { loadEarlierCommentsAction } from "@/app/(app)/community/[id]/actions";
import { CommentList, withCommentParents } from "./CommentList";

/** A thread longer than this is shown from its newest SHOW_NEWEST. */
const COLLAPSE_OVER = 15;
const SHOW_NEWEST = 10;

/** (createdAt, id) order: the order the reader reads in. Parsed, not compared
 *  as text: the database trims a timestamp's trailing zeros. */
function before(a: ThreadComment, b: ThreadComment): boolean {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  return ta < tb || (ta === tb && a.id < b.id);
}

function byTime(list: ThreadComment[]): ThreadComment[] {
  return [...list].sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));
}

/** `list` plus whichever of `more` it does not hold yet. */
function merge(list: ThreadComment[], more: ThreadComment[]): ThreadComment[] {
  const ids = new Set(list.map((c) => c.id));
  return byTime([...list, ...more.filter((c) => !ids.has(c.id))]);
}

export function CommentThread({
  postId,
  initial,
  total,
  hasEarlier,
  cursor,
  canReply,
}: {
  postId: string;
  /** The newest batch, oldest first (lib/comment-thread.ts readCommentBatch). */
  initial: ThreadComment[];
  /** Every comment this reader can see on the post (countComments). */
  total: number;
  /** The server holds comments older than `initial`. */
  hasEarlier: boolean;
  /** Where the next batch starts: readCommentBatch's `cursor`. */
  cursor: CommentCursor | null;
  canReply?: boolean;
}) {
  const tr = useT();
  const [pending, startTransition] = useTransition();
  /** Shown beyond the current newest batch: fetched here, or slid out. */
  const [extra, setExtra] = useState<ThreadComment[]>([]);
  /** The reader's own deletes this visit (see the header). */
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  /** Every loaded comment shown, not only the newest few. */
  const [expanded, setExpanded] = useState(false);
  /** The last fetch's answer: where to read on from, and whether to. */
  const [fetched, setFetched] = useState<{
    cursor: CommentCursor | null;
    hasEarlier: boolean;
  } | null>(null);
  const [failed, setFailed] = useState(false);

  // A fresh newest batch from the page (see the header). Adjusted during
  // render, React's way of deriving state from a changed prop.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    const now = new Set(initial.map((c) => c.id));
    const floor = initial[0];
    const overlaps =
      prevInitial.length === 0 || prevInitial.some((c) => now.has(c.id));
    if (hasEarlier && floor && !overlaps) {
      setExtra([]);
      setFetched(null);
      setExpanded(false);
    } else {
      // Only a WINDOW can slide: without older comments on the server the
      // batch is the whole thread, and anything missing from it was deleted.
      const slid =
        floor && hasEarlier
          ? prevInitial.filter((c) => !now.has(c.id) && before(c, floor))
          : [];
      setExtra((list) => merge(list.filter((c) => !now.has(c.id)), slid));
    }
  }

  const all = merge(extra, initial)
    .filter((c) => !gone.has(c.id))
    .map((c) => c.parentId && gone.has(c.parentId) ? { ...c, parentId: null } : c);
  const shown =
    !expanded && all.length > COLLAPSE_OVER
      ? withCommentParents(all, all.slice(-SHOW_NEWEST))
      : all;
  const serverHasMore = fetched ? fetched.hasEarlier : hasEarlier;
  const nextCursor = fetched ? fetched.cursor : cursor;
  const hiddenLoaded = all.length - shown.length;
  // The count says how many are not on screen, loaded or not; a block or a
  // deletion between the count and the read can make it a little high, so
  // the button also goes once there is nothing left to show or fetch.
  const notShown = Math.max(total - shown.length, hiddenLoaded);
  const canShowMore = hiddenLoaded > 0 || (serverHasMore && nextCursor !== null);

  function showEarlier() {
    setFailed(false);
    if (hiddenLoaded > 0) {
      setExpanded(true);
      return;
    }
    if (!nextCursor) return;
    startTransition(async () => {
      const res = await loadEarlierCommentsAction(postId, nextCursor).catch(
        () => null,
      );
      if (!res || "error" in res) {
        setFailed(true);
        return;
      }
      setExtra((list) => merge(list, res.comments));
      setFetched({ cursor: res.cursor, hasEarlier: res.hasEarlier });
      setExpanded(true);
    });
  }

  function onDeleted(id: string) {
    setGone((s) => new Set(s).add(id));
    setExtra((list) => list.filter((c) => c.id !== id));
  }

  return (
    <Card
      padding="none"
      className="mb-6 divide-y divide-line overflow-hidden px-6"
    >
      {canShowMore && notShown > 0 && (
        <div className="py-3">
          <button
            type="button"
            onClick={showEarlier}
            disabled={pending}
            className="inline-flex items-center gap-1.5 py-1 text-sm text-ink-muted transition-colors hover:text-navy disabled:opacity-60"
          >
            <ChevronUp className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {pending
              ? tr("Loading…")
              : tr("Show earlier comments ({n})").replace("{n}", String(notShown))}
          </button>
          {failed && (
            <p role="alert" className="mt-1 text-sm text-danger-ink">
              {tr("Something went wrong. Try again.")}
            </p>
          )}
        </div>
      )}
      <CommentList postId={postId} comments={shown} canReply={canReply} onDeleted={onDeleted} />
    </Card>
  );
}
