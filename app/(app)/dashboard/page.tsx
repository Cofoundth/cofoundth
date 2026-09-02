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
import { EmptyState } from "@/components/ui";
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

  // ---- Personal stats (still computed, surfaced subtly) -------------
  const [
    { count: pendingReceivedCount },
    { count: matchesCount },
    { count: profileViewsCount },
  ] = await Promise.all([
    supabase
      .from("interests")
      .select("id", { count: "exact", head: true })
      .eq("to_profile_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`),
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
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]">
      {/* The page had NO <h1> at all. That was invisible while section labels
          were 12px eyebrows, but once they became 18px the largest heading on
          the page was a 20px card title — no hierarchy, and no landmark for a
          screen reader either. Their /home opens the same way ("Good evening,
          <name>"), so the shape is theirs; the string is one we already ship. */}
      <div className="mb-8 max-w-[640px]">
        <h1 className="text-d2 lg:text-d3">
          {(await tServer("Welcome, {name}")).replace("{name}", firstName)}
        </h1>
      </div>

      <div className="grid xl:grid-cols-12 gap-8">
        {/* LEFT — identity + stats */}
        <aside className="xl:col-span-3 space-y-6 xl:sticky xl:top-24 self-start">
          {/* Identity card */}
          <div className="bg-white p-6 rounded-3xl shadow-xs">
            <Avatar
              name={profile?.full_name as string}
              url={profile?.photo_url as string | null}
              size="lg"
            />
            <h2 className="font-serif text-xl text-navy mt-4 leading-tight">
              {(profile?.full_name as string) || firstName}
            </h2>
            {identityLine && (
              <p className="text-sm text-ink-muted mt-1 leading-snug">
                {identityLine}
              </p>
            )}
            {profile?.location && (
              <p className="text-sm text-ink-muted mt-2 inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-ink" strokeWidth={1.5} />
                {provinceLabel(profile.location as string, locale)}
              </p>
            )}

            <div className="border-t border-line my-4" />

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
            </div>

            <div className="border-t border-line my-4" />

            <div className="space-y-2">
              <Link
                href={myProfileHref}
                className="block bg-navy hover:bg-navy-dark text-white text-center py-2.5 text-sm transition-colors"
              >
                {await tServer("View profile")}
              </Link>
              <Link
                href="/settings"
                className="block border border-line hover:border-navy text-ink hover:text-navy text-center py-2.5 text-sm transition-colors rounded-xl"
              >
                {await tServer("Edit profile")}
              </Link>
            </div>
          </div>
        </aside>

        {/* CENTER — the merged feed */}
        <section className="xl:col-span-6 space-y-4">
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

        {/* RIGHT — new founders */}
        <aside className="xl:col-span-3 xl:sticky xl:top-24 self-start">
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
                        <div className="text-[10px] text-ink-muted mt-1 inline-flex items-center gap-2">
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

        </aside>
      </div>
    </div>
  );
}
