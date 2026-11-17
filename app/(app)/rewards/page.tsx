// /rewards — a member's progress toward this month's draw.
//
// The monthly draw is a founder-approved exception to "no gamification"
// (CLAUDE.md, 2026-11-17): comments on 3 different PRODUCTS a day (community
// posts don't count), 5 days in a row, put a member in the month's draw for
// one lottery ticket. This
// page is also the "see my own comments" page the CEO asked for — every
// comment the member made this month, marked counted or not and why.
//
// Everything here is worked out by lib/rewards.ts from the member's own
// comments (lib/draw-data.ts memberDrawComments), the same rules the admin
// draw applies to everyone. It is a reading of TODAY: the draw re-reads at the
// end of the month, so a comment that is gone by then (deleted, removed, or on
// a post deleted or hidden since) no longer counts — and the copy says so
// rather than promising an entry is permanent.
//
// Founders and explorers (anyone who can comment). Investors are sent home.
// Team accounts are never in the draw (lib/draw-data.ts outOfTheDraw) and are
// told so. A suspended member is not: suspension is silent everywhere else in
// the app, and this page does not become the place it is revealed.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Gift, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { isAdminUser } from "@/lib/admin";
import { getBlockedIds } from "@/lib/blocking";
import { canComment, roleHome } from "@/lib/roles";
import { memberDrawComments } from "@/lib/draw-data";
import {
  bangkokDay,
  daysOf,
  DRAW_MIN_COMMENT_CHARS,
  DRAW_MIN_PRODUCTS_PER_DAY,
  DRAW_STREAK_DAYS,
  judgeComments,
  monthOf,
  previousMonth,
  qualifyingDays,
  standing,
  type CommentVerdict,
} from "@/lib/rewards";
import { productPath } from "@/lib/post-types";
import { getLocale, tServer } from "@/lib/i18n-server";
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

  const [comments, { data: wins }, staff, blocked] = await Promise.all([
    memberDrawComments(supabase, user.id, month),
    // RLS (0087) returns only draws this member won; 0088 grants only these
    // columns. Recent ones only: the news is for the month or two after a
    // win, not a banner forever.
    supabase
      .from("monthly_draws")
      .select("month")
      .gte("month", `${previousMonth(previousMonth(month))}-01`)
      .order("month", { ascending: false })
      .limit(1),
    isAdminUser(supabase, user),
    getBlockedIds(user.id),
  ]);

  const { verdicts, productsByDay } = judgeComments(comments ?? [], user.id);
  const qualifying = qualifyingDays(productsByDay);
  const { eligible, currentRun } = standing(month, qualifying, today);
  const todayProducts = productsByDay.get(today) ?? 0;
  const thisMonth = (comments ?? []).filter((c) =>
    bangkokDay(c.createdAt).startsWith(month),
  );

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
  ] = await Promise.all([
    t("Monthly draw"),
    t(
      "Comment on 3 different products a day, 5 days in a row, and you’re in this month’s draw for a lottery ticket.",
    ),
    t("You’re in this month’s draw so far."),
    t(
      "We check again when we draw at the end of the month: a comment that’s gone by then — deleted, or on a product that was removed or hidden — doesn’t count.",
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
    t("Do that {n} days in a row, by Bangkok time. A streak can start late last month."),
    t(
      "The winner is drawn at random after the month ends, from the comments that still count then.",
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
          ) : eligible ? (
            <div className="mb-6 flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-navy" strokeWidth={1.5} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-normal text-ink">{tIn}</p>
                <p className="mt-1 text-sm text-ink-muted">{tInBody}</p>
              </div>
            </div>
          ) : null}
          {(staff || !eligible) && (
            <div className="mb-6">
              <p className="text-lg font-bold tracking-normal text-ink">
                {fill(tStreak, { n: currentRun, total: DRAW_STREAK_DAYS })}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {fill(tToday, {
                  n: Math.min(todayProducts, DRAW_MIN_PRODUCTS_PER_DAY),
                  total: DRAW_MIN_PRODUCTS_PER_DAY,
                })}
              </p>
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
