import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PostComposer } from "@/components/PostComposer";
import { SearchablePostFeed } from "@/components/SearchablePostFeed";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import { getFeedPosts } from "@/lib/posts";
import { isInvestorAccount } from "@/lib/account";
import { timeAgo, nowISO, msAheadISO, DAY_MS } from "@/lib/time";
import { Avatar } from "@/components/Avatar";

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

  // ---- "What's happening" — the reference app's activity ticker -----------
  // Auto-generated events beside the feed: who joined lately (the public
  // directory's own row filters, so bots and investors never surface) and how
  // many meetups are coming up this week. Social proof that writes itself.
  const weekAhead = msAheadISO(7 * DAY_MS);
  const [{ data: recentJoins }, { count: weekMeetups }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, slug, full_name, photo_url, created_at")
      .eq("profile_complete", true)
      .eq("suspended", false)
      .eq("account_type", "founder")
      .not("is_bot", "is", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("meetups")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("visibility", "public")
      .gte("starts_at", nowISO())
      .lte("starts_at", weekAhead),
  ]);

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
  // Resolved before the JSX: .map() is not an async context.
  const tTicker = await tServer("What's happening");
  const tJoined = await tServer("{name} joined Cofoundee");
  const tWeekMeetups = await tServer("{n} meetups this week");

  return (
    <Section>
      <div className="mb-8">
        <div className="max-w-[640px]">
          <h1 className="text-d2">
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

      {/* Feed beside the ticker — the 5/4 split the dashboard already runs,
          measured off the reference app's home. min-w-0 on both: grid items
          refuse to shrink below their content without it. */}
      <div className="grid lg:grid-cols-9 gap-8 lg:items-start">
        <div className="lg:col-span-5 min-w-0">
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
        </div>

        {/* RIGHT — the ticker. Row anatomy matched to theirs: 40px avatar,
            "Name joined" with the age beneath, chevron. Every row is real
            data; nothing here is seeded copy. */}
        <aside className="lg:col-span-4 min-w-0 lg:sticky lg:top-24 self-start">
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {tTicker}
          </h2>
          <div className="bg-white rounded-3xl shadow-xs px-4 py-1 divide-y divide-line">
            {(recentJoins ?? []).map((p) => (
              <Link
                key={p.id as string}
                href={`/profile/${(p.slug as string | null) ?? (p.id as string)}`}
                className="flex w-full items-center gap-3 py-3 group"
              >
                <Avatar
                  name={p.full_name as string}
                  url={p.photo_url as string | null}
                  size="sm"
                />
                <span className="min-w-0 flex-1 text-sm text-ink">
                  {tJoined.replace("{name}", (p.full_name as string) ?? "—")}
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {timeAgo(p.created_at as string, locale)}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-ink-muted group-hover:text-navy transition-colors" />
              </Link>
            ))}
            {(weekMeetups ?? 0) > 0 && (
              <Link
                href="/meetups"
                className="flex w-full items-center gap-3 py-3 group"
              >
                <span className="w-9 h-9 rounded-full bg-gold-soft grid place-items-center text-base shrink-0">
                  📅
                </span>
                <span className="min-w-0 flex-1 text-sm text-ink">
                  {tWeekMeetups.replace("{n}", String(weekMeetups))}
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-ink-muted group-hover:text-navy transition-colors" />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </Section>
  );
}
