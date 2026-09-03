import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import {
  ROLE_LABELS,
  INTENT_LABELS,
  STAGE_LABELS,
  complementScore,
} from "@/lib/matching";
import { DirectoryCard } from "@/components/DirectoryCard";
import { provinceLabel } from "@/lib/provinces";
import { EmptyState, Section } from "@/components/ui";
import { getFeedPosts } from "@/lib/posts";
import { isWithinMs, DAY_MS } from "@/lib/time";

export const dynamic = "force-dynamic";

function timeAgo(iso: string, locale: Locale): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return t("just now", locale);
  if (m < 60) return t("{n}m ago", locale).replace("{n}", String(m));
  if (h < 24) return t("{n}h ago", locale).replace("{n}", String(h));
  if (d < 7) return t("{n}d ago", locale).replace("{n}", String(d));
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, onboarded, profile_complete, i_am, intent, looking_for, industry, stage, commitment, slug, photo_url, location, pitch",
    )
    .eq("id", user.id)
    .single();
  const myProfileHref = `/profile/${(profile?.slug as string | undefined) ?? user.id}`;

  // ---- Merged post feed (the heartbeat) ----------------------------
  const [feed, { data: newFounders }] = await Promise.all([
    getFeedPosts(supabase, { limit: 15, userId: user.id }),
    // 40, not 4: these are RANKED below, so the query has to hand over a pool
    // to rank rather than the four newest. Ordering stays newest-first so it
    // doubles as the tiebreak when two candidates score the same.
    supabase
      .from("profiles")
      .select(
        "id, full_name, photo_url, i_am, intent, looking_for, industry, stage, commitment, location, slug, created_at",
      )
      .eq("profile_complete", true)
      .eq("suspended", false)
      .eq("account_type", "founder")
      .not("is_bot", "is", true)
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  // ---- Personal stats -----------------------------------------------
  // COMMUNITY metrics, not matching ones. This card used to lead with
  // Interests and Matches, which measure the co-founder flow — the axis the
  // strategy deliberately demoted to "cherry on top". A community-first
  // product should reflect back what you put in (posts) and what came back
  // (replies). Pending interests are not lost: AppSidebar badges them on
  // Connections, which is the better home for a number that wants action.
  const { data: myPosts } = await supabase
    .from("forum_posts")
    .select("id")
    .eq("author_id", user.id);
  const myPostIds = (myPosts ?? []).map((r) => r.id as string);

  // ---- The other areas, one summary query each ----------------------
  const nowIso = new Date().toISOString();
  const [
    { data: upcomingMeetups },
    { data: latestOrgs, count: orgCount },
    { data: myOrgRows },
  ] = await Promise.all([
    supabase
      .from("meetups")
      .select("id, slug, title, format, location, starts_at")
      .eq("status", "published")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(2),
    supabase
      .from("organizations")
      .select("id, slug, name, tagline", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(2),
    supabase.from("org_members").select("org_id").eq("user_id", user.id),
  ]);
  const myOrgIds = (myOrgRows ?? []).map((r) => r.org_id as string);
  const [{ count: pendingReceivedCount }, { count: matchesCount }, { count: fundingCount }] =
    await Promise.all([
      supabase
        .from("interests")
        .select("id", { count: "exact", head: true })
        .eq("to_profile_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`),
      // Investors who connected with MY companies. `.in()` on an empty list is
      // a PostgREST syntax error, so no-company founders short-circuit to 0.
      myOrgIds.length
        ? supabase
            .from("investor_connections")
            .select("id", { count: "exact", head: true })
            .in("org_id", myOrgIds)
        : Promise.resolve({ count: 0 }),
    ]);

  const [
    { count: postsCount },
    { count: repliesCount },
    { count: profileViewsCount },
  ] = await Promise.all([
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
    // Replies to YOUR posts by anyone but you — talking to yourself is not
    // engagement. `.in()` with an empty array is a Postgres syntax error, so a
    // member with no posts short-circuits to a resolved zero.
    myPostIds.length
      ? supabase
          .from("forum_comments")
          .select("id", { count: "exact", head: true })
          .in("post_id", myPostIds)
          .neq("author_id", user.id)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("viewed_id", user.id),
  ]);

  // ---- Who to meet --------------------------------------------------
  // The Complement Score CLAUDE.md has specified since the pivot, and /terms
  // already promises — implemented in lib/matching.ts and used here for the
  // first time. Sorted by fit, with the query's newest-first order surviving
  // as the tiebreak, so a viewer with an empty profile still gets the old
  // "newest founders" behaviour instead of an arbitrary four.
  const me = {
    i_am: (profile?.i_am as string[] | null) ?? [],
    intent: (profile?.intent as string[] | null) ?? [],
    looking_for: (profile?.looking_for as string[] | null) ?? [],
    industry: (profile?.industry as string[] | null) ?? [],
    stage: (profile?.stage as string | null) ?? null,
    commitment: (profile?.commitment as string | null) ?? null,
    location: (profile?.location as string | null) ?? null,
  };
  const myWants = me.looking_for;
  const suggested = (newFounders ?? [])
    .map((f) => ({
      row: f,
      fit: complementScore(me, {
        i_am: (f.i_am as string[] | null) ?? [],
        intent: (f.intent as string[] | null) ?? [],
        looking_for: (f.looking_for as string[] | null) ?? [],
        industry: (f.industry as string[] | null) ?? [],
        stage: (f.stage as string | null) ?? null,
        commitment: (f.commitment as string | null) ?? null,
        location: (f.location as string | null) ?? null,
      }).score,
    }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 4);

  // Resolved before the list: .map() is not an async context.
  const whyTemplate = await tServer("You're looking for {role}");

  const firstName =
    profile?.full_name?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "founder";

  const locale = (await import("@/lib/i18n-server").then((m) =>
    m.getLocale(),
  )) as "en" | "th";

  // Identity-card derived labels (i_am / intent are string[])
  const rolesLabel = ((profile?.i_am as string[] | null) ?? [])
    .map((r) => t(ROLE_LABELS[r] ?? r, locale))
    .filter(Boolean)
    .join(" · ");
  const intentsLabel = ((profile?.intent as string[] | null) ?? [])
    .map((i) => t(INTENT_LABELS[i] ?? i, locale))
    .filter(Boolean)
    .join(" · ");
  const identityLine = [rolesLabel, intentsLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section>
      {/* The page had NO <h1> at all. That was invisible while section labels
          were 12px eyebrows, but once they became 18px the largest heading on
          the page was a 20px card title — no hierarchy, and no landmark for a
          screen reader either. Their /home opens the same way ("Good evening,
          <name>"), so the shape is theirs; the string is one we already ship. */}
      {/* Avatar inline with the greeting. The identity card that used to
          carry it was the widest piece of furniture on the page, and its job
          was telling the reader who they are — on their own dashboard. Onfound
          open /home this way and spend the space on content. */}
      <div className="mb-8 flex items-center gap-4">
        <Avatar
          name={profile?.full_name as string}
          url={profile?.photo_url as string | null}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="text-d2 truncate">
            {(await tServer("Welcome, {name}")).replace("{name}", firstName)}
          </h1>
          {(identityLine || profile?.location) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
              {identityLine && <span>{identityLine}</span>}
              {profile?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin
                    className="w-3.5 h-3.5 text-gold-ink"
                    strokeWidth={1.5}
                  />
                  {provinceLabel(profile.location as string, locale)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Two columns, 5/4 on a 9-track grid with items-start — measured off
          their /home, which renders 599px / 473px at 1440. Ours ran 3/6/3 of
          12, giving 236px asides: narrower than a single card. */}
      <div className="grid lg:grid-cols-9 gap-8 lg:items-start">
        {/* LEFT — who to meet. The third review in a row flagged that this
            column was the community feed, which made /dashboard and /community
            render identically at today's post volume (2 posts: any preview is
            the whole feed). Each page now leads with the thing only it has —
            here the Complement-Score ranking, there the composer + full feed.
            The feed itself survives as a digest in the right rail. */}
        <section className="lg:col-span-5 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-normal">
              {await tServer("Founders you should meet")}
            </h2>
            <Link
              href="/browse"
              className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
            >
              {await tServer("Browse")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!suggested.length ? (
            // KIND A — and deliberately CTA-less. This query is byte-identical
            // to the one /browse runs, so when it comes back empty the
            // directory is empty too: a "Browse founders" button would land on
            // the same nothing. The header above already links there.
            <EmptyState
              padding="md"
              dense
              description={await tServer(
                "You’re the first here. Invite a friend and this list fills up.",
              )}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggested.map(({ row: f }) => {
                const why = ((f.i_am as string[] | null) ?? [])
                  .filter((r) => myWants.includes(r))
                  .map((r) => t(ROLE_LABELS[r] ?? r, locale));
                return (
                  <DirectoryCard
                    key={f.id as string}
                    href={`/profile/${(f.slug as string | undefined) ?? f.id}`}
                    name={f.full_name as string}
                    photoUrl={f.photo_url as string | null}
                    location={
                      f.location
                        ? provinceLabel(f.location as string, locale)
                        : null
                    }
                    flag={
                      isWithinMs(f.created_at as string, 7 * DAY_MS)
                        ? t("New", locale)
                        : null
                    }
                    stage={f.stage as string | null}
                    stageLabel={
                      f.stage && STAGE_LABELS[f.stage as string]
                        ? t(STAGE_LABELS[f.stage as string], locale)
                        : undefined
                    }
                    pill={
                      ((f.intent as string[] | null) ?? [])
                        .map((x) =>
                          INTENT_LABELS[x] ? t(INTENT_LABELS[x], locale) : null,
                        )
                        .filter(Boolean)[0] ?? null
                    }
                    tags={((f.i_am as string[] | null) ?? []).map((r) =>
                      t(ROLE_LABELS[r] ?? r, locale),
                    )}
                    sectors={(f.industry as string[] | null) ?? []}
                    sectorMax={1}
                    // The WHY is the blurb slot: the roles they hold that the
                    // viewer asked for — the ranking, explained in words
                    // instead of a score.
                    blurb={
                      why.length > 0
                        ? whyTemplate.replace("{role}", why.join(" · "))
                        : null
                    }
                    blurbLabel={t("Why this match", locale)}
                    chipsIcon={Search}
                    chipsLabel={t("Looking for", locale)}
                    chips={((f.looking_for as string[] | null) ?? []).map((r) =>
                      t(ROLE_LABELS[r] ?? r, locale),
                    )}
                  />
                );
              })}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-normal">
                {await tServer("Meetups")}
              </h2>
              <Link
                href="/meetups"
                className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
              >
                {await tServer("See all")}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {!upcomingMeetups?.length ? (
              <EmptyState
                padding="md"
                dense
                description={await tServer("No meetups on the calendar")}
              />
            ) : (
              <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
                {upcomingMeetups.map((mt) => (
                  <Link
                    key={mt.id as string}
                    href={`/meetups/${mt.slug as string}`}
                    className="block p-4 hover:bg-cream transition-colors group"
                  >
                    <div className="text-sm text-navy font-medium truncate group-hover:text-gold-ink transition-colors">
                      {mt.title as string}
                    </div>
                    <div className="text-xs text-ink-muted mt-1 truncate">
                      {new Date(mt.starts_at as string).toLocaleDateString(
                        locale === "th" ? "th-TH" : "en-GB",
                        { day: "numeric", month: "short" },
                      )}
                      {" · "}
                      {mt.format === "online"
                        ? t("Online", locale)
                        : ((mt.location as string | null) ?? t("In person", locale))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-normal">
                {await tServer("Latest from the community")}
              </h2>
              <Link
                href="/community"
                className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
              >
                {await tServer("See all")}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {feed.length === 0 ? (
              <EmptyState
                padding="md"
                dense
                description={await tServer(
                  "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
                )}
              />
            ) : (
              <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
                {feed.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="block p-4 hover:bg-cream transition-colors group"
                  >
                    <div className="text-sm text-navy font-medium truncate group-hover:text-gold-ink transition-colors">
                      {post.title || post.content}
                    </div>
                    <div className="text-xs text-ink-muted mt-1 truncate">
                      {post.author?.full_name ?? "—"} ·{" "}
                      {timeAgo(post.created_at, locale)}
                      {post.commentCount > 0
                        ? ` · ${post.commentCount} ${t("replies", locale)}`
                        : ""}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT — your numbers, then the conversation. The digest is the
            feed's survival on this page: three headlines, no composer — the
            full feed with search, pagination and writing lives on /community,
            which is what keeps the two pages from being the same page. */}
        <aside className="lg:col-span-4 min-w-0 space-y-8 lg:sticky lg:top-24 self-start">
          <div>
            <h2 className="text-lg font-bold tracking-normal mb-5">
              {await tServer("Your activity")}
            </h2>
            <div className="bg-white p-6 rounded-3xl shadow-xs">
              <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">
                      {await tServer("Profile views")}
                    </span>
                    <span className="font-serif text-base text-navy font-medium tabular-nums">
                      {profileViewsCount ?? 0}
                    </span>
                  </div>
                  <Link
                    href="/community"
                    className="flex items-center justify-between group"
                  >
                    <span className="text-sm text-ink-muted group-hover:text-navy transition-colors">
                      {await tServer("Posts")}
                    </span>
                    <span className="font-serif text-base text-navy font-medium tabular-nums">
                      {postsCount ?? 0}
                    </span>
                  </Link>
                  <Link
                    href="/community"
                    className="flex items-center justify-between group"
                  >
                    <span className="text-sm text-ink-muted group-hover:text-navy transition-colors">
                      {await tServer("Replies")}
                    </span>
                    <span className="font-serif text-base text-navy font-medium tabular-nums">
                      {repliesCount ?? 0}
                    </span>
                  </Link>
              </div>

              <div className="border-t border-line my-4" />

              <div className="space-y-2">
                  <Link
                    href={myProfileHref}
                    className="block bg-navy hover:bg-navy-dark text-white text-center py-2.5 text-sm transition-colors rounded-full"
                  >
                    {await tServer("View profile")}
                  </Link>
                  <Link
                    href="/settings"
                    className="block border border-line hover:border-navy text-ink hover:text-navy text-center py-2.5 text-sm transition-colors rounded-full"
                  >
                    {await tServer("Edit profile")}
                  </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-normal mb-5">
              {await tServer("Connections")}
            </h2>
            <div className="bg-white p-6 rounded-3xl shadow-xs space-y-2.5">
              <Link
                href="/matches"
                className="flex items-center justify-between group"
              >
                <span className="text-sm text-ink-muted group-hover:text-navy transition-colors">
                  {await tServer("Interests")}
                </span>
                <span className="font-serif text-base text-navy font-medium tabular-nums">
                  {pendingReceivedCount ?? 0}
                </span>
              </Link>
              <Link
                href="/matches"
                className="flex items-center justify-between group"
              >
                <span className="text-sm text-ink-muted group-hover:text-navy transition-colors">
                  {await tServer("Matches")}
                </span>
                <span className="font-serif text-base text-navy font-medium tabular-nums">
                  {matchesCount ?? 0}
                </span>
              </Link>
              <Link
                href="/funding"
                className="flex items-center justify-between group"
              >
                <span className="text-sm text-ink-muted group-hover:text-navy transition-colors">
                  {await tServer("Funding")}
                </span>
                <span className="font-serif text-base text-navy font-medium tabular-nums">
                  {fundingCount ?? 0}
                </span>
              </Link>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-normal">
                {await tServer("Companies")}
              </h2>
              <Link
                href="/orgs"
                className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
              >
                {(orgCount ?? 0) > 0 ? `${orgCount}` : ""}{" "}
                {await tServer("See all")}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {!latestOrgs?.length ? (
              <EmptyState
                padding="md"
                dense
                description={await tServer("No companies yet")}
              />
            ) : (
              <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
                {latestOrgs.map((o) => (
                  <Link
                    key={o.id as string}
                    href={`/orgs/${o.slug as string}`}
                    className="block p-4 hover:bg-cream transition-colors group"
                  >
                    <div className="text-sm text-navy font-medium truncate group-hover:text-gold-ink transition-colors">
                      {o.name as string}
                    </div>
                    {o.tagline && (
                      <div className="text-xs text-ink-muted mt-1 truncate">
                        {o.tagline as string}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </Section>
  );
}
