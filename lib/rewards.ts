// The monthly draw: who qualifies, worked out from the comments a member made.
//
// A FOUNDER-APPROVED EXCEPTION (2026-11-17) to "no gamification, no urgency
// hacks" (CLAUDE.md): a streak with a prize — a small one, one lottery ticket
// a month. Recorded there next to the deck's exception.
//
// THE RULES, in the order the code applies them:
//   · PRODUCTS ONLY (the founder's call, 2026-11-17): a comment on a community
//     post or milestone never counts — the draw exists to get makers feedback.
//   · A comment COUNTS when it is on somebody else's product, that product is
//     available (not hidden, and not by a suspended or bot account), and it
//     is at least DRAW_MIN_COMMENT_CHARS long. Only the FIRST counted comment
//     on a product in a day counts toward that day: three comments on one
//     product are one product, not three.
//   · A day QUALIFIES when DRAW_MIN_PRODUCTS_PER_DAY different products got a
//     counted comment from the member that day. Nobody can qualify while the
//     shelf has fewer live products than that — the founder chose to keep the
//     bar at 3 anyway (2026-11-17, when the shelf had 2).
//   · A member is ELIGIBLE for a month when DRAW_STREAK_DAYS qualifying days
//     in a row fall INSIDE that month. Everyone starts again from zero on the
//     1st (the founder's call, 2026-11-18): a day in one month never counts
//     toward the next, so a streak that starts on the 29th is lost on the 1st,
//     and a streak that got someone into one month's draw never also buys the
//     next month's after a single day. The last day a fresh streak can start
//     and still make the month is therefore the 5th-from-last (lastStartDay).
//   · Days are Bangkok days (UTC+7; Thailand has no daylight saving, so a
//     fixed offset is exact).
//
// "Uses the app every day" is not a separate rule: a qualifying day needs the
// comments, and a login count is both untracked here and trivially faked.
//
// WHY THESE RULES AND NOT "3 COMMENTS A DAY": the cheapest way to post three
// comments is three "nice 👍"s, and every comment notifies a maker. Different
// products plus a minimum length make the rule "give three makers feedback" —
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

export const DRAW_MIN_PRODUCTS_PER_DAY = 3;
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
  /** kind 'show_and_tell': only products count. */
  postIsProduct: boolean;
  postHidden: boolean;
  content: string;
  /** ISO timestamp, as stored (server-set since 0083). */
  createdAt: string;
};

/** Why a comment did or did not count. */
export type CommentVerdict =
  | "counted"
  | "not_product"
  | "own"
  | "hidden"
  | "short"
  | "repeat";

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

/** The last day of `month`. */
export function lastDayOf(month: string): string {
  const days = daysOf(month);
  return days[days.length - 1];
}

/** The last day a fresh streak can start and still finish inside `month`. */
export function lastStartDay(month: string): string {
  return addDays(lastDayOf(month), -(DRAW_STREAK_DAYS - 1));
}

/**
 * The UTC instants a month's comments are read between: midnight Bangkok on
 * the 1st to midnight Bangkok after its last day. Nothing before the 1st:
 * everyone starts from zero then.
 */
export function readWindow(month: string): { from: string; to: string } {
  const midnight = (day: string) =>
    new Date(Date.parse(`${day}T00:00:00Z`) - BANGKOK_OFFSET_MS).toISOString();
  return { from: midnight(`${month}-01`), to: midnight(addDays(lastDayOf(month), 1)) };
}

/** Length in characters (code points), the way a member would count them. */
function chars(s: string): number {
  return [...s.trim()].length;
}

/**
 * Judge one member's comments. Returns a verdict per comment and, per Bangkok
 * day, how many DIFFERENT products got a counted comment.
 */
export function judgeComments(
  comments: DrawComment[],
  memberId: string,
): {
  verdicts: Map<string, CommentVerdict>;
  productsByDay: Map<string, number>;
} {
  const verdicts = new Map<string, CommentVerdict>();
  const productsByDay = new Map<string, number>();
  const seen = new Set<string>();
  const inOrder = [...comments].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  for (const c of inOrder) {
    const day = bangkokDay(c.createdAt);
    let verdict: CommentVerdict;
    if (!c.postIsProduct) verdict = "not_product";
    else if (c.postAuthorId === memberId) verdict = "own";
    else if (c.postHidden) verdict = "hidden";
    else if (chars(c.content) < DRAW_MIN_COMMENT_CHARS) verdict = "short";
    else if (seen.has(`${day}|${c.postId}`)) verdict = "repeat";
    else verdict = "counted";
    verdicts.set(c.id, verdict);
    if (verdict === "counted") {
      seen.add(`${day}|${c.postId}`);
      productsByDay.set(day, (productsByDay.get(day) ?? 0) + 1);
    }
  }
  return { verdicts, productsByDay };
}

