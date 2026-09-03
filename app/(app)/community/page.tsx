import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PostComposer } from "@/components/PostComposer";
import { SearchablePostFeed } from "@/components/SearchablePostFeed";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import { getFeedPosts } from "@/lib/posts";
import { isInvestorAccount } from "@/lib/account";

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

  // Investors read the founder community but don't post or comment in it.
  const canWrite = !!user && !(await isInvestorAccount(supabase, user.id));

  // KIND A — nothing exists yet, and the two readers need opposite endings.
  // A founder has the composer directly above, so the copy hands them three
  // easy openings and no button. An investor CANNOT post here (writes are
  // refused server-side, and /community/new bounces), so "be the first" would
  // be a dead end — send them to the one surface that is genuinely full today,
  // the public founder directory.
  const emptyTitle = await tServer("No posts yet");
  const emptyBody = canWrite
    ? await tServer(
        "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
      )
    : await tServer(
        "Founders post updates, questions, and launches here. Meet the ones already on Cofoundee while the feed fills up.",
      );
  const browseFoundersLabel = await tServer("Browse founders");

  return (
    <Section>
      <div className="mb-8">
        <div className="max-w-[640px]">
          <h1 className="text-d2 mb-2">
            {await tServer("Community")}
          </h1>
        </div>
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
        canLoadMore={feed.length >= 50}
        initialQuery={q ?? ""}
        canComment={canWrite}
        composer={canWrite ? <PostComposer /> : null}
        emptyState={
          <EmptyState
            icon={MessageCircle}
            title={emptyTitle}
            description={emptyBody}
            action={
              canWrite ? undefined : (
                <LinkButton href="/founders" size="sm">
                  {browseFoundersLabel}
                </LinkButton>
              )
            }
          />
        }
      />
    </Section>
  );
}
