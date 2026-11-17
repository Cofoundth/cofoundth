// The monthly draw's reads: the comments lib/rewards.ts judges, for one
// member (their progress page) or for everyone (the admin draw). The RULES are
// all in lib/rewards.ts; this file only fetches, so the two audiences run the
// same judgement over the same kind of rows.
//
// Server-only: the all-members read goes through the service role.

import { createAdminClient } from "@/lib/supabase/admin";
import { type createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import {
  bangkokDay,
  judgeComments,
  qualifyingDays,
  readWindow,
  standing,
  type DrawComment,
} from "@/lib/rewards";

type DB = Awaited<ReturnType<typeof createClient>>;

/** A comment as the progress page shows it: the judged fields plus what it
 *  was on, for the link and the label. */
export type MemberDrawComment = DrawComment & {
  postKind: string;
  postTitle: string | null;
  postSnippet: string;
};

/** comments → their post → its author's moderation flags. The FKs are named
 *  because forum_likes and forum_comments give PostgREST other paths between
 *  these tables. */
const POST_EMBED =
  "post:forum_posts!forum_comments_post_id_fkey(id, author_id, hidden, kind, title, content, author:profiles!forum_posts_author_id_fkey(suspended, is_bot))";
const COLUMNS = `id, author_id, content, created_at, ${POST_EMBED}`;

/** PostgREST's ceiling on one response. */
const PAGE = 1000;

type Row = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  post: {
    id: string;
    author_id: string;
    hidden: boolean | null;
    kind: string | null;
    title: string | null;
    content: string | null;
    author: { suspended: boolean | null; is_bot: boolean | null } | null;
  } | null;
};

function toDrawComment(r: Row): MemberDrawComment | null {
  // A comment whose post is unreadable cannot be judged; it is left out
  // rather than guessed at.
  if (!r.post) return null;
  return {
    id: r.id,
    postId: r.post.id,
    postAuthorId: r.post.author_id,
    postIsProduct: r.post.kind === "show_and_tell",
    // "Not available" is the app's own sense of moderated: a hidden post, or
    // a post by a suspended or bot account — the same rows whose pages 404
    // for members (app/(app)/community/[id], app/(marketing)/products/[id]).
    postHidden:
      r.post.hidden === true ||
      r.post.author?.suspended === true ||
      r.post.author?.is_bot === true,
    content: r.content,
    createdAt: r.created_at,
    postKind: r.post.kind ?? "post",
    postTitle: r.post.title,
    postSnippet: (r.post.content ?? "").slice(0, 120),
  };
}

/**
 * Every row of a comments query, in pages keyed on `id` (`id > last`), not on
 * an offset: a comment deleted between two pages would shift every later row
 * by one under OFFSET and drop the row at the boundary. Null when any page
 * fails, so callers never act on a partial read.
 */
async function readAll(
  query: (after: string | null) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  tag: string,
): Promise<Row[] | null> {
  const rows: Row[] = [];
  let after: string | null = null;
  for (;;) {
    const { data, error } = await query(after);
    if (error) {
      console.error(`[draw] ${tag}`, error.message);
      return null;
    }
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
    after = page[page.length - 1].id;
  }
}

/**
 * One member's comments in the read window of `month`, through THEIR OWN
 * client (comments, posts and the two moderation flags are readable to
 * `authenticated`), newest first. Null when the read fails, so the page can
 * say so instead of showing "0 of 5".
 */
export async function memberDrawComments(
  supabase: DB,
  memberId: string,
  month: string,
): Promise<MemberDrawComment[] | null> {
  const { from, to } = readWindow(month);
  const rows = await readAll((after) => {
    let q = supabase
      .from("forum_comments")
      .select(COLUMNS)
      .eq("author_id", memberId)
      .gte("created_at", from)
      .lt("created_at", to);
    if (after) q = q.gt("id", after);
    return q.order("id").limit(PAGE);
  }, "member comments");
  if (!rows) return null;
  return rows
    .map(toDrawComment)
    .filter((c): c is MemberDrawComment => c !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export type DrawEntrant = {
  id: string;
  name: string;
  slug: string | null;
  bestRun: number;
};

/** Accounts that are never in the draw, whatever their comments: suspended
 *  and bot accounts, and the team (the admin flag or ADMIN_EMAILS). Shared
 *  with /rewards, which tells the team they are out instead of "You're in". */
export function outOfTheDraw(p: {
  suspended?: unknown;
  is_bot?: unknown;
  is_admin?: unknown;
  email?: unknown;
}): boolean {
  return (
    p.suspended === true ||
    p.is_bot === true ||
    p.is_admin === true ||
    isAdminEmail(p.email as string | null)
  );
}

/**
 * Everyone eligible for `month`, sorted by id — the ORDER the draw indexes
 * into, so it must not depend on anything but the ids. `today` caps a month
 * still in progress (a preview); for a finished month pass any later day.
 *
 * Out of the draw whatever their comments: outOfTheDraw() above, and any role
 * that cannot comment. Returns null when a read FAILS, so the caller refuses
 * to draw instead of drawing from a partial list.
 */
export async function drawEntrants(
  month: string,
  today = bangkokDay(new Date().toISOString()),
): Promise<DrawEntrant[] | null> {
  const admin = createAdminClient();
  const { from, to } = readWindow(month);

  const rows = await readAll((after) => {
    let q = admin
      .from("forum_comments")
      .select(COLUMNS)
      .gte("created_at", from)
      .lt("created_at", to);
    if (after) q = q.gt("id", after);
    return q.order("id").limit(PAGE);
  }, "comments");
  if (!rows) return null;

  const byAuthor = new Map<string, DrawComment[]>();
  for (const r of rows) {
    const c = toDrawComment(r);
    if (!c) continue;
    const list = byAuthor.get(r.author_id) ?? [];
    list.push(c);
    byAuthor.set(r.author_id, list);
  }

  const qualified = new Map<string, number>();
  for (const [authorId, comments] of byAuthor) {
    const { productsByDay } = judgeComments(comments, authorId);
    const s = standing(month, qualifyingDays(productsByDay), today);
    if (s.eligible) qualified.set(authorId, s.bestRun);
  }
  if (!qualified.size) return [];

  const { data: people, error } = await admin
    .from("profiles")
    .select("id, full_name, slug, email, suspended, is_bot, is_admin, account_type")
    .in("id", [...qualified.keys()]);
  if (error) {
    console.error("[draw] entrants", error.message);
    return null;
  }

  return (people ?? [])
    .filter(
      (p) =>
        !outOfTheDraw(p) &&
        (p.account_type === "founder" || p.account_type === "explorer"),
    )
    .map((p) => ({
      id: p.id as string,
      name: (p.full_name as string | null) || "—",
      slug: (p.slug as string | null) ?? null,
      bestRun: qualified.get(p.id as string) ?? 0,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
