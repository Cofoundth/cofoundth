import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PostComposer } from "@/components/PostComposer";
import { SearchablePostFeed } from "@/components/SearchablePostFeed";
import { getFeedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [feed, { count: postsThisWeek }] = await Promise.all([
    getFeedPosts(supabase, { limit: 50, userId: user?.id }),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-8 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3 inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          {await tServer("The community")}
          {(postsThisWeek ?? 0) > 0 && (
            <>
              <span className="text-line">·</span>
              <span className="normal-case tracking-normal text-ink-muted">
                {postsThisWeek} {await tServer("new posts in 7d")}
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

      <RealtimeRefresh
        table="forum_posts"
        currentUserId={user?.id ?? ""}
        senderColumn="author_id"
        kind="posts"
      />

      {user && (
        <div className="mb-6">
          <PostComposer />
        </div>
      )}

      <SearchablePostFeed
        items={feed}
        locale={locale}
        emptyMessage={await tServer(
          "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
        )}
      />
    </div>
  );
}
