// The monthly draw's reads: the comments lib/rewards.ts judges, for one
// member (their progress page) or for everyone (the admin draw). The RULES are
// all in lib/rewards.ts; this file only fetches, so the two audiences run the
// same judgement over the same kind of rows.
//
// Server-only: the all-members read goes through the service role.

import { createAdminClient } from "@/lib/supabase/admin";
import { type createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { devTestAuthorIds } from "@/lib/test-accounts";
import { productAvailabilityOf, queryWithProductAvailability } from "@/lib/product-store-data";
import { isPhoneOnly } from "@/app/(marketing)/products/product-view";
import {
  bangkokDay,
  judgeComments,
  outlook,
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
  /** A product that only runs on a phone, so its link can be labeled
   *  (app/(marketing)/products/product-view.ts isPhoneOnly). Display only:
   *  the draw counts the comment the same on every device. */
  postPhoneOnly: boolean;
};

/** comments → their post → its author's moderation flags. The FKs are named
 *  because forum_likes and forum_comments give PostgREST other paths between
 *  these tables. */
const commentColumns = (availability: string) =>
  `id, author_id, content, created_at, post:forum_posts!forum_comments_post_id_fkey(id, author_id, hidden, kind, title, content, link_url, ${availability}, author:profiles!forum_posts_author_id_fkey(suspended, is_bot))`;

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
    link_url: string | null;
    platforms?: string[] | null;
    availability?: { platforms: string[] } | null;
    author: { suspended: boolean | null; is_bot: boolean | null } | null;
  } | null;
};

function toDrawComment(r: Row, devTest: Set<string>): MemberDrawComment | null {
  // A comment whose post is unreadable cannot be judged; it is left out
  // rather than guessed at.
  if (!r.post) return null;
  // DEVELOPMENT ONLY: a PRODUCT by one of the three test accounts is
  // available here, as it already is on the shelf and its page in development
  // (lib/test-accounts.ts), so the draw can be tried end to end against real
  // rows. `devTest` is the empty Set in a production build, read without a
  // query, and a moderator-hidden row stays hidden either way.
  const devProduct = r.post.kind === "show_and_tell" && devTest.has(r.post.author_id);
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
      (!devProduct && (r.post.author?.suspended === true || r.post.author?.is_bot === true)),
    content: r.content,
    createdAt: r.created_at,
    postKind: r.post.kind ?? "post",
    postTitle: r.post.title,
    postSnippet: (r.post.content ?? "").slice(0, 120),
    postPhoneOnly: r.post.kind === "show_and_tell" &&
      isPhoneOnly(r.post.link_url, productAvailabilityOf(r.post).platforms),
  };
}

/** The test accounts among a read's post authors (lib/test-accounts.ts):
 *  always the empty Set, without a query, in a production build. */
