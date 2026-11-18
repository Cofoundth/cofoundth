// /rewards — a member's progress toward this month's draw.
//
// The monthly draw is a founder-approved exception to "no gamification"
// (CLAUDE.md, 2026-11-17): comments on 3 different PRODUCTS a day (community
// posts don't count), 5 days in a row, put a member's name on the month's
// wheel; one spin picks the ONE winner of a lottery ticket. This page is also
// the "see my own comments" page the CEO asked for — every comment the member
// made this month, marked counted or not and why.
//
// Everything here is worked out by lib/rewards.ts from the member's own
// comments (lib/draw-data.ts memberDrawComments), the same rules the admin
// draw applies to everyone. It is a reading of TODAY: the draw re-reads at the
// end of the month, so a comment that is gone by then (deleted, removed, or on
// a post deleted or hidden since) no longer counts — and the copy says so
// rather than promising an entry is permanent.
//
// THE STATUS, in one of three states (lib/rewards.ts outlook): in the draw;
// can still make it — with the next step in plain words (the last day a fresh
// streak can start, or how many more days in a row); or too late for this
// month. Everyone starts again from zero on the 1st (the founder's call,
// 2026-11-18), so the page also says when that is, and once it has happened
// it keeps LAST month's result on top: in the draw and waiting, spun and not
// them, or not in it — a win has its own card. And when there are fewer
// products to comment on than a day needs, it says nobody can get in yet
// instead of offering a deadline nobody can meet.
//
// Founders and explorers (anyone who can comment). Investors are sent home.
// Team accounts are never in the draw (lib/draw-data.ts outOfTheDraw) and are
// told so. A suspended member is not: suspension is silent everywhere else in
// the app, and this page does not become the place it is revealed.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CheckCircle2, Gift, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { isAdminUser } from "@/lib/admin";
import { getBlockedIds } from "@/lib/blocking";
import { canComment, roleHome } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentableFor, liveProductMakers, memberDrawComments } from "@/lib/draw-data";
import {
  bangkokDay,
  daysOf,
  DRAW_MIN_COMMENT_CHARS,
  DRAW_MIN_PRODUCTS_PER_DAY,
  DRAW_STREAK_DAYS,
  judgeComments,
  monthOf,
  nextMonth,
  nextStep,
  previousMonth,
  qualifyingDays,
  standing,
  type CommentVerdict,
} from "@/lib/rewards";
import { productPath } from "@/lib/post-types";
import { getLocale, tServer } from "@/lib/i18n-server";
import { viewerKind } from "@/lib/device";
import { Card, EmptyState, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await tServer("Monthly draw") };
}

/** The English key for each verdict's label (translated below). */
const VERDICT_LABEL: Record<CommentVerdict, string> = {
  counted: "Counted",
  not_product: "Not a product",
  own: "Your own product",
  hidden: "The product isn’t available",
  short: "Under 20 characters",
  repeat: "Same product twice that day",
};

