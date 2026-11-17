// /admin/rewards — the monthly draw (a founder-approved exception to "no
// gamification", CLAUDE.md).
//
//   · A month not yet drawn: who qualifies, computed from the comments that
//     exist NOW (lib/draw-data.ts drawEntrants — the same rules the member's
//     /rewards page shows them) and, once the month is over, a wheel of their
//     names. Spin picks one winner on the server and stores it
//     (lib/admin-actions.ts drawMonthlyWinner); the wheel then lands on them
//     (DrawWheel.tsx).
//   · A drawn month: the STORED result — the wheel built from the stored pool
//     (monthly_draws.entrant_ids, 0088), resting on the winner — never a
//     recomputation, which would drift as comments and posts are deleted.
//
// Admins only: notFound() for anyone else, like every other admin page.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { drawEntrants } from "@/lib/draw-data";
import { drawMonthlyWinner } from "@/lib/admin-actions";
import { isMonth, monthOf, nextMonth, previousMonth } from "@/lib/rewards";
import { getLocale, tServer } from "@/lib/i18n-server";
import { AdminTabs } from "@/components/AdminTabs";
import { Card, Section } from "@/components/ui";
import { DrawWheel, type WheelEntrant } from "./DrawWheel";

export const dynamic = "force-dynamic";

const NAV_LINK =
  "inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-navy";

