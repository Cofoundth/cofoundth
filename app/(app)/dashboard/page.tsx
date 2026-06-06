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
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getFeedPosts } from "@/lib/posts";

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
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Onboarding prompt — only if not onboarded */}
      {!profile?.profile_complete && (
        <div className="bg-white border border-gold/40 p-6 lg:p-8 mb-8">
          <div className="flex items-start gap-5">
            <div className="font-serif text-2xl text-gold leading-none mt-1">
              !
            </div>
            <div className="flex-1">
              <h2 className="text-xl mb-2">
                {await tServer("Your profile isn’t complete yet")}
              </h2>
              <p className="text-sm text-ink leading-relaxed mb-4 max-w-2xl">
                {await tServer(
                  "Add your role, what you’re looking for, and a short About me — until then your profile won’t appear in the Founder directory.",
                )}
              </p>
              <Link
                href={profile?.onboarded ? "/settings" : "/onboarding"}
                className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2"
              >
                {await tServer(
                  profile?.onboarded ? "Complete profile" : "Start onboarding",
                )}{" "}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT — identity + stats */}
        <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 self-start">
          {/* Identity card */}
          <div className="bg-white border border-line p-6">
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
                <MapPin className="w-3.5 h-3.5 text-gold" strokeWidth={1.5} />
                {provinceLabel(profile.location as string, locale)}
              </p>
            )}

            <div className="border-t border-gold/30 my-4" />

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">
                  {await tServer("Profile views")}
                </span>
                <span className="text-navy font-medium">
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
                <span className="text-navy font-medium">
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
                <span className="text-navy font-medium">
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
                className="block border border-line hover:border-navy text-ink hover:text-navy text-center py-2.5 text-sm transition-colors"
              >
                {await tServer("Edit profile")}
              </Link>
            </div>
          </div>
        </aside>

        {/* CENTER — the merged feed */}
        <section className="lg:col-span-6 space-y-4">
          {profile?.onboarded && <PostComposer />}

          <RealtimeRefresh
            table="forum_posts"
            currentUserId={user.id}
            senderColumn="author_id"
            kind="posts"
          />

          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.25em] text-gold">
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

          <PostFeed
            items={feed}
            locale={locale}
            emptyMessage={await tServer("No posts yet — be the first.")}
          />
        </section>

        {/* RIGHT — new founders */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 self-start">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-[0.25em] text-gold">
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
            <div className="bg-white border border-line p-6 text-center">
              <p className="text-sm text-ink-muted">
                {await tServer("You're the first. Invite a friend.")}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-line divide-y divide-line">
              {newFounders.map((f) => {
                const href = `/profile/${(f.slug as string | undefined) ?? f.id}`;
                const ageMs =
                  Date.now() - new Date(f.created_at as string).getTime();
                const fresh = ageMs < 7 * 86400_000;
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
                        <div className="text-sm text-navy font-medium truncate group-hover:text-gold transition-colors">
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
                            <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
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
