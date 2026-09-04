// อินไซต์ — who's looking at you. The reference app's "Insights" page,
// with its one structural difference made deliberately: theirs blurs the
// viewers and sells their identity as PRO ("See who's looking · Included in
// PRO"); we have no paid tier, so the identities are simply shown. Same
// numbers, same aggregates, no paywall theatre.
//
// Lives at /activity because /insights is the editorial blog's route.

import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { getBlockedIds } from "@/lib/blocking";
import { tServer, getLocale } from "@/lib/i18n-server";
import { timeAgo, msAgoISO, DAY_MS } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { EmptyState, LinkButton, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();
  const since = msAgoISO(30 * DAY_MS);

  // Views of ME — profile_views_select_viewed lets the viewed read their own
  // rows, so this runs on the user's client.
  const { data: viewRows } = await supabase
    .from("profile_views")
    .select("viewer_id, viewed_at")
    .eq("viewed_id", user.id)
    .gte("viewed_at", since)
    .order("viewed_at", { ascending: false })
    .limit(100);
  const views = viewRows ?? [];

  // Blocked pairs disappear from each other everywhere, this page included —
  // the big number and the list below both come off the same filtered set, so
  // "12 founders viewed you" can never disagree with the 11 faces under it.
  const blocked = await getBlockedIds(user.id);

  // Distinct viewers, newest first.
  const viewerIds: string[] = [];
  for (const v of views) {
    const id = v.viewer_id as string;
    if (id && id !== user.id && !blocked.has(id) && !viewerIds.includes(id))
      viewerIds.push(id);
  }

  const { data: viewerProfiles } = viewerIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, full_name, photo_url, industry, location, i_am")
        .in("id", viewerIds)
    : { data: [] };
  const profileById = new Map((viewerProfiles ?? []).map((p) => [p.id, p]));

  // "N saved you to their shortlist" — COUNT ONLY, on the service role.
  // profile_saves is own-rows-only by design (a save is private to the
  // saver), so the aggregate is the most the page may reveal — which is
  // exactly what the reference app's free view shows too.
  const { count: savedCount } = await createAdminClient()
    .from("profile_saves")
    .select("user_id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  // Aggregate lines, from the distinct viewers we can already see.
  const industryCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  for (const id of viewerIds) {
    const p = profileById.get(id);
    for (const ind of ((p?.industry as string[] | null) ?? []).slice(0, 1)) {
      industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
    }
    const loc = p?.location as string | null;
    if (loc) locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
  }
  const topIndustry = [...industryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topLocation = [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const mostRecent = views[0]?.viewed_at as string | undefined;

  const [
    tTitle,
    tLast30,
    tViewedYou,
    tMostRecent,
    tBuildingIn,
    tFrom,
    tSavedYou,
    tWhoLooked,
    tEmptyTitle,
    tEmptyBody,
    tBrowse,
  ] = await Promise.all([
    tServer("Profile insights"),
    tServer("Last 30 days"),
    tServer("founders viewed your profile"),
    tServer("Most recent"),
    tServer("{n} building in {industry}"),
    tServer("{n} from {location}"),
    tServer("{n} saved you to their shortlist"),
    tServer("Who looked"),
    tServer("No profile views yet"),
    tServer(
      "Show up in the community and this page fills in — post, join a meetup, say hi.",
    ),
    tServer("Browse founders"),
  ]);

  return (
    <Section width="narrow">
      <div className="mb-8">
        <h1 className="text-d2">{tTitle}</h1>
      </div>

      {/* The stat hero — their layout: eyebrow period, the big number, the
          aggregate lines. The number uses the numeral register (digits only,
          so the Thai leading guard leaves it alone). */}
      <div className="bg-white rounded-3xl shadow-xs p-8 text-center">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-4">
          {tLast30}
        </div>
        <div className="font-serif text-num2 text-navy tabular-nums">
          {viewerIds.length}
        </div>
        <div className="text-ink mt-2">{tViewedYou}</div>
        {mostRecent && (
          <div className="text-xs text-ink-muted mt-1">
            {tMostRecent} · {timeAgo(mostRecent, locale)}
          </div>
        )}

        {(topIndustry || topLocation || (savedCount ?? 0) > 0) && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            {topIndustry && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-gold-ink">
                <Eye className="w-3 h-3" />
                {tBuildingIn
                  .replace("{n}", String(topIndustry[1]))
                  .replace("{industry}", topIndustry[0])}
              </span>
            )}
            {topLocation && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-gold-ink">
                {tFrom
                  .replace("{n}", String(topLocation[1]))
                  .replace("{location}", topLocation[0])}
              </span>
            )}
            {(savedCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-gold-ink">
                <Heart className="w-3 h-3" />
                {tSavedYou.replace("{n}", String(savedCount))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Who looked — the part the reference app blurs and sells. */}
      <section className="mt-14">
        <h2 className="text-lg font-bold tracking-normal mb-5">{tWhoLooked}</h2>
        {viewerIds.length === 0 ? (
          <EmptyState
            icon={Eye}
            title={tEmptyTitle}
            description={tEmptyBody}
            action={<LinkButton href="/browse">{tBrowse}</LinkButton>}
          />
        ) : (
          <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
            {viewerIds.map((id) => {
              const p = profileById.get(id);
              if (!p) return null;
              const seen = views.find((v) => v.viewer_id === id);
              return (
                <Link
                  key={id}
                  href={`/profile/${(p.slug as string | null) ?? id}`}
                  className="flex items-center gap-3 p-4 hover:bg-cream transition-colors group"
                >
                  <Avatar
                    name={p.full_name as string}
                    url={p.photo_url as string | null}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-navy truncate group-hover:text-gold-ink transition-colors">
                      {p.full_name as string}
                    </span>
                    <span className="block text-xs text-ink-muted truncate mt-0.5">
                      {(((p.industry as string[] | null) ?? [])[0] ??
                        ((p.location as string | null) || "—"))}
                    </span>
                  </span>
                  {seen && (
                    <span className="shrink-0 text-xs text-ink-muted">
                      {timeAgo(seen.viewed_at as string, locale)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </Section>
  );
}
