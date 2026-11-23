import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PostComposer } from "@/components/PostComposer";
import { SearchablePostFeed } from "@/components/SearchablePostFeed";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import { getFeedPosts } from "@/lib/posts";
import { getAccountRole } from "@/lib/account";
import { canComment, canPostThread } from "@/lib/roles";
import { getBlockedIds } from "@/lib/blocking";

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

  // Blocked pairs first: the feed drops their posts. A
  // blocked member vanishing from the directory while their posts still lead
  // the feed is the block half-working, which is worse than not shipping it.
  const blocked = user
    ? await getBlockedIds(user.id)
    : new Set<string>();

  const feed = await getFeedPosts(supabase, {
    limit: 50,
    userId: user?.id,
    excludeAuthorIds: blocked,
  });

  // TWO flags, not one. The old single `canWrite` meant "may post AND may
  // comment", which only worked while every non-founder was refused both. An
  // explorer sits between the tiers: no thread, but yes comments — so the
  // composer has to disappear while the comment box on every card stays.
  const role = user ? await getAccountRole(supabase, user.id) : null;
  const mayPost = !!role && canPostThread(role);
  const mayComment = !!role && canComment(role);

  // KIND A — nothing exists yet, and the three readers need different endings.
  // A founder has the composer directly above, so the copy hands them easy
  // openings and no button. An explorer cannot start a thread, so "be the
  // first" is a dead end for them too — but the shelf IS full, and it is their
  // home, so point them there. An investor goes to the founder directory, the
  // one surface that is genuinely full for them.
  const emptyTitle = await tServer("No posts yet");
  let emptyBody: string;
  if (mayPost) {
    emptyBody = await tServer(
      "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
    );
  } else if (role === "explorer") {
    emptyBody = await tServer(
      "Founders post updates, questions, and launches here — and you can reply to any of them. The shelf is already full, so start there.",
    );
  } else {
    emptyBody = await tServer(
      "Founders post updates, questions, and launches here. Meet the ones already on Cofoundee while the feed fills up.",
    );
  }
  // Where the empty state sends someone who cannot post: the shelf for an
  // explorer, the founder directory for everyone else who is read-only.
  const emptyHref = role === "explorer" ? "/products" : "/founders";
  const emptyCta = await tServer(
    role === "explorer" ? "Try what the community built" : "Browse founders",
  );
  return (
    // One column of posts across the full content width (the founder's call,
    // 2026-11-18, after the "What's happening" ticker beside it was dropped).
    // Chosen over the 640 reading column knowingly: long Thai posts run to
    // long lines at this width.
    <Section>
      <h1 className="text-d2 mb-8">{await tServer("Community")}</h1>

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
        canComment={mayComment}
        composer={mayPost ? <PostComposer key="post-composer" /> : null}
        emptyState={
          <EmptyState
            key="empty-feed"
            icon={MessageCircle}
            title={emptyTitle}
            description={emptyBody}
            action={
              mayPost ? undefined : (
                <LinkButton href={emptyHref} size="sm">
                  {emptyCta}
                </LinkButton>
              )
            }
          />
        }
      />
    </Section>
  );
}
