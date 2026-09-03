import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { PostComposer } from "@/components/PostComposer";
import { PostFeed } from "@/components/PostFeed";
import { EmptyState, Section } from "@/components/ui";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
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
    .select("full_name, onboarded, profile_complete, i_am, intent, slug, photo_url, location, pitch")
    .eq("id", user.id)
    .single();
  const myProfileHref = `/profile/${(profile?.slug as string | undefined) ?? user.id}`;

  // ---- Merged post feed (the heartbeat) ----------------------------
  const [feed, { data: newFounders }] = await Promise.all([
    getFeedPosts(supabase, { limit: 15, userId: user.id }),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, i_am, intent, slug, created_at")
      .eq("profile_complete", true)
      .eq("suspended", false)
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
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
        {/* LEFT — the feed */}
        <section className="lg:col-span-5 min-w-0 space-y-4">
          {profile?.onboarded && <PostComposer />}

          <RealtimeRefresh
            table="forum_posts"
            currentUserId={user.id}
            senderColumn="author_id"
            kind="posts"
          />

          <div className="flex items-center justify-between">
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

          {/* KIND A — nothing posted yet. PostFeed's own state says so and
              hands over three easy openings; the composer above is the action,
              so it deliberately carries no button. */}
          <PostFeed items={feed} locale={locale} />
        </section>

        {/* RIGHT — your numbers, then who is new */}
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
            <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold tracking-normal">
              {await tServer("New founders")}
            </h2>
            <Link
              href="/browse"
              className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
            >
              {await tServer("Browse")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!newFounders?.length ? (
            // KIND A — and deliberately CTA-less. This query is byte-identical
            // to the one /browse runs (profile_complete, not suspended, not
            // me), so when it comes back empty the directory is empty too: a
            // "Browse founders" button would land on the same nothing. The
            // header above already links to /browse for the normal case.
            <EmptyState
              padding="md"
              dense
              description={await tServer(
                "You’re the first here. Invite a friend and this list fills up.",
              )}
            />
          ) : (
            <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
              {newFounders.map((f) => {
                const href = `/profile/${(f.slug as string | undefined) ?? f.id}`;
                const fresh = isWithinMs(f.created_at as string, 7 * DAY_MS);
                return (
                  <Link
                    key={f.id as string}
                    href={href}
                    className="block p-4 hover:bg-cream transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={f.full_name as string}
                        url={f.photo_url as string | null}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-navy font-medium truncate group-hover:text-gold-ink transition-colors">
                          {f.full_name as string}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5 truncate">
                          {((f.i_am as string[] | null) ?? [])
                            .map((r) => t(ROLE_LABELS[r] ?? r, locale))
                            .join(" · ") || "—"}
                          {((f.intent as string[] | null) ?? []).length > 0
                            ? ` · ${((f.intent as string[] | null) ?? [])
                                .map((x) => t(INTENT_LABELS[x] ?? x, locale))
                                .join(" · ")}`
                            : ""}
                        </div>
                        <div className="text-xs text-ink-muted mt-1 inline-flex items-center gap-2">
                          {timeAgo(f.created_at as string, locale)}
                          {fresh && (
                            <span className="w-1.5 h-1.5 rounded-full bg-navy inline-block" />
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          </div>
        </aside>
      </div>
    </Section>
  );
}
