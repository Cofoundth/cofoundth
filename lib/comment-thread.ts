// A post's comment thread, read in BATCHES (the founder's call, 2026-11-19:
// make the system ready now rather than fix it later). Before this, the
// thread on a community post and on a product loaded every comment the post
// had, with every reader's page view, however long the thread grew.
//
// The two pages (app/(app)/community/[id]/page.tsx and the member view of
// app/(marketing)/products/[id]/ProductPageBody.tsx) read the NEWEST batch
// here and render components/CommentThread.tsx, which shows the newest few
// and fetches earlier batches on request (loadEarlierCommentsAction in
// app/(app)/community/[id]/actions.ts, through this same reader). The feed
// card's comment drawer (components/PostCard.tsx, fetchPostCommentsAction)
// reads the same newest batch and links to the post for the rest.
//
// Newest first by (created_at, id), so a cursor is exact even when two
// comments share a timestamp. Comments by anyone the reader blocked, or who
// blocked them, are dropped after the read, as the pages always did: the
// reverse direction of a block is invisible to this client's RLS, so it
// cannot be a query clause. A batch can therefore hold fewer than
// COMMENT_BATCH; `hasEarlier` is decided on the raw rows, before that filter,
// and the next `cursor` is the oldest RAW row read, never the oldest comment
// kept, so paging always moves on. A batch that comes out empty (a blocked
// account's run of comments) reads on, up to MAX_PAGES at a time, rather than
// showing "no comments" over a thread that has some (found in review,
// 2026-11-19). A failed read THROWS: a caller that took it for "nothing
// older" would hide the rest of the thread for good.

import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Comments per read: the first render's, and each "show earlier". */
export const COMMENT_BATCH = 50;

/** Reads one batch may take to find a comment it can show. */
const MAX_PAGES = 5;

export type ThreadComment = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  isOwn: boolean;
  author: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    slug: string | null;
  } | null;
};

type CommentRow = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
};

/** The oldest comment a reader holds: the next batch is everything before. */
export type CommentCursor = { createdAt: string; id: string };

/** What a cursor may carry into a PostgREST filter, and nothing else. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ][\d:.]+(Z|[+-]\d{2}(:?\d{2})?)?$/;

export function isCommentCursor(value: unknown): value is CommentCursor {
  if (!value || typeof value !== "object") return false;
  const { createdAt, id } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    UUID.test(id) &&
    typeof createdAt === "string" &&
    TIMESTAMP.test(createdAt) &&
    !Number.isNaN(Date.parse(createdAt))
  );
}

/** One batch: the newest comments this reader can see (before `before`,
 *  when given), oldest first, as the thread renders them, with the cursor to
 *  read on from. Throws when the database does not answer. */
export async function readCommentBatch(
  supabase: DB,
  {
    postId,
    viewerId,
    blocked,
    before,
  }: {
    postId: string;
    viewerId: string | null;
    blocked: ReadonlySet<string>;
    before?: CommentCursor;
  },
): Promise<{
  comments: ThreadComment[];
  hasEarlier: boolean;
  cursor: CommentCursor | null;
  supportsReplies: boolean;
}> {
  let cursor: CommentCursor | null = before ?? null;
  let hasEarlier = false;
  let supportsReplies = true;
  let kept: CommentRow[] = [];

  function readRows() {
    let query = supabase
      .from("forum_comments")
      .select(supportsReplies
        ? "id, author_id, content, created_at, parent_comment_id"
        : "id, author_id, content, created_at")
      .eq("post_id", postId);
    if (cursor) {
      // Quoted: a timestamp carries `:` and `.`, which PostgREST's filter
      // grammar reserves. isCommentCursor() has vetted a client's values; the
      // rest come from the database.
      query = query.or(
        `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`,
      );
    }
    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(COMMENT_BATCH + 1)
      .overrideTypes<CommentRow[], { merge: false }>();
  }

  for (let page = 0; page < MAX_PAGES; page++) {
    let { data, error } = await readRows();
    if (supportsReplies && error?.code === "42703" && error.message.includes("parent_comment_id")) {
      // A deployment can still read comments while migration 0095 is pending.
      supportsReplies = false;
      ({ data, error } = await readRows());
    }
    if (error) throw new Error(`comments: ${error.message}`);

    const rows = (data ?? []).slice(0, COMMENT_BATCH);
    hasEarlier = (data ?? []).length > COMMENT_BATCH;
    const oldest = rows[rows.length - 1];
    if (oldest) {
      cursor = {
        createdAt: oldest.created_at,
        id: oldest.id,
      };
    }
    kept = rows.filter((r) => !blocked.has(r.author_id)).reverse();
    if (kept.length > 0 || !hasEarlier) break;
  }

  const authorIds = Array.from(new Set(kept.map((r) => r.author_id)));
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url, slug")
        .in("id", authorIds)
    : { data: [] };
  const byId = new Map((authors ?? []).map((a) => [a.id as string, a]));

  return {
    hasEarlier,
    cursor: hasEarlier ? cursor : null,
    supportsReplies,
    comments: kept.map((r) => {
      const a = byId.get(r.author_id);
      return {
        id: r.id,
        parentId: r.parent_comment_id ?? null,
        content: r.content,
        createdAt: r.created_at,
        isOwn: viewerId !== null && r.author_id === viewerId,
        author: a
          ? {
              id: a.id as string,
              full_name: (a.full_name as string | null) ?? null,
              photo_url: (a.photo_url as string | null) ?? null,
              slug: (a.slug as string | null) ?? null,
            }
          : null,
      };
    }),
  };
}

/** How many comments this reader can see on the post: all of them, less
 *  those by blocked accounts. Head-only counts, no rows. */
export async function countComments(
  supabase: DB,
  postId: string,
  blocked: ReadonlySet<string>,
): Promise<number> {
  const [{ count: all }, { count: hidden }] = await Promise.all([
    supabase
      .from("forum_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId),
    blocked.size
      ? supabase
          .from("forum_comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId)
          .in("author_id", [...blocked])
      : Promise.resolve({ count: 0 }),
  ]);
  return Math.max(0, (all ?? 0) - (hidden ?? 0));
}