/** The days on which the member reached DRAW_MIN_PRODUCTS_PER_DAY. */
export function qualifyingDays(productsByDay: Map<string, number>): Set<string> {
  return new Set(
    [...productsByDay]
      .filter(([, n]) => n >= DRAW_MIN_PRODUCTS_PER_DAY)
      .map(([day]) => day),
  );
}

/**
 * Consecutive qualifying days ending ON `day` (0 if `day` does not qualify),
 * counting back no further than `from` — the 1st of the month being judged,
 * since a streak never reaches back across it.
 */
export function runEndingOn(day: string, qualifying: Set<string>, from = ""): number {
  let n = 0;
  for (let d = day; d >= from && qualifying.has(d); d = addDays(d, -1)) n++;
  return n;
}

/**
 * Where a member stands for `month`, as of `today` (a Bangkok day). Only the
 * month's own days count.
 *
 *   eligible    — DRAW_STREAK_DAYS in a row inside the month, by today.
 *   bestRun     — the longest run inside the month so far.
 *   currentRun  — the run still alive today: ending today, or ending
 *                 yesterday while today is not over. 0 for a past month.
 */
export function standing(
  month: string,
  qualifying: Set<string>,
  today: string,
): { eligible: boolean; bestRun: number; currentRun: number } {
  const first = `${month}-01`;
  let bestRun = 0;
  for (const day of daysOf(month)) {
    if (day > today) break;
    bestRun = Math.max(bestRun, runEndingOn(day, qualifying, first));
  }
  const inMonth = today.startsWith(month);
  const currentRun = inMonth
    ? Math.max(
        runEndingOn(today, qualifying, first),
        runEndingOn(addDays(today, -1), qualifying, first),
      )
    : 0;
  return { eligible: bestRun >= DRAW_STREAK_DAYS, bestRun, currentRun };
}

/**
 * What is still open to a member in `month`, as of `today`:
 *
 *   in        — already in the month's draw.
 *   on_track  — not yet, but `need` more qualifying days in a row still fit
 *               before the month ends (today counts while it isn't done).
 *   out       — too few days left to make DRAW_STREAK_DAYS in a row: nothing
 *               more is possible until everyone starts again on the 1st.
 *
 * A month that is over is `in` or `out`. Says nothing about whether there are
 * enough products to comment on; that is a fact about the shelf, not the
 * member, and the pages check it separately.
 */
export function outlook(
  month: string,
  qualifying: Set<string>,
  today: string,
): { status: "in" | "on_track" | "out"; need: number } {
  if (standing(month, qualifying, today).eligible) return { status: "in", need: 0 };
  if (!today.startsWith(month)) return { status: "out", need: DRAW_STREAK_DAYS };
  const first = `${month}-01`;
  const doneToday = qualifying.has(today);
  // The run today can still extend: today's own when it's done, otherwise
  // the one that ended yesterday (alive until today is over).
  const run = runEndingOn(doneToday ? today : addDays(today, -1), qualifying, first);
  const need = DRAW_STREAK_DAYS - run;
  const left =
    Math.round((Date.parse(lastDayOf(month)) - Date.parse(today)) / DAY_MS) + (doneToday ? 0 : 1);
  return { status: left >= need ? "on_track" : "out", need };
}

/** What a member's page tells them to do next in the month in progress. */
export type NextStep =
  | { kind: "in" } //                 already in this month's draw
  | { kind: "too_late"; restart: string } // not enough days left; restart = next 1st
  | { kind: "shelf"; products: number } // fewer products than a day needs
  | { kind: "unknown" } //            the product count couldn't be read: no deadline
  | { kind: "start_today" } //        today is the last day a fresh streak can start
  | { kind: "start_by"; day: string } // no streak alive: start by `day`
  | { kind: "one_more" } //           one more qualifying day
  | { kind: "more"; days: number }; // `days` more in a row

/**
 * The next step for `month` (the month in progress) as of `today`. `products`
 * is how many products the member could comment on: with fewer than a day
 * needs, nothing they do can get them in, and that comes before any deadline
 * — but never before "too late", which is true either way. Null (the count
 * couldn't be read) gives "unknown" rather than a deadline the page can't
 * stand behind.
 */
export function nextStep(
  month: string,
  qualifying: Set<string>,
  today: string,
  products: number | null,
): NextStep {
  const { status, need } = outlook(month, qualifying, today);
  if (status === "in") return { kind: "in" };
  if (status === "out") return { kind: "too_late", restart: `${nextMonth(month)}-01` };
  if (products === null) return { kind: "unknown" };
  if (products < DRAW_MIN_PRODUCTS_PER_DAY) return { kind: "shelf", products };
  if (need >= DRAW_STREAK_DAYS) {
    const by = lastStartDay(month);
    return today === by ? { kind: "start_today" } : { kind: "start_by", day: by };
  }
  return need === 1 ? { kind: "one_more" } : { kind: "more", days: need };
}
