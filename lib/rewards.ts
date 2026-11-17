// The monthly draw: who qualifies, worked out from the comments a member made.
//
// A FOUNDER-APPROVED EXCEPTION (2026-11-17) to "no gamification, no urgency
// hacks" (CLAUDE.md): a streak with a prize — a small one, one lottery ticket
// a month. Recorded there next to the deck's exception.
//
// THE RULES, in the order the code applies them:
//   · A comment COUNTS when it is on somebody else's post or product, that
//     post is not hidden, and it is at least DRAW_MIN_COMMENT_CHARS long.
//     Only the FIRST counted comment on a post in a day counts toward that
//     day: three comments on one post are one post, not three.
//   · A day QUALIFIES when DRAW_MIN_POSTS_PER_DAY different posts or products
//     got a counted comment from the member that day.
//   · A member is ELIGIBLE for a month when DRAW_STREAK_DAYS qualifying days
//     in a row END inside that month — a streak that starts on the 29th and
//     finishes on the 2nd counts for the month it finishes in.
//   · Days are Bangkok days (UTC+7; Thailand has no daylight saving, so a
//     fixed offset is exact).
//
// "Uses the app every day" is not a separate rule: a qualifying day needs the
// comments, and a login count is both untracked here and trivially faked.
//
// WHY THESE RULES AND NOT "3 COMMENTS A DAY": the cheapest way to post three
// comments is three "nice 👍"s, and every comment notifies a maker. Different
// posts plus a minimum length make the rule "give three people feedback" —
// the same effort for a real member, and the behaviour worth paying for.
//
// WHAT MAKES IT HARD TO GAME, without any extra tracking: since migrations
// 0083/0084 the SERVER sets every comment's created_at (no backdating a day)
// and caps comments at 10 per 10 minutes; a deleted or moderator-removed
// comment is gone, so it stops counting the moment it goes. Eligibility is
// therefore always recomputed from what exists, never stored.
//
// PURE AND IMPORT-FREE on purpose: the member's page (app/(app)/rewards), the
// admin draw (lib/draw-data.ts, app/(app)/admin/rewards) and a plain Node test
// all run this one copy, so the page a member reads and the list the draw
// picks from cannot disagree.

export const DRAW_MIN_POSTS_PER_DAY = 3;
export const DRAW_MIN_COMMENT_CHARS = 20;
export const DRAW_STREAK_DAYS = 5;

/** Asia/Bangkok, which has no daylight saving: a fixed offset is exact. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM`, the month a draw is for. */
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type DrawComment = {
  id: string;
  postId: string;
  postAuthorId: string;
  postHidden: boolean;
  content: string;
  /** ISO timestamp, as stored (server-set since 0083). */
  createdAt: string;
};

/** Why a comment did or did not count. */
export type CommentVerdict = "counted" | "own" | "hidden" | "short" | "repeat";

/** The Bangkok calendar day of a timestamp, as `YYYY-MM-DD`. */
export function bangkokDay(iso: string): string {
  return new Date(Date.parse(iso) + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` shifted by `n` days. */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_RE.test(value);
}

/** The Bangkok month (`YYYY-MM`) a moment falls in. */
export function monthOf(now: Date): string {
  return bangkokDay(now.toISOString()).slice(0, 7);
}

/** The month before `month`. */
export function previousMonth(month: string): string {
  return addDays(`${month}-01`, -1).slice(0, 7);
}

/** The month after `month`. */
export function nextMonth(month: string): string {
  return addDays(`${month}-28`, 7).slice(0, 7);
}

/** Every day of `month`, `YYYY-MM-DD`, in order. */
export function daysOf(month: string): string[] {
  const days: string[] = [];
  for (let d = `${month}-01`; d.startsWith(month); d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

/**
 * The UTC instants a month's comments are read between: from midnight
 * Bangkok `DRAW_STREAK_DAYS - 1` days BEFORE the month (a streak finishing on
 * the 4th started in the month before) to midnight Bangkok after its last day.
 */
export function readWindow(month: string): { from: string; to: string } {
  const first = addDays(`${month}-01`, -(DRAW_STREAK_DAYS - 1));
  const days = daysOf(month);
  const after = addDays(days[days.length - 1], 1);
  const midnight = (day: string) =>
    new Date(Date.parse(`${day}T00:00:00Z`) - BANGKOK_OFFSET_MS).toISOString();
  return { from: midnight(first), to: midnight(after) };
}

/** Length in characters (code points), the way a member would count them. */
function chars(s: string): number {
  return [...s.trim()].length;
}

/**
 * Judge one member's comments. Returns a verdict per comment and, per Bangkok
 * day, how many DIFFERENT posts got a counted comment.
 */
export function judgeComments(
  comments: DrawComment[],
  memberId: string,
): {
  verdicts: Map<string, CommentVerdict>;
  postsByDay: Map<string, number>;
} {
  const verdicts = new Map<string, CommentVerdict>();
  const postsByDay = new Map<string, number>();
  const seen = new Set<string>();
  const inOrder = [...comments].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  for (const c of inOrder) {
    const day = bangkokDay(c.createdAt);
    let verdict: CommentVerdict;
    if (c.postAuthorId === memberId) verdict = "own";
    else if (c.postHidden) verdict = "hidden";
    else if (chars(c.content) < DRAW_MIN_COMMENT_CHARS) verdict = "short";
    else if (seen.has(`${day}|${c.postId}`)) verdict = "repeat";
    else verdict = "counted";
    verdicts.set(c.id, verdict);
    if (verdict === "counted") {
      seen.add(`${day}|${c.postId}`);
      postsByDay.set(day, (postsByDay.get(day) ?? 0) + 1);
    }
  }
  return { verdicts, postsByDay };
}

/** The days on which the member reached DRAW_MIN_POSTS_PER_DAY. */
export function qualifyingDays(postsByDay: Map<string, number>): Set<string> {
  return new Set(
    [...postsByDay]
      .filter(([, n]) => n >= DRAW_MIN_POSTS_PER_DAY)
      .map(([day]) => day),
  );
}

/** Consecutive qualifying days ending ON `day` (0 if `day` does not qualify). */
export function runEndingOn(day: string, qualifying: Set<string>): number {
  let n = 0;
  for (let d = day; qualifying.has(d); d = addDays(d, -1)) n++;
  return n;
}

/**
 * Where a member stands for `month`, as of `today` (a Bangkok day).
 *
 *   eligible    — DRAW_STREAK_DAYS in a row END inside the month.
 *   bestRun     — the longest run that ends inside the month (counting the
 *                 days it carried in from the month before).
 *   currentRun  — the run still alive today: ending today, or ending
 *                 yesterday while today is not over. 0 for a past month.
 */
export function standing(
  month: string,
  qualifying: Set<string>,
  today: string,
): { eligible: boolean; bestRun: number; currentRun: number } {
  let bestRun = 0;
  for (const day of daysOf(month)) {
    if (day > today) break;
    bestRun = Math.max(bestRun, runEndingOn(day, qualifying));
  }
  const inMonth = today.startsWith(month);
  const currentRun = inMonth
    ? Math.max(
        runEndingOn(today, qualifying),
        runEndingOn(addDays(today, -1), qualifying),
      )
    : 0;
  return { eligible: bestRun >= DRAW_STREAK_DAYS, bestRun, currentRun };
}
