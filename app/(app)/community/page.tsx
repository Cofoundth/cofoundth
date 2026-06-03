import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PostComposer } from "@/components/PostComposer";
import { SearchablePostFeed } from "@/components/SearchablePostFeed";
import { getFeedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  const { q } = await searchParams;

  const feed = await getFeedPosts(supabase, { limit: 50, userId: user?.id });

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-8 pb-8 border-b border-line">
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

      <SearchablePostFeed
        items={feed}
        locale={locale}
        initialQuery={q ?? ""}
        composer={user ? <PostComposer /> : null}
        emptyMessage={await tServer(
          "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
        )}
      />
    </div>
  );
}