type Person = { id: string; full_name: string | null; slug: string | null };

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  const locale = await getLocale();
  const thisMonth = monthOf(new Date());
  const asked = (await searchParams).month;
  // Always a month in the URL. The bare link (the admin tab) goes on to the
  // month that just ended — the one there is something to draw — so no
  // refresh, the one after a spin included, can switch months under the
  // wheel when the clock passes midnight on the 1st.
  if (!isMonth(asked)) redirect(`/admin/rewards?month=${previousMonth(thisMonth)}`);
  const month = asked;
  const over = month < thisMonth;

  const admin = createAdminClient();
  const { data: draw, error: drawError } = await admin
    .from("monthly_draws")
    .select("winner_id, eligible_count, drawn_at, drawn_by, entrant_ids")
    .eq("month", `${month}-01`)
    .maybeSingle();
  if (drawError) console.error("[draw] read", drawError.message);

  // Drawn: the stored pool. Not drawn: who qualifies now. Neither when the
  // draw itself couldn't be read: shown as undrawn, a month that may already
  // be drawn would offer Spin.
  const stored = (draw?.entrant_ids as string[] | null) ?? [];
  const live = draw || drawError ? null : await drawEntrants(month);
  const ids = draw
    ? [...new Set([draw.winner_id, draw.drawn_by, ...stored])].filter(
        (v): v is string => typeof v === "string",
      )
    : [];
  // The names. A failed read is said, not shown as "—" everywhere, which is
  // what a deleted account looks like.
  const named = ids.length
    ? await admin.from("profiles").select("id, full_name, slug").in("id", ids)
    : null;
  if (named?.error) console.error("[draw] names", named.error.message);
  const people = (named?.data ?? []) as Person[];
  const failed = Boolean(drawError || named?.error) || (!draw && live === null);
  const person = (id: unknown) => people.find((p) => p.id === id);
  const winner = person(draw?.winner_id);
  const drawer = person(draw?.drawn_by);

  const dateLocale = locale === "th" ? "th-TH" : "en-GB";
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString(
    dateLocale,
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short",
    });

  const [
    tTitle,
    tIntro,
    tQualified,
    tWinner,
    tDrawnBy,
    tInProgress,
    tNobody,
    tPool,
    tQualifying,
    tDays,
    tLoadFailed,
    tWinnerTag,
    tPrev,
    tNext,
  ] = await Promise.all([
    tServer("Monthly draw"),
    tServer(
      "Members who commented on 3 different products a day, 5 days in a row, worked out from the comments that exist now.",
    ),
    tServer("{n} qualified"),
    tServer("Winner: {name}"),
    tServer("Spun {when} by {name}."),
    tServer("This month isn’t over yet. The draw opens on the 1st."),
    tServer("Nobody qualified this month."),
    tServer("On the wheel"),
    tServer("Qualifying now"),
    tServer("{n} days in a row"),
    tServer("Couldn’t load this month. Try again."),
    tServer("Winner"),
    tServer("Previous month"),
    tServer("Next month"),
  ]);
  const profileHref = (p: { id: string; slug: string | null }) =>
    `/profile/${p.slug ?? p.id}`;

  const result = draw
    ? {
        winnerId: (draw.winner_id as string | null) ?? null,
        line: tDrawnBy
          .replace("{when}", () => fmt(draw.drawn_at as string))
          .replace("{name}", () => drawer?.full_name || "—"),
      }
    : null;
  const count = draw ? (draw.eligible_count as number) : (live?.length ?? 0);

  // The wheel: a drawn month's STORED pool, resting on its winner, or — for a
  // finished month nobody has spun yet — who qualifies now, ready to spin.
  const wheel: WheelEntrant[] | null = failed
    ? null
    : draw && stored.length
      ? stored.map((id) => ({ id, name: person(id)?.full_name || "—" }))
      : !draw && over && live?.length
        ? live.map((e) => ({ id: e.id, name: e.name }))
        : null;

  return (
    <Section>
      <AdminTabs />
      <div className="mb-8 max-w-[640px]">
        <h1 className="text-d2 mb-2">{tTitle}</h1>
        <p className="text-sm text-ink-muted">{tIntro}</p>
      </div>

      <nav
        aria-label={tTitle}
        className="mb-8 flex flex-wrap items-center justify-between gap-3"
      >
        <Link href={`/admin/rewards?month=${previousMonth(month)}`} className={NAV_LINK}>
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {tPrev}
        </Link>
        <p className="text-lg font-bold tracking-normal text-ink">{monthLabel}</p>
        {month < thisMonth ? (
          <Link href={`/admin/rewards?month=${nextMonth(month)}`} className={NAV_LINK}>
            {tNext}
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        ) : (
          <span aria-hidden="true" className="w-16" />
        )}
      </nav>

      {/* Two children in every state, the wheel always second: the refresh
          that follows a spin then updates the wheel instead of remounting it,
          and the line above it stays put, so nothing jumps as it lands. That
          holds when the refresh's own reads fail too: the wheel stays in its
          slot, `unavailable`, and keeps the result it just landed on. */}
      <Card padding="md" className={`mb-14 space-y-5 ${wheel ? "text-center" : ""}`}>
        {failed ? (
          <p role="alert" className="text-sm text-danger-ink">
            {tLoadFailed}
          </p>
        ) : (
          <p className="text-lg font-bold tracking-normal text-ink">
            {tQualified.replace("{n}", () => String(count))}
          </p>
        )}
        {wheel ? (
          <DrawWheel
            key={month}
            month={month}
            entrants={wheel}
            result={result}
            draw={drawMonthlyWinner}
          />
        ) : failed ? (
          <DrawWheel
            key={month}
            month={month}
            entrants={[]}
            result={null}
            draw={drawMonthlyWinner}
            unavailable
          />
        ) : draw ? (
          // A draw stored without its pool (before 0088): the text alone.
          <>
            <p className="text-lg font-bold tracking-normal text-ink">
              {tWinner.replace("{name}", () => winner?.full_name || "—")}
            </p>
            {winner && (
              <Link
                href={profileHref(winner)}
                className="text-sm text-navy underline underline-offset-4 decoration-line hover:text-gold-ink"
              >
                {profileHref(winner)}
              </Link>
            )}
            <p className="text-sm text-ink-muted">{result?.line}</p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">{over ? tNobody : tInProgress}</p>
        )}
      </Card>

      {draw && stored.length > 0 && !failed && (
        <section>
          <h2 className="mb-5 text-lg font-bold tracking-normal">{tPool}</h2>
          <Card padding="none" className="divide-y divide-line overflow-hidden">
            {stored.map((id) => {
              const p = person(id);
              return (
                <div key={id} className="flex items-center justify-between gap-4 px-6 py-4">
                  {p ? (
                    <Link
                      href={profileHref(p)}
                      className="min-w-0 truncate text-sm font-medium text-navy hover:text-gold-ink"
                    >
                      {p.full_name || "—"}
                    </Link>
                  ) : (
                    // The account has been deleted since the draw.
                    <span className="text-sm text-ink-muted">—</span>
                  )}
                  {/* The account, not just the name: two members can share
                      one, and this row links the one who won. */}
                  {id === draw.winner_id && (
                    <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs text-ink">
                      {tWinnerTag}
                    </span>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {!draw && live && live.length > 0 && (
        <section>
          <h2 className="mb-5 text-lg font-bold tracking-normal">{tQualifying}</h2>
          <Card padding="none" className="divide-y divide-line overflow-hidden">
            {live.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <Link
                  href={profileHref(e)}
                  className="min-w-0 truncate text-sm font-medium text-navy hover:text-gold-ink"
                >
                  {e.name}
                </Link>
                <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                  {tDays.replace("{n}", () => String(e.bestRun))}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </Section>
  );
}
