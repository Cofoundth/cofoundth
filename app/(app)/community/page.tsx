import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

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
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default async function CommunityPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isTH = locale === "th";
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  // Posts feed (may fail gracefully if forum table not yet migrated)
  const { data: posts, error } = await supabase
    .from("forum_posts")
    .select("id, author_id, title, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const authorIds = Array.from(
    new Set((posts ?? []).map((p) => p.author_id as string)),
  );
  const postIds = (posts ?? []).map((p) => p.id as string);

  const [
    { data: authors },
    { data: likes },
    { data: comments },
    { count: postsThisWeek },
  ] = await Promise.all([
    authorIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, photo_url, i_am, slug")
          .in("id", authorIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("forum_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase
          .from("forum_comments")
          .select("post_id")
          .in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);
  const authorMap = new Map((authors ?? []).map((a) => [a.id as string, a]));

  // Tally counts per post
  const likeCount = new Map<string, number>();
  (likes ?? []).forEach((l) => {
    const k = l.post_id as string;
    likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
  });
  const commentCount = new Map<string, number>();
  (comments ?? []).forEach((c) => {
    const k = c.post_id as string;
    commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
  });

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            {await tServer("The community")}
            {(postsThisWeek ?? 0) > 0 && (
              <>
                <span className="text-line">·</span>
                <span className="normal-case tracking-normal text-ink-muted">
                  {postsThisWeek}{" "}
                  {isTH ? "โพสต์ใหม่ 7 วัน" : "new posts in 7d"}
                </span>
              </>
            )}
          </div>
          <h1 className="text-4xl lg:text-5xl mb-2">
            {await tServer("Community")}
          </h1>
          <p className="text-ink">
            {await tServer("Ask, share, and learn from other Thai founders.")}
          </p>
        </div>
        <Link
          href="/community/new"
          className="px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> {await tServer("New post")}
        </Link>
      </div>

      {error?.message?.includes("forum_posts") ? (
        <div className="bg-white border border-gold/40 p-8 text-center">
          <h3 className="text-2xl mb-3">Forum is being prepared</h3>
          <p className="text-sm text-ink leading-relaxed max-w-md mx-auto">
            The community table hasn&rsquo;t been applied yet. Apply{" "}
            <code className="text-navy">
              supabase/migrations/0002_community_forum.sql
            </code>{" "}
            in your Supabase SQL Editor to enable this page.
          </p>
        </div>
      ) : !posts?.length ? (
        <div className="bg-white border border-line p-12 text-center">
          <h3 className="text-2xl mb-2">{await tServer("Nothing here yet")}</h3>
          <p className="text-ink-muted leading-relaxed max-w-md mx-auto mb-6">
            {await tServer(
              "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
            )}
          </p>
          <Link
            href="/community/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            {await tServer("Write the first post")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const author = authorMap.get(p.author_id as string);
            const ageMs =
              Date.now() - new Date(p.created_at as string).getTime();
            const fresh = ageMs < 24 * 3600_000;
            const commentN = commentCount.get(p.id as string) ?? 0;
            const likeN = likeCount.get(p.id as string) ?? 0;
            return (
              <Link
                key={p.id as string}
                href={`/community/${p.id}`}
                className={`block bg-white border p-6 transition-colors group ${
                  fresh
                    ? "border-gold/40 hover:border-gold"
                    : "border-line hover:border-navy"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    name={author?.full_name as string}
                    url={author?.photo_url as string | null}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-serif text-xl text-navy leading-tight group-hover:text-gold transition-colors">
                        {p.title as string}
                      </h3>
                      {fresh && (
                        <span className="text-[9px] uppercase tracking-[0.15em] text-gold border border-gold px-1.5 py-0.5 shrink-0">
                          {isTH ? "ใหม่" : "new"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink leading-relaxed mb-3 line-clamp-2">
                      {p.content as string}
                    </p>
                    <div className="text-xs text-ink-muted flex items-center gap-4 flex-wrap">
                      <span>
                        {(author?.full_name as string) ?? "A founder"}
                        {" · "}
                        {timeAgo(p.created_at as string, locale)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          likeN > 0 ? "text-navy" : ""
                        }`}
                      >
                        <Heart
                          className="w-3.5 h-3.5"
                          strokeWidth={1.5}
                          fill={likeN > 0 ? "currentColor" : "none"}
                        />
                        {likeN}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          commentN > 0 ? "text-navy font-medium" : ""
                        }`}
                      >
                        <MessageCircle
                          className="w-3.5 h-3.5"
                          strokeWidth={1.5}
                        />
                        {commentN}{" "}
                        {commentN > 0 &&
                          (isTH
                            ? commentN === 1
                              ? "ความคิดเห็น"
                              : "ความคิดเห็น"
                            : commentN === 1
                              ? "reply"
                              : "replies")}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
