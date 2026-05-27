import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function timeOfDayGreeting(): string {
  const bangkokHour = new Date().toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  const h = parseInt(bangkokHour, 10);
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Burning the midnight oil";
}

function timeAgo(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (locale === "th") {
    if (m < 1) return "เมื่อสักครู่";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    if (d < 7) return `${d} วันที่แล้ว`;
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarded, i_am, intent, slug")
    .eq("id", user!.id)
    .single();
  const myProfileHref = `/profile/${(profile?.slug as string | undefined) ?? user!.id}`;

  // ---- Platform-wide activity (the heartbeat) ----------------------
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [
    { data: recentPosts },
    { data: newFounders },
    { count: totalFounders },
    { count: postsThisWeek },
    { count: foundersThisWeek },
  ] = await Promise.all([
    supabase
      .from("forum_posts")
      .select("id, author_id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, i_am, intent, slug, created_at")
      .eq("onboarded", true)
      .neq("id", user!.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarded", true),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarded", true)
      .gte("created_at", sevenDaysAgo),
  ]);

  // Hydrate post authors
  const postAuthorIds = Array.from(
    new Set((recentPosts ?? []).map((p) => p.author_id as string)),
  );
  const { data: postAuthors } = postAuthorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url, slug")
        .in("id", postAuthorIds)
    : { data: [] };
  const authorMap = new Map(
    (postAuthors ?? []).map((a) => [a.id as string, a]),
  );

  // Comment counts for those posts
  const postIds = (recentPosts ?? []).map((p) => p.id as string);
  const { data: commentRows } = postIds.length
    ? await supabase
        .from("forum_comments")
        .select("post_id")
        .in("post_id", postIds)
    : { data: [] };
  const commentCount = new Map<string, number>();
  (commentRows ?? []).forEach((c) => {
    const k = c.post_id as string;
    commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
  });
  const { data: likeRows } = postIds.length
    ? await supabase
        .from("forum_likes")
        .select("post_id")
        .in("post_id", postIds)
    : { data: [] };
  const likeCount = new Map<string, number>();
  (likeRows ?? []).forEach((l) => {
    const k = l.post_id as string;
    likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
  });

  // ---- Personal stats (still computed, surfaced subtly) -------------
  const [
    { count: pendingReceivedCount },
    { count: matchesCount },
  ] = await Promise.all([
    supabase
      .from("interests")
      .select("id", { count: "exact", head: true })
      .eq("to_profile_id", user!.id)
      .eq("status", "pending"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`profile_a_id.eq.${user!.id},profile_b_id.eq.${user!.id}`),
  ]);

  const firstName =
    profile?.full_name?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "founder";

  const locale = (await import("@/lib/i18n-server").then((m) =>
    m.getLocale(),
  )) as "en" | "th";
  const isTH = locale === "th";

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Greeting + live pulse */}
      <div className="mb-10 pb-6 border-b border-line flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
            {await tServer(timeOfDayGreeting())}
          </div>
          <h1 className="text-3xl lg:text-4xl leading-tight">
            {await tServer("Hello,")}{" "}
            <span className="text-navy">{firstName}</span>.
          </h1>
        </div>

        {/* Pulse stats — community heartbeat */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-ink-muted">
              {totalFounders ?? 0} {isTH ? "founder" : "founders"}
            </span>
          </div>
          <div className="text-ink-muted">
            +{foundersThisWeek ?? 0}{" "}
            {isTH ? "ใหม่สัปดาห์นี้" : "this week"}
          </div>
          <div className="text-ink-muted">
            {postsThisWeek ?? 0}{" "}
            {isTH ? "โพสต์ 7 วัน" : "posts in 7d"}
          </div>
        </div>
      </div>

      {/* Onboarding prompt — only if not onboarded */}
      {!profile?.onboarded && (
        <div className="bg-white border border-gold/40 p-6 lg:p-8 mb-8">
          <div className="flex items-start gap-5">
            <div className="font-serif text-2xl text-gold leading-none mt-1">
              I
            </div>
            <div className="flex-1">
              <h2 className="text-xl mb-2">
                {await tServer("Finish your founder profile")}
              </h2>
              <p className="text-sm text-ink leading-relaxed mb-4 max-w-2xl">
                {await tServer(
                  "Declare what you are, what you bring, and what you’re looking for. The more your profile says, the better the matches.",
                )}
              </p>
              <Link
                href="/onboarding"
                className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2"
              >
                {await tServer("Start onboarding")}{" "}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Personal mini-alerts (only when there's something) */}
      {((pendingReceivedCount ?? 0) > 0 || (matchesCount ?? 0) > 0) && (
        <div className="mb-8 flex flex-wrap gap-3">
          {(pendingReceivedCount ?? 0) > 0 && (
            <Link
              href="/interests"
              className="inline-flex items-center gap-3 bg-gold/10 border border-gold/40 px-4 py-3 hover:bg-gold/20 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-gold" strokeWidth={1.5} />
              <span className="text-sm">
                <strong className="text-navy">{pendingReceivedCount}</strong>{" "}
                {isTH ? "founder สนใจคุณ" : "founder(s) interested in you"}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-navy" />
            </Link>
          )}
          {(matchesCount ?? 0) > 0 && (
            <Link
              href="/matches"
              className="inline-flex items-center gap-3 bg-cream border border-line px-4 py-3 hover:border-navy transition-colors"
            >
              <span className="text-sm">
                <strong className="text-navy">{matchesCount}</strong>{" "}
                {isTH ? "แมตช์ — สานต่อการสนทนา" : "match(es) — keep the conversations going"}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-navy" />
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent in community — primary column */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-[0.25em] text-gold">
              {isTH ? "ในชุมชน · ล่าสุด" : "Live in the community"}
            </h2>
            <Link
              href="/community"
              className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
            >
              {isTH ? "ดูทั้งหมด" : "See all"}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!recentPosts?.length ? (
            <div className="bg-white border border-line p-8 text-center">
              <p className="text-sm text-ink-muted mb-4">
                {isTH
                  ? "ยังไม่มีโพสต์ในชุมชน เริ่มต้นบทสนทนาแรกได้เลย"
                  : "No conversations yet. Start the first one."}
              </p>
              <Link
                href="/community/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm"
              >
                {isTH ? "เขียนโพสต์แรก" : "Write the first post"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-line divide-y divide-line">
              {recentPosts.map((p) => {
                const author = authorMap.get(p.author_id as string);
                const authorHref = `/profile/${(author?.slug as string | undefined) ?? p.author_id}`;
                const fresh =
                  Date.now() - new Date(p.created_at as string).getTime() <
                  24 * 3600_000;
                return (
                  <div key={p.id as string} className="p-5">
                    <div className="flex items-start gap-3">
                      <Link href={authorHref} className="shrink-0">
                        <Avatar
                          name={author?.full_name as string}
                          url={author?.photo_url as string | null}
                          size="sm"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ink-muted mb-1 flex items-center gap-2">
                          <Link
                            href={authorHref}
                            className="text-navy hover:text-gold font-medium"
                          >
                            {(author?.full_name as string) ?? "A founder"}
                          </Link>
                          <span>·</span>
                          <span>
                            {timeAgo(p.created_at as string, locale)}
                          </span>
                          {fresh && (
                            <span className="text-[9px] uppercase tracking-[0.15em] text-gold border border-gold px-1.5 py-0.5">
                              {isTH ? "ใหม่" : "new"}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/community/${p.id}`}
                          className="block group"
                        >
                          <h3 className="font-serif text-lg text-navy leading-tight group-hover:text-gold transition-colors">
                            {p.title as string}
                          </h3>
                        </Link>
                        <div className="mt-2 flex items-center gap-4 text-xs text-ink-muted">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3" strokeWidth={1.5} />
                            {likeCount.get(p.id as string) ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle
                              className="w-3 h-3"
                              strokeWidth={1.5}
                            />
                            {commentCount.get(p.id as string) ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* New founders sidebar */}
        <aside>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-[0.25em] text-gold">
              {isTH ? "Founder ใหม่" : "New founders"}
            </h2>
            <Link
              href="/browse"
              className="text-xs text-ink-muted hover:text-navy inline-flex items-center gap-1"
            >
              {isTH ? "สำรวจ" : "Browse"}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!newFounders?.length ? (
            <div className="bg-white border border-line p-6 text-center">
              <p className="text-sm text-ink-muted">
                {isTH
                  ? "คุณเป็นคนแรก ชวนเพื่อนมาสมัครกัน"
                  : "You're the first. Invite a friend."}
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
                          {(f.i_am as string) ?? "—"}
                          {f.intent ? ` · ${f.intent}` : ""}
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

          <Link
            href="/community/new"
            className="mt-6 block bg-navy hover:bg-navy-dark text-white text-sm text-center py-3 transition-colors"
          >
            {isTH ? "+ เริ่มบทสนทนาใหม่" : "+ Start a conversation"}
          </Link>

          <Link
            href={myProfileHref}
            className="mt-2 block border border-line hover:border-navy text-ink hover:text-navy text-sm text-center py-3 transition-colors"
          >
            {isTH ? "ดูโปรไฟล์ของคุณ" : "View your profile"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