function devTestAuthorsOf(rows: Row[]): Promise<Set<string>> {
  return devTestAuthorIds([...new Set(rows.flatMap((r) => (r.post ? [r.post.author_id] : [])))]);
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
  const rows = await readAll((after) => queryWithProductAvailability((availability) => {
    let q = supabase
      .from("forum_comments")
      .select(commentColumns(availability))
      .eq("author_id", memberId)
      .gte("created_at", from)
      .lt("created_at", to);
    if (after) q = q.gt("id", after);
    return q.order("id").limit(PAGE);
  }), "member comments");
  if (!rows) return null;
  const devTest = await devTestAuthorsOf(rows);
  return rows
    .map((r) => toDrawComment(r, devTest))
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

/** One member's place in a month, for the admin's progress list. */
export type TrackedMember = {
  id: string;
  name: string;
  slug: string | null;
  /** lib/rewards.ts outlook(): in the draw, can still make it, or out. */
  status: "in" | "on_track" | "out";
  currentRun: number;
  bestRun: number;
  /** Qualifying days in the month so far, in a row or not. */
  days: number;
};

const PEOPLE_COLUMNS = "id, full_name, slug, email, suspended, is_bot, is_admin, account_type";
type Person = {
  id: string;
  full_name: string | null;
  slug: string | null;
  email: string | null;
  suspended: boolean | null;
  is_bot: boolean | null;
  is_admin: boolean | null;
  account_type: string | null;
};

/** Profiles by id, 100 to a request: a long `in (…)` list outgrows the URL a
 *  GET can carry. Null when any request fails. */
async function peopleByIds(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Person[] | null> {
  const out: Person[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await admin
      .from("profiles")
      .select(PEOPLE_COLUMNS)
      .in("id", ids.slice(i, i + 100));
    if (error) {
      console.error("[draw] people", error.message);
      return null;
    }
    out.push(...((data ?? []) as Person[]));
  }
  return out;
}

const STATUS_ORDER = { in: 0, on_track: 1, out: 2 } as const;

/**
 * Everyone TAKING PART in `month` — at least one counted comment in it — and
 * where each stands as of `today` (`members`, best placed first), plus the
 * ones in the draw (`entrants`), sorted by id: the ORDER the draw indexes
 * into, so it must not depend on anything but the ids. `today` caps a month
 * still in progress; for a finished month pass any later day.
 *
 * Out of both whatever their comments: outOfTheDraw() above, and any role
 * that cannot comment. Null when a read FAILS, so nobody acts on — or draws
 * from — a partial list.
 */
export async function trackMonth(
  month: string,
  today = bangkokDay(new Date().toISOString()),
): Promise<{ members: TrackedMember[]; entrants: DrawEntrant[] } | null> {
  const admin = createAdminClient();
  const { from, to } = readWindow(month);

  const rows = await readAll((after) => queryWithProductAvailability((availability) => {
    let q = admin
      .from("forum_comments")
      .select(commentColumns(availability))
      .gte("created_at", from)
      .lt("created_at", to);
    if (after) q = q.gt("id", after);
    return q.order("id").limit(PAGE);
  }), "comments");
  if (!rows) return null;

  const devTest = await devTestAuthorsOf(rows);
  const byAuthor = new Map<string, DrawComment[]>();
  for (const r of rows) {
    const c = toDrawComment(r, devTest);
    if (!c) continue;
    const list = byAuthor.get(r.author_id) ?? [];
    list.push(c);
    byAuthor.set(r.author_id, list);
  }

  const judged = new Map<string, Omit<TrackedMember, "id" | "name" | "slug">>();
  for (const [authorId, comments] of byAuthor) {
    const { productsByDay } = judgeComments(comments, authorId);
    // Taking part = something counted. Comments that never count (on posts,
    // too short, on their own product) are not a place in the draw.
    if (!productsByDay.size) continue;
    const qualifying = qualifyingDays(productsByDay);
    const { currentRun, bestRun } = standing(month, qualifying, today);
    judged.set(authorId, {
      status: outlook(month, qualifying, today).status,
      currentRun,
      bestRun,
      days: qualifying.size,
    });
  }
  if (!judged.size) return { members: [], entrants: [] };

  const people = await peopleByIds(admin, [...judged.keys()]);
  if (!people) return null;

  const members: TrackedMember[] = people
    .filter(
      (p) =>
        !outOfTheDraw(p) &&
        (p.account_type === "founder" || p.account_type === "explorer"),
    )
    .map((p) => ({
      id: p.id,
      name: p.full_name || "—",
      slug: p.slug ?? null,
      ...judged.get(p.id)!,
    }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        b.currentRun - a.currentRun ||
        b.bestRun - a.bestRun ||
        a.name.localeCompare(b.name),
    );

  const entrants = members
    .filter((m) => m.status === "in")
    .map((m) => ({ id: m.id, name: m.name, slug: m.slug, bestRun: m.bestRun }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { members, entrants };
}

/** Everyone in `month`'s draw, sorted by id (see trackMonth). Null when a
 *  read fails, so the caller refuses to draw from a partial list. */
export async function drawEntrants(
  month: string,
  today = bangkokDay(new Date().toISOString()),
): Promise<DrawEntrant[] | null> {
  return (await trackMonth(month, today))?.entrants ?? null;
}

/**
 * The maker of every live product (one entry per product): not hidden, by an
 * account that is neither suspended nor a bot — the products a comment can
 * count on (lib/rewards.ts). Null when the read fails.
 *
 * Ids rather than a count, because what a MEMBER can comment on is personal:
 * not their own products, and not those of anyone in a block with them either
 * way (getBlockedIds) — the comment action refuses those, the product page
 * 404s and the deck leaves them out. Count with commentableFor(). Below
 * DRAW_MIN_PRODUCTS_PER_DAY nobody (or that member) can qualify: the founder
 * kept the bar at 3 anyway, so the pages say so rather than show a deadline
 * nobody can meet. Only the size matters there, so 1000 rows is plenty.
 */
export async function liveProductMakers(): Promise<string[] | null> {
  const { data, error } = await createAdminClient()
    .from("forum_posts")
    .select("author_id, author:profiles!forum_posts_author_id_fkey!inner(suspended, is_bot)")
    .eq("kind", "show_and_tell")
    .eq("hidden", false)
    .eq("author.suspended", false)
    .eq("author.is_bot", false)
    .limit(1000);
  if (error) {
    console.error("[draw] products", error.message);
    return null;
  }
  return [...(data ?? []).map((r) => r.author_id as string), ...(await devTestProductMakers())];
}

/** DEVELOPMENT ONLY: the makers of the test accounts' live products, which
 *  count in development like every other place that shows them
 *  (lib/test-accounts.ts). `[]` in a production build, without a query. */
async function devTestProductMakers(): Promise<string[]> {
  if (process.env.NODE_ENV === "production") return [];
  const { data, error } = await createAdminClient()
    .from("forum_posts")
    .select("author_id, author:profiles!forum_posts_author_id_fkey!inner(suspended)")
    .eq("kind", "show_and_tell")
    .eq("hidden", false)
    .eq("author.suspended", true)
    .limit(1000);
  if (error) return [];
  const makers = (data ?? []).map((r) => r.author_id as string);
  const test = await devTestAuthorIds([...new Set(makers)]);
  return makers.filter((m) => test.has(m));
}

/** How many of `makers` (liveProductMakers) a member can comment on. */
export function commentableFor(
  makers: string[] | null,
  memberId: string,
  blocked: Set<string>,
): number | null {
  return makers === null
    ? null
    : makers.filter((m) => m !== memberId && !blocked.has(m)).length;
}
