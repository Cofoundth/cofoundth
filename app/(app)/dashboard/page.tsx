import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { FEATURES } from "@/lib/features";
import { tServer } from "@/lib/i18n-server";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import {
  ROLE_LABELS,
  INTENT_LABELS,
  primaryIntent,
  STAGE_LABELS,
  complementScore,
} from "@/lib/matching";
import { DirectoryCard } from "@/components/DirectoryCard";
import { provinceLabel } from "@/lib/provinces";
import {
  Card,
  EmptyState,
  LinkButton,
  Section,
  SectionHeading,
} from "@/components/ui";
import { getFeedPosts } from "@/lib/posts";
import { getBlockedIds } from "@/lib/blocking";
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
  // The block set has to land BEFORE the feed, not beside it: the feed
  // excludes blocked authors, so it can't be a sibling of the same
  // Promise.all any more. The two things that don't depend on it still run in
  // parallel underneath.
  const blocked = await getBlockedIds(user.id);
  const [feed, { data: newFounders, count: founderCount }] =
    await Promise.all([
      getFeedPosts(supabase, {
        limit: 15,
        userId: user.id,
        excludeAuthorIds: blocked,
      }),
    // 40, not 4: these are RANKED below, so the query has to hand over a pool
    // to rank rather than the four newest. Ordering stays newest-first so it
    // doubles as the tiebreak when two candidates score the same.
    supabase
      .from("profiles")
      .select(
        "id, full_name, photo_url, i_am, intent, looking_for, industry, stage, commitment, location, slug, created_at",
        { count: "exact" },
      )
      .eq("profile_complete", true)
      .eq("suspended", false)
      // Founders only, in the ranked pool AND in founderCount: the census says
      // "N founders", so an explorer or an investor in it would be a wrong
      // number as well as a wrong suggestion.
      .eq("account_type", "founder")
      .not("is_bot", "is", true)
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    ]);
  // Blocked pairs never surface in the ranked pool or the face pile.
  // founderCount stays unfiltered on purpose — it's a census ("N founders in
  // the community"), not a list of people shown to the viewer.
  const founderPool = (newFounders ?? []).filter(
    (p) => !blocked.has(p.id as string),
  );

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
  // The organizations read feeds the Companies rail and the org_members read
  // exists only to scope the Funding count, so both are skipped outright while
  // those blocks are hidden — a soft launch should not pay for rows nothing
  // renders. `null` in the Promise.all keeps the tuple positional.
  const nowIso = new Date().toISOString();
  const [{ data: upcomingMeetups }, orgsRes, myOrgsRes] = await Promise.all([
    supabase
      .from("meetups")
      .select("id, slug, title, format, location, starts_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(2),
    FEATURES.companies
      ? supabase
          .from("organizations")
          .select("id, slug, name, tagline, logo_url", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(2)
      : null,
    FEATURES.funding
      ? supabase.from("org_members").select("org_id").eq("user_id", user.id)
      : null,
  ]);
  const latestOrgs = orgsRes?.data ?? null;
  const orgCount = orgsRes?.count ?? 0;
  const myOrgIds = (myOrgsRes?.data ?? []).map((r) => r.org_id as string);
  const [{ count: pendingReceivedCount }, { count: matchesCount }, fundingRes] =
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
        : null,
    ]);
  const fundingCount = fundingRes?.count ?? 0;

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
  const suggested = founderPool
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
        {/* Name only. The role/intent/location line under it repeated three
            things the viewer typed themselves, on the one page where they
            already know them — and if the profile is thin,
            IncompleteProfileBanner above already says so. */}
        <div className="min-w-0">
          <h1 className="text-d2 truncate">
            {(await tServer("Welcome, {name}")).replace("{name}", firstName)}
          </h1>
        </div>
      </div>

      {/* Two columns from 768px: a fluid main column and a FIXED side column
          (240px at md, 280 at lg, 320 at xl). It used to be 5/4 of a 9-track
          grid from 1024 only, which put the owner's ~929px laptop on the
          phone layout (one 2,200px column, 866px-wide stat panels) and left
          the main column 402px at 1100. A fraction also grew the side panels
          into wide strips with a label at one end and its number at the
          other; a fixed track keeps them at the width their content wants and
          hands every extra pixel to the main column. Measured main column
          (side column) with a 15px Windows scrollbar and the rail each width
          shows by default — 768: 369 (240) · 929: 530 (240) · 1024: 553 (280)
          · 1100: 629 (280) · 1280: 577 (320) · 1440: 688 (320). */}
      <div className="grid gap-8 md:items-start md:grid-cols-[minmax(0,1fr)_15rem] lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* LEFT — who to meet. The third review in a row flagged that this
            column was the community feed, which made /dashboard and /community
            render identically at today's post volume (2 posts: any preview is
            the whole feed). Each page now leads with the thing only it has —
            here the Complement-Score ranking, there the composer + full feed.
            The feed itself survives as a digest in the right rail.
            `@container`: the founder grid below sizes off THIS column's
            width, which depends on the rail as much as on the viewport. */}
        <section className="@container min-w-0 space-y-8">
          {/* MEETUPS FIRST — the soft launch's headline, and the nav lists it
              directly under Dashboard. Below four ranked founder cards it sat
              ~1.5 screens down on a 1536x674 laptop. The empty-state panel
              carries no eyebrow of its own: the h2 right above it already
              says "Meetups". */}
          <div>
            <SectionHeading
              title={await tServer("Meetups")}
              action={{ href: "/meetups", label: await tServer("See all") }}
            />
            {!upcomingMeetups?.length ? (
              // No border: this panel shipped without one and D2 is still open.
              <Card tone="navy">
                <p className="text-white leading-relaxed mb-5">
                  {await tServer(
                    "No meetups on the calendar yet. Host one — every founder on Cofoundee will see it.",
                  )}
                </p>
                {/* size="md" is the gap-2 tier; only the padding comes down to
                    the px-5 py-2.5 this CTA shipped with (cn() merges, so a
                    downward override is safe now). */}
                <LinkButton
                  href="/meetups/new"
                  variant="inverse"
                  className="px-5 py-2.5"
                >
                  {await tServer("Start the first meetup")}
                  <ArrowRight className="w-4 h-4" />
                </LinkButton>
              </Card>
            ) : (
              <Card padding="none" className="divide-y divide-line overflow-hidden">
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
              </Card>
            )}
          </div>

          <div>
          <SectionHeading
            title={await tServer("Founders you should meet")}
            action={{ href: "/browse", label: await tServer("Browse") }}
          />

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
            // Two across once the COLUMN is 32rem (512px) — a container query,
            // so it follows the rail as well as the window: 929px with the
            // icon rail gives a 530px column, two 257px cards. Narrower (a
            // phone, or 768px beside the side column) it is one across and
            // shows the top TWO; two across, the top four, two rows. The
            // heading's link carries the rest. Four cards stacked one across
            // used to run the page ~2,000px.
            <div className="grid gap-4 @lg:grid-cols-2">
              {suggested.map(({ row: f }, i) => {
                const why = ((f.i_am as string[] | null) ?? [])
                  .filter((r) => myWants.includes(r))
                  .map((r) => t(ROLE_LABELS[r] ?? r, locale));
                return (
                  <div
                    key={f.id as string}
                    className={i >= 2 ? "hidden @lg:block min-w-0" : "min-w-0"}
                  >
                    <DirectoryCard
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
                      pill={(() => {
                        const k = primaryIntent(f.intent as string[] | null);
                        return k ? t(INTENT_LABELS[k], locale) : null;
                      })()}
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
                      // Every compact row is one fixed line, so two cards side
                      // by side line up without reserving anything.
                      density="compact"
                    />
                  </div>
                );
              })}
            </div>
          )}
          </div>

          <div>
            <SectionHeading
              title={await tServer("Latest from the community")}
              action={{ href: "/community", label: await tServer("See all") }}
            />
            {feed.length === 0 ? (
              <EmptyState
                padding="md"
                dense
                description={await tServer(
                  "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
                )}
              />
            ) : (
              <Card padding="none" className="divide-y divide-line overflow-hidden">
                {feed.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-cream transition-colors group"
                  >
                    <Avatar
                      name={post.author?.full_name}
                      url={post.author?.photo_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
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
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </div>
        </section>

        {/* RIGHT — your network and your numbers. The digest is the feed's
            survival on this page: three headlines, no composer — the full feed
            with search, pagination and writing lives on /community, which is
            what keeps the two pages from being the same page.

            From 768px a single stack in the fixed side column. Below it the
            panels come after the main column, and instead of stretching each
            one across the full width (an 866px "Your activity" with its labels
            at one edge and their numbers at the other) they flow two across
            wherever two 256px panels fit, and keep that natural width. */}
        <aside className="min-w-0 self-start grid gap-x-4 gap-y-8 grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] items-start md:flex md:flex-col md:items-stretch md:gap-8 lg:sticky lg:top-24">
          {/* Faces first — Onfound's most appealing module is an overlapping
              avatar pile over a one-line count: social proof carried by
              people, not numbers. Real members, same pool the ranking uses. */}
          <div>
            <h2 className="text-lg font-bold tracking-normal mb-5">
              {await tServer("Your network")}
            </h2>
            <Card>
              <div className="flex items-center -space-x-3">
                {founderPool.slice(0, 5).map((f) => (
                  <div
                    key={f.id as string}
                    className="rounded-full ring-2 ring-white"
                  >
                    <Avatar
                      name={f.full_name as string}
                      url={f.photo_url as string | null}
                      size="md"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-ink mt-4 leading-relaxed">
                {(await tServer("{n} founders are building here")).replace(
                  "{n}",
                  String(founderCount ?? 0),
                )}
              </p>
              <div className="mt-4">
                <LinkButton href="/browse" size="sm" variant="secondary">
                  {await tServer("Browse founders")}
                </LinkButton>
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-normal mb-5">
              {await tServer("Your activity")}
            </h2>
            <Card>
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

              {/* Both rail links shipped as full-width BLOCKS with no
                  horizontal padding and no tracking, so the size token's
                  px-4/tracking-wide are overridden rather than inherited: the
                  label is centred in a full-width button, where those two would
                  be invisible on one line and wrong on a wrapped Thai one.
                  `flex` beats BASE's inline-flex so the stack keeps its exact
                  heights (an inline-level box adds line-box leading). */}
              <div className="space-y-2">
                  <LinkButton
                    href={myProfileHref}
                    size="sm"
                    fullWidth
                    className="flex px-0 py-2.5 text-center tracking-normal"
                  >
                    {await tServer("View profile")}
                  </LinkButton>
                  <LinkButton
                    href="/settings"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="flex px-0 py-2.5 text-center tracking-normal"
                  >
                    {await tServer("Edit profile")}
                  </LinkButton>
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-normal mb-5">
              {await tServer("Connections")}
            </h2>
            <Card className="space-y-2.5">
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
              {/* Hidden for the meetups soft launch. /funding stays live for
                  the notification deep links and for investors. */}
              {FEATURES.funding && (
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
              )}
            </Card>
          </div>

          {/* Hidden for the meetups soft launch. The aside is a space-y-8
              stack, so dropping the last block just ends it earlier — no gap,
              no stretched card. /orgs itself stays live. */}
          {FEATURES.companies && (
            <div>
              <SectionHeading
                title={await tServer("Companies")}
                action={{
                  href: "/orgs",
                  // The count is part of the link's label here, exactly as it
                  // was rendered before: `{count} See all`.
                  label: `${(orgCount ?? 0) > 0 ? `${orgCount} ` : " "}${await tServer("See all")}`,
                }}
              />
              {!latestOrgs?.length ? (
                <EmptyState
                  padding="md"
                  dense
                  description={await tServer("No companies yet")}
                />
              ) : (
                <Card
                  padding="none"
                  className="divide-y divide-line overflow-hidden"
                >
                  {latestOrgs.map((o) => (
                    <Link
                      key={o.id as string}
                      href={`/orgs/${o.slug as string}`}
                      className="flex items-start gap-3 p-4 hover:bg-cream transition-colors group"
                    >
                      <Avatar
                        name={o.name as string}
                        url={o.logo_url as string | null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-navy font-medium truncate group-hover:text-gold-ink transition-colors">
                          {o.name as string}
                        </div>
                        {o.tagline && (
                          <div className="text-xs text-ink-muted mt-1 truncate">
                            {o.tagline as string}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </Card>
              )}
            </div>
          )}
        </aside>
      </div>
    </Section>
  );
}