export default async function RewardsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getAccountRole(supabase, user.id);
  if (!canComment(role)) redirect(roleHome(role) ?? "/products");

  const locale = await getLocale();
  const now = new Date();
  const month = monthOf(now);
  const today = bangkokDay(now.toISOString());
  // A computer cannot open a product that only runs on a phone (lib/device.ts),
  // so those rows below are named but not linked there. Display only: a
  // comment counts the same from every device.
  const computer = (await viewerKind()) === "computer";

  const last = previousMonth(month);
  const [comments, lastComments, { data: wins }, staff, blocked, makers, lastDraw] =
    await Promise.all([
      memberDrawComments(supabase, user.id, month),
      memberDrawComments(supabase, user.id, last),
      // RLS (0087) returns only draws this member won; 0088 grants only these
      // columns. Recent ones only: the news is for the month or two after a
      // win, not a banner forever.
      supabase
        .from("monthly_draws")
        .select("month")
        .gte("month", `${previousMonth(last)}-01`)
        .order("month", { ascending: false })
        .limit(1),
      isAdminUser(supabase, user),
      getBlockedIds(user.id),
      liveProductMakers(),
      // Last month's draw, if it has been spun: whether this member was in
      // its stored pool and whether they won. Through the service role, since
      // RLS shows a member only the draws they won and never the pool (0087,
      // 0088). Only those two booleans leave the server: never the winner's
      // id, never anybody else's.
      createAdminClient()
        .from("monthly_draws")
        .select("winner_id, entrant_ids")
        .eq("month", `${last}-01`)
        .maybeSingle(),
    ]);

  // This month: only its own days count — everyone starts from zero on the 1st.
  const { verdicts, productsByDay } = judgeComments(comments ?? [], user.id);
  const qualifying = qualifyingDays(productsByDay);
  const { currentRun } = standing(month, qualifying, today);
  // In, or what to do next — including "you can't get in yet" when there are
  // fewer products THIS member can comment on than a day needs (not their
  // own, not a blocked pair's): a deadline they can't meet is not a status.
  // A failed count gives no deadline at all (lib/rewards.ts nextStep).
  const products = commentableFor(makers, user.id, blocked);
  const step = nextStep(month, qualifying, today, products);
  const todayProducts = productsByDay.get(today) ?? 0;
  const thisMonth = (comments ?? []).filter((c) =>
    bangkokDay(c.createdAt).startsWith(month),
  );

  // Last month. Until the spin: the same rules over the comments that exist
  // now. After it: in the STORED pool (a comment deleted since doesn't
  // rewrite a draw that has happened) — or meeting the rules, for an account
  // the draw leaves out whatever its comments. That is a suspended one, and
  // suspension is silent everywhere in the app: so they read "not you this
  // time" like anyone else, never "you weren't in it" next to a streak of 5.
  const lastJudged = lastComments ? judgeComments(lastComments, user.id) : null;
  const lastQualifying = lastJudged ? qualifyingDays(lastJudged.productsByDay) : new Set<string>();
  const lastStanding = standing(last, lastQualifying, today);
  const lastSpun = lastDraw.data
    ? {
        won: lastDraw.data.winner_id === user.id,
        inPool: ((lastDraw.data.entrant_ids as string[] | null) ?? []).includes(user.id),
      }
    : null;
  const lastIn = lastStanding.eligible || !!lastSpun?.inPool;
  const tookPartLast = !!lastJudged && lastJudged.productsByDay.size > 0;
  // Nothing to say about last month for someone who didn't take part, or
  // whose win already has its own card above — nor when a read failed, since
  // a guess about a draw is worse than no card.
  if (lastDraw.error) console.error("[rewards] last draw", lastDraw.error.message);
  const lastCard =
    staff ||
    lastComments === null ||
    lastDraw.error ||
    lastSpun?.won ||
    !(lastIn || tookPartLast)
      ? null
      : lastIn
        ? lastSpun
          ? "spun"
          : "waiting"
        : "missed";

  const dateLocale = locale === "th" ? "th-TH" : "en-GB";
  const monthName = (m: string) =>
    new Date(`${m}-01T00:00:00Z`).toLocaleDateString(dateLocale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const dayName = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const t = async (en: string) => tServer(en);
  const [
    tTitle,
    tIntro,
    tIn,
    tInBody,
    tStaff,
    tStreak,
    tToday,
    tWon,
    tWonBody,
    tHow,
    tRule1,
    tRule2,
    tRule3,
    tRule4,
    tDays,
    tLegendFull,
    tLegendSome,
    tLegendNone,
    tYourComments,
    tNoComments,
    tReadFailed,
    tUnavailable,
    tDayStatus,
    tInNext,
    tStartBy,
    tStartToday,
    tMoreDays,
    tOneMore,
    tTooLate,
    tShelf,
    tLastWaiting,
    tLastWaitingBody,
    tLastSpun,
    tLastSpunBody,
    tLastMissed,
    tLastMissedBody,
    tOnPhone,
  ] = await Promise.all([
    t("Monthly draw"),
    t(
      "Try what other members built and tell them what you think: that is what makers need most. As a small thank-you, comment on 3 different products a day, 5 days in a row, and your name goes on this month’s wheel. One spin, one winner of a lottery ticket.",
    ),
    t("Your name is on this month’s wheel so far."),
    t(
      "We check again before we spin at the end of the month: a comment that’s gone by then — deleted, or on a product that was removed or hidden — doesn’t count.",
    ),
    t("Team accounts aren’t in the draw. This page shows how the rules count your comments."),
    t("Streak: {n} of {total} days"),
    t("Today: {n} of {total} products"),
    t("You won the draw for {month}!"),
    t("We’ll send you a message to hand over your prize."),
    t("How it works"),
    t(
      "Comment on {n} different products a day. Only products count, not community posts, and several comments on the same product count once.",
    ),
    t("Only other members’ products count, and each comment needs at least {n} characters."),
    t(
      "Do that {n} days in a row inside the month, by Bangkok time. Everyone starts again from zero on the 1st.",
    ),
    t(
      "After the month ends we spin a wheel of everyone who still qualifies. One name wins; everyone else tries again next month.",
    ),
    t("This month"),
    t("{n}+ products"),
    t("Some"),
    t("None"),
    t("Your comments this month"),
    t("No comments yet this month. Open the deck and give a maker feedback."),
    t("Couldn’t load your progress. Try again in a moment."),
    t("A post or product that’s no longer available"),
    t("{day}: {n} of {total} products"),
    t("On {date} everyone starts again from zero. Your place in this month’s draw stays."),
    t("Start by {date} to make it this month."),
    t("Start today to make it this month."),
    t("{n} more days in a row and you’re in."),
    t("One more day and you’re in."),
    t(
      "Too late for this month: there aren’t enough days left for {n} in a row. Everyone starts again from zero on {date}.",
    ),
    t(
      "Products you can comment on right now: {n}. A day needs {total} different ones, so you can’t get in until the shelf grows.",
    ),
    t("You’re in the draw for {month}."),
    t("The winner is drawn after the month ends, and the team announces it."),
    t("The draw for {month} is done."),
    t("Not you this time. This month is a fresh start."),
    t("You weren’t in the draw for {month}."),
    t("Your best streak was {n} of {total} days. This month is a fresh start."),
    t("Opens on a phone"),
  ]);
  const verdictLabels = Object.fromEntries(
    await Promise.all(
      Object.entries(VERDICT_LABEL).map(async ([k, en]) => [k, await t(en)]),
    ),
  ) as Record<CommentVerdict, string>;

  const fill = (s: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (out, [k, v]) => out.replace(`{${k}}`, () => String(v)),
      s,
    );

  // Day states. Each must read apart WITHOUT colour (WCAG 1.4.11): done is a
  // filled navy box, started a navy OUTLINE on the tan surface, nothing a
  // hairline box, and a day still to come no box at all.
  const dayBox = (day: string) => {
    if (day > today) return "text-ink-muted";
    if (qualifying.has(day)) return "bg-navy text-white";
    if ((productsByDay.get(day) ?? 0) > 0) return "border-2 border-navy bg-gold text-ink";
    return "border border-line text-ink-muted";
  };

  return (
    <Section width="narrow">
      <div className="mb-8">
        <h1 className="text-d2 mb-2">{tTitle}</h1>
        <p className="text-sm text-ink-muted">{tIntro}</p>
      </div>

      {wins?.[0] && (
        <Card padding="md" className="mb-8 flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-navy" strokeWidth={1.5} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {fill(tWon, { month: monthName((wins[0].month as string).slice(0, 7)) })}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{tWonBody}</p>
          </div>
        </Card>
      )}

      {/* Last month's result, kept on the page after the 1st: the new month
          starts from zero, and without this the old one would just vanish. */}
      {lastCard && (
        <Card padding="md" className="mb-8 flex items-start gap-3">
          <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy" strokeWidth={1.5} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {fill(
                lastCard === "waiting" ? tLastWaiting : lastCard === "spun" ? tLastSpun : tLastMissed,
                { month: monthName(last) },
              )}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {lastCard === "waiting"
                ? tLastWaitingBody
                : lastCard === "spun"
                  ? tLastSpunBody
                  : fill(tLastMissedBody, { n: lastStanding.bestRun, total: DRAW_STREAK_DAYS })}
            </p>
          </div>
        </Card>
      )}

      {comments === null ? (
        <Card padding="md" className="mb-14">
          <p role="alert" className="text-sm text-danger-ink">
            {tReadFailed}
          </p>
        </Card>
      ) : (
        <Card padding="md" className="mb-14">
          {staff ? (
            <p className="mb-6 text-sm text-ink-muted">{tStaff}</p>
          ) : step.kind === "in" ? (
            <div className="mb-6 flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-navy" strokeWidth={1.5} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-normal text-ink">{tIn}</p>
                <p className="mt-1 text-sm text-ink-muted">{tInBody}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {fill(tInNext, { date: dayName(`${nextMonth(month)}-01`) })}
                </p>
              </div>
            </div>
          ) : null}
          {(staff || step.kind !== "in") && (
            <div className="mb-6">
              <p className="text-lg font-bold tracking-normal text-ink">
                {fill(tStreak, { n: currentRun, total: DRAW_STREAK_DAYS })}
              </p>
              {step.kind !== "too_late" && (
                <p className="mt-1 text-sm text-ink-muted">
                  {fill(tToday, {
                    n: Math.min(todayProducts, DRAW_MIN_PRODUCTS_PER_DAY),
                    total: DRAW_MIN_PRODUCTS_PER_DAY,
                  })}
                </p>
              )}
              {/* The next step, in plain words: what it takes from here, or why
                  nothing can happen this month. Not for the team, who are never
                  "in". */}
              {!staff && step.kind !== "in" && step.kind !== "unknown" && (
                <p className="mt-3 text-sm text-ink">
                  {step.kind === "too_late"
                    ? fill(tTooLate, { n: DRAW_STREAK_DAYS, date: dayName(step.restart) })
                    : step.kind === "shelf"
                      ? fill(tShelf, { n: step.products, total: DRAW_MIN_PRODUCTS_PER_DAY })
                      : step.kind === "start_today"
                        ? tStartToday
                        : step.kind === "start_by"
                          ? fill(tStartBy, { date: dayName(step.day) })
                          : step.kind === "one_more"
                            ? tOneMore
                            : fill(tMoreDays, { n: step.days })}
                </p>
              )}
            </div>
          )}

          <p className="mb-3 text-xs text-ink-muted">
            {tDays} · {monthName(month)}
          </p>
          <ol className="grid grid-cols-7 gap-2">
            {daysOf(month).map((day) => (
              <li
                key={day}
                className={`grid h-9 place-items-center rounded-lg text-sm tabular-nums ${dayBox(day)} ${
                  day === today ? "ring-2 ring-navy ring-offset-2" : ""
                }`}
              >
                <span aria-hidden="true">{Number(day.slice(8))}</span>
                <span className="sr-only">
                  {fill(tDayStatus, {
                    day: dayName(day),
                    n: Math.min(productsByDay.get(day) ?? 0, DRAW_MIN_PRODUCTS_PER_DAY),
                    total: DRAW_MIN_PRODUCTS_PER_DAY,
                  })}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-navy" aria-hidden="true" />
              {fill(tLegendFull, { n: DRAW_MIN_PRODUCTS_PER_DAY })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border-2 border-navy bg-gold" aria-hidden="true" />
              {tLegendSome}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-line" aria-hidden="true" />
              {tLegendNone}
            </span>
          </div>
        </Card>
      )}

      <section className="mb-14">
        <h2 className="mb-5 text-lg font-bold tracking-normal">{tHow}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
          <li>{fill(tRule1, { n: DRAW_MIN_PRODUCTS_PER_DAY })}</li>
          <li>{fill(tRule2, { n: DRAW_MIN_COMMENT_CHARS })}</li>
          <li>{fill(tRule3, { n: DRAW_STREAK_DAYS })}</li>
          <li>{tRule4}</li>
        </ul>
      </section>

      {comments !== null && (
        <section>
          <h2 className="mb-5 text-lg font-bold tracking-normal">{tYourComments}</h2>
          {thisMonth.length ? (
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              {thisMonth.map((c) => {
                const verdict = verdicts.get(c.id) ?? "short";
                const counted = verdict === "counted";
                // A post the member can no longer open — hidden, by a
                // moderated account, or by someone in a block — is not named
                // or linked here either: its own page 404s for them.
                const unavailable = c.postHidden || blocked.has(c.postAuthorId);
                // Its page 404s on a computer, except for its maker and an
                // admin.
                const phoneOnly =
                  computer && !staff && c.postPhoneOnly && c.postAuthorId !== user.id;
                const href =
                  c.postKind === "show_and_tell"
                    ? productPath(c.postId)
                    : `/community/${c.postId}`;
                return (
                  <div key={c.id} className="px-6 py-4">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      {unavailable ? (
                        <span className="min-w-0 truncate text-sm text-ink-muted">
                          {tUnavailable}
                        </span>
                      ) : phoneOnly ? (
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="min-w-0 truncate text-sm font-medium text-ink">
                            {c.postTitle || c.postSnippet}
                          </span>
                          <span className="shrink-0 text-xs text-ink-muted">{tOnPhone}</span>
                        </span>
                      ) : (
                        <Link
                          href={href}
                          className="min-w-0 truncate text-sm font-medium text-navy hover:text-gold-ink"
                        >
                          {c.postTitle || c.postSnippet}
                        </Link>
                      )}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                          counted
                            ? "bg-gold-soft text-ink"
                            : "border border-line text-ink-muted"
                        }`}
                      >
                        {counted && (
                          <CheckCircle2
                            className="-mt-0.5 mr-1 inline h-3.5 w-3.5"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        )}
                        {verdictLabels[verdict]}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">
                      {c.content}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {dayName(bangkokDay(c.createdAt))}
                    </p>
                  </div>
                );
              })}
            </Card>
          ) : (
            <EmptyState
              icon={MessageCircle}
              description={tNoComments}
              padding="lg"
              dense
            />
          )}
        </section>
      )}
    </Section>
  );
}
