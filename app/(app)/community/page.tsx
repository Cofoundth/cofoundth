import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tServer, getLocale } from "@/lib/i18n-server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PostComposer } from "@/components/PostComposer";
import { SearchablePostFeed } from "@/components/SearchablePostFeed";
import {
  Card,
  EmptyState,
  LinkButton,
  Section,
  SectionHeading,
} from "@/components/ui";
import { getFeedPosts } from "@/lib/posts";
import { getAccountRole } from "@/lib/account";
import { canComment, canPostThread } from "@/lib/roles";
import { getBlockedIds } from "@/lib/blocking";
import { timeAgo, nowISO, msAheadISO, DAY_MS } from "@/lib/time";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

/**
 * How many joins the "What's happening" ticker lists. From lg it is a sticky
 * column as tall as the screen allows (see the aside below), so it lists
 * enough to fill one; a phone shows the first PHONE_TICKER_JOINS, under the
 * feed.
 */
const TICKER_JOINS = 20;
const PHONE_TICKER_JOINS = 5;

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

  // Blocked pairs first: the feed needs the set, not just the ticker. A
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

  // ---- "What's happening" — the reference app's activity ticker -----------
  // Auto-generated events beside the feed: who joined lately (the public
  // directory's own row filters — only 'founder' rows are a directory entry, so
  // bot/seed rows, investors and explorers never surface here) and how many
  // meetups are coming up this week. Social proof that writes itself.
  const weekAhead = msAheadISO(7 * DAY_MS);
  const [{ data: recentJoinsRaw }, { count: weekMeetups }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, slug, full_name, photo_url, created_at")
        .eq("profile_complete", true)
        .eq("suspended", false)
        .eq("account_type", "founder")
        .not("is_bot", "is", true)
        .order("created_at", { ascending: false })
        .limit(TICKER_JOINS + 8),
      supabase
        .from("meetups")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("visibility", "public")
        .gte("starts_at", nowISO())
        .lte("starts_at", weekAhead),
    ]);
  // Over-fetch by 8, filter blocked pairs, keep TICKER_JOINS — the ticker
  // never goes short just because the viewer blocked someone recent.
  const recentJoins = (recentJoinsRaw ?? [])
    .filter((p) => !blocked.has(p.id as string))
    .slice(0, TICKER_JOINS);

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

      {/* Feed beside the ticker — a 5/4 split, measured off the reference
          app's home. min-w-0 on both: grid items
          refuse to shrink below their content without it. */}
      <div className="grid lg:grid-cols-9 gap-8 lg:items-start">
        <div className="lg:col-span-5 min-w-0">
      <SearchablePostFeed
        items={feed}
        locale={locale}
        canLoadMore={feed.length >= 50}
        initialQuery={q ?? ""}
        canComment={mayComment}
        composer={mayPost ? <PostComposer /> : null}
        emptyState={
          <EmptyState
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
        </div>

        {/* RIGHT — the ticker. Row anatomy matched to theirs: 40px avatar,
            "Name joined" with the age beneath, chevron. Every row is real
            data; nothing here is seeded copy.

            AS TALL AS THE SCREEN ALLOWS (the owner's call, 2026-11-13: a
            sticky column holding a five-row card left the rest of it empty
            while the feed scrolled). From lg the aside is capped at the
            viewport below its sticky top (6rem) less 2rem of air, the heading
            keeps its height, and the card takes the rest: as tall as its rows,
            scrolling inside once they outrun the screen. min-h-0 is what lets
            a flex child shrink below its content so overflow can scroll.
            NO VISIBLE SCROLLBAR, on purpose (2026-11-13): the classic Windows
            scrollbar (track + arrows) drew INSIDE the 24px-radius card and was
            clipped by its corners, which read as broken. The row cut off at
            the card's bottom edge is the cue that it scrolls; the wheel, touch
            and Tab all still scroll it. No overscroll-contain either, so at
            either end of the list the wheel hands over to the page.
            This week's meetups lead, being the one forward-looking row; a
            phone, where the ticker sits under the whole feed, gets the first
            PHONE_TICKER_JOINS joins only. */}
        <aside className="lg:col-span-4 min-w-0 self-start lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-8rem)] lg:flex-col">
          <SectionHeading title={tTicker} />
          <Card
            padding="none"
            className="px-4 py-1 divide-y divide-line lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-width:none]"
          >
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
            {(recentJoins ?? []).map((p, i) => (
              <Link
                key={p.id as string}
                href={`/profile/${(p.slug as string | null) ?? (p.id as string)}`}
                className={`w-full items-center gap-3 py-3 group ${
                  i < PHONE_TICKER_JOINS ? "flex" : "hidden lg:flex"
                }`}
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
          </Card>
        </aside>
      </div>
    </Section>
  );
}
