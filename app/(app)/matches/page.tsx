import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Inbox,
  Send,
  Clock,
  Building2,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { FEATURES } from "@/lib/features";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { tServer, getLocale } from "@/lib/i18n-server";
import { MEETUP_CATEGORIES } from "@/lib/meetups";
import { provinceLabel } from "@/lib/provinces";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import {
  Card,
  EmptyState,
  LinkButton,
  Section,
  SectionHeading,
  Tabs,
  cardClasses,
} from "@/components/ui";
import { getBlockedIds } from "@/lib/blocking";
import { declineInterestAction } from "./actions";

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
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

type CompanyConvo = {
  connectionId: string;
  name: string;
  slug: string;
  logo_url: string | null;
  last_content: string | null;
  last_at: string | null;
};

// "Connections" — the relationship funnel in one place. Two tabs:
//   Personal — co-founder interest → match → conversation
//   Company  — chats with companies your company is connected to
export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser();
  const locale = await getLocale();

  // Does the viewer belong to a company? Decides whether the Company tab shows.
  const { data: myMemberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);
  const myOrgIds = (myMemberships ?? []).map((m) => m.org_id as string);
  // The flag gates the TAB, not membership: while B2B is hidden for the meetups
  // soft launch, ?tab=company falls through to Personal the same way it already
  // does for a founder who belongs to no company — a quiet fallback, not a 404.
  // /orgs/<slug>/chat itself stays reachable.
  const hasCompany = FEATURES.companies && myOrgIds.length > 0;
  const tab =
    tabParam === "company" && hasCompany
      ? "company"
      : tabParam === "meetups"
        ? "meetups"
        : "personal";

  // ---- Meetup chats (the reference app's Messages > Meetups tab) --------
  // Every meetup the viewer RSVP'd to is a group chat they belong to; show
  // newest-start first with the latest chat line as the preview.
  // SEATS only (0072): a pending request is not attendance, and the chat's
  // own RLS policies gate on status = 'going' too — listing a requested
  // meetup here would open a thread the reader cannot read.
  const { data: myRsvpRows } = await supabase
    .from("meetup_rsvps")
    .select("meetup_id")
    .eq("user_id", user.id)
    .eq("status", "going");
  const myMeetupIds = (myRsvpRows ?? []).map((r) => r.meetup_id as string);
  const [{ data: myMeetupsRaw }, { data: chatRows }] = await Promise.all([
    myMeetupIds.length
      ? supabase
          .from("meetups")
          .select("id, slug, title, category, image_url, starts_at, status")
          .in("id", myMeetupIds)
          .order("starts_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    myMeetupIds.length
      ? supabase
          .from("meetup_messages")
          .select("meetup_id, content, created_at, author_id")
          .in("meetup_id", myMeetupIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const tNoChatYet = await tServer(
    "Nothing here yet — say hi to the people going.",
  );
  const lastChatBy = new Map<string, { content: string; created_at: string }>();
  for (const r of (chatRows ?? []) as {
    meetup_id: string;
    content: string;
    created_at: string;
  }[]) {
    if (!lastChatBy.has(r.meetup_id))
      lastChatBy.set(r.meetup_id, {
        content: r.content,
        created_at: r.created_at,
      });
  }

  // ---- Matches (mutual) + last message / unread -------------------------
  const [{ data: matchesRaw }, blocked] = await Promise.all([
    supabase
      .from("matches")
      .select("id, profile_a_id, profile_b_id, created_at")
      .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    getBlockedIds(user.id),
  ]);
  // A match that predates a block stays in the DB but leaves both lists —
  // same symmetric hiding as the directory.
  const matches = (matchesRaw ?? []).filter((m) => {
    const other =
      m.profile_a_id === user.id
        ? (m.profile_b_id as string)
        : (m.profile_a_id as string);
    return !blocked.has(other);
  });

  const matchOtherIds = (matches ?? []).map((m) =>
    m.profile_a_id === user.id
      ? (m.profile_b_id as string)
      : (m.profile_a_id as string),
  );

  // ---- Pending interests (the "requests" stage) -------------------------
  const [{ data: receivedRaw }, { data: sentRaw }] = await Promise.all([
    supabase
      .from("interests")
      .select("id, note, created_at, from_profile_id")
      .eq("to_profile_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("interests")
      .select("id, note, created_at, to_profile_id")
      .eq("from_profile_id", user.id)
      // 'declined' too: "Not interested" is quiet (./actions.ts), so the
      // sender's list must not change when it is used.
      .in("status", ["pending", "declined"])
      .order("created_at", { ascending: false }),
  ]);
  const received = (receivedRaw ?? []).filter(
    (r) => !blocked.has(r.from_profile_id as string),
  );
  const sent = (sentRaw ?? []).filter(
    (s) => !blocked.has(s.to_profile_id as string),
  );

  // ---- One profile fetch for everyone we need to render -----------------
  const profileIds = Array.from(
    new Set([
      ...matchOtherIds,
      ...received.map((r) => r.from_profile_id as string),
      ...sent.map((s) => s.to_profile_id as string),
    ]),
  );
  const { data: profilesData } = profileIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id, slug, full_name, i_am, intent, location, photo_url, type, company_name",
        )
        .in("id", profileIds)
    : { data: [] };
  const profiles = new Map(
    (profilesData ?? []).map((p) => [p.id as string, p]),
  );

  // ---- Last message + unread per match ----------------------------------
  // Declared here, not down with the other labels: the loop below reads it.
  const unsentLabel = await tServer("Message unsent");

  const messagesByMatch = new Map<
    string,
    { last_content: string | null; last_at: string | null; unread: number }
  >();
  if (matches?.length) {
    const matchIds = matches.map((m) => m.id as string);
    const { data: allMessages } = await supabase
      .from("messages")
      .select("match_id, content, sender_id, read_at, created_at, unsent_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });
    for (const id of matchIds) {
      const msgs = (allMessages ?? []).filter((m) => m.match_id === id);
      const last = msgs[0];
      messagesByMatch.set(id, {
        // An unsent message carries content = '' (migration 0074 empties the
        // row, it does not hide it client-side), so the preview has to say
        // what happened or the row would read as a blank conversation. Same
        // tombstone copy as the bubble.
        last_content: last
          ? last.unsent_at
            ? unsentLabel
            : (last.content as string)
          : null,
        last_at: (last?.created_at as string) ?? null,
        // An unsent message is not something to go and read: the row survives
        // so the conversation keeps its shape, but there is nothing in it any
        // more. Counting it leaves a badge that says "1 new" over a tombstone
        // and clears only when you open a thread to find the words gone.
        unread: msgs.filter(
          (m) => m.sender_id !== user.id && !m.read_at && !m.unsent_at,
        ).length,
      });
    }
  }

  // Newest conversation on top — by last message time, falling back to the
  // match-created date for matches that haven't exchanged a message yet.
  const sortedMatches = [...(matches ?? [])].sort((a, b) => {
    const aAt =
      messagesByMatch.get(a.id as string)?.last_at ?? (a.created_at as string);
    const bAt =
      messagesByMatch.get(b.id as string)?.last_at ?? (b.created_at as string);
    return new Date(bAt).getTime() - new Date(aAt).getTime();
  });

  // ---- Company conversations (B2B chat) ---------------------------------
  // org_connections / org_messages reads are RLS-scoped to the viewer's orgs.
  // Only the Company panel reads these, so the three round-trips are scoped to
  // the tab that renders them — which also means they cost nothing while the
  // tab is hidden.
  let companyConvos: CompanyConvo[] = [];
  if (tab === "company") {
    const { data: conns } = await supabase
      .from("org_connections")
      .select("id, requester_org, target_org")
      .eq("status", "accepted");
    const connList = conns ?? [];
    if (connList.length) {
      const otherOf = (c: { requester_org: string; target_org: string }) =>
        myOrgIds.includes(c.requester_org) ? c.target_org : c.requester_org;
      const otherOrgIds = connList.map((c) =>
        otherOf(c as { requester_org: string; target_org: string }),
      );
      const connIds = connList.map((c) => c.id as string);
      const [{ data: orgsData }, { data: convoMsgs }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .in("id", otherOrgIds),
        supabase
          .from("org_messages")
          .select("connection_id, body, created_at")
          .in("connection_id", connIds)
          .order("created_at", { ascending: false }),
      ]);
      const orgById = new Map((orgsData ?? []).map((o) => [o.id as string, o]));
      const lastByConn = new Map<string, { body: string; at: string }>();
      for (const m of convoMsgs ?? []) {
        const cid = m.connection_id as string;
        if (!lastByConn.has(cid)) {
          lastByConn.set(cid, {
            body: m.body as string,
            at: m.created_at as string,
          });
        }
      }
      companyConvos = connList
        .map((c) => {
          const o = orgById.get(
            otherOf(c as { requester_org: string; target_org: string }),
          );
          const last = lastByConn.get(c.id as string);
          return {
            connectionId: c.id as string,
            name: (o?.name as string) ?? "Company",
            slug: (o?.slug as string) ?? "",
            logo_url: (o?.logo_url as string | null) ?? null,
            last_content: last?.body ?? null,
            last_at: last?.at ?? null,
          };
        })
        .filter((c) => c.slug)
        .sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));
    }
  }

  const roleLine = (p: ReturnType<typeof profiles.get>) =>
    ((p?.i_am as string[] | null) ?? [])
      .map((r) => t(ROLE_LABELS[r], locale))
      .join(" · ");
  const profileHref = (p: ReturnType<typeof profiles.get>, id: string) =>
    `/profile/${(p?.slug as string | undefined) ?? id}`;
  const displayName = (p: ReturnType<typeof profiles.get>) =>
    p?.type === "company" && p?.company_name
      ? (p.company_name as string)
      : ((p?.full_name as string) ?? "A founder");

  const hasRequests = received.length > 0 || sent.length > 0;

  // Labels used inside synchronous .map() callbacks — resolved here so those
  // callbacks stay sync (await is only valid in this async function body).
  const respondLabel = await tServer("Respond");
  const notInterestedLabel = await tServer("Not interested");
  const pendingLabel = await tServer("pending");
  const newLabel = await tServer("new");
  const mutualLabel = await tServer("Mutual interest! Start the conversation.");
  const startConvoLabel = await tServer("Start the conversation");

  // The Conversations section is empty for three DIFFERENT reasons, and the
  // useful next step is different in each. Someone is waiting on you > you are
  // waiting on someone > you have not reached out at all.
  const noConvoBody =
    received.length > 0
      ? await tServer(
          "Answer the requests above. When interest is mutual, the conversation opens here.",
        )
      : sent.length > 0
        ? await tServer(
            "You've already reached out. A conversation opens here the moment someone expresses interest back.",
          )
        : await tServer(
            "Mutual interest creates a match. Browse the directory, express interest in founders whose profiles align, and matches will appear here when they reciprocate.",
          );
  const openDirectoryLabel = await tServer("Open directory");


  const tabItems = [
    { key: "personal", href: "/matches", label: await tServer("Personal") },
    ...(hasCompany
      ? [
          {
            key: "company",
            href: "/matches?tab=company",
            label: await tServer("Company"),
          },
        ]
      : []),
    {
      key: "meetups",
      href: "/matches?tab=meetups",
      label: await tServer("Meetups"),
    },
  ];

  return (
    <Section>
      <div className="max-w-[640px] mb-8">
        <h1 className="text-d2">{await tServer("Connections")}</h1>
      </div>

      <Tabs
        value={tab}
        items={tabItems}
        className="mb-8"
        aria-label={await tServer("Connections")}
      />

      {tab === "meetups" ? (
        <section>
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {await tServer("Meetup chats")}
          </h2>
          {(myMeetupsRaw ?? []).length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={await tServer("No meetup chats yet")}
              description={await tServer(
                "Join a meetup and its attendee chat shows up here.",
              )}
              action={
                <LinkButton href="/meetups">
                  {await tServer("Meetups")}
                </LinkButton>
              }
            />
          ) : (
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              {(myMeetupsRaw ?? []).map((mt) => {
                const last = lastChatBy.get(mt.id as string);
                const cat =
                  MEETUP_CATEGORIES[
                    mt.category as keyof typeof MEETUP_CATEGORIES
                  ] ?? MEETUP_CATEGORIES.other;
                return (
                  <Link
                    key={mt.id as string}
                    href={`/meetups/${mt.slug as string}#chat`}
                    className="flex items-center gap-3 p-4 hover:bg-cream transition-colors group"
                  >
                    <span className="w-10 h-10 rounded-full bg-gold-soft grid place-items-center text-lg shrink-0">
                      {cat.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-navy truncate group-hover:text-gold-ink transition-colors">
                        {mt.title as string}
                      </span>
                      <span className="block text-xs text-ink-muted truncate mt-0.5">
                        {last ? last.content : tNoChatYet}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {timeAgo(
                        last?.created_at ?? (mt.starts_at as string),
                        locale,
                      )}
                    </span>
                  </Link>
                );
              })}
            </Card>
          )}
        </section>
      ) : tab === "company" ? (
        <section>
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {await tServer("Company conversations")}
          </h2>
          {companyConvos.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={await tServer("No company chats yet")}
              description={await tServer(
                "Connect with a company, then chat to align before proposing a deal.",
              )}
              action={
                <LinkButton href="/orgs">
                  {await tServer("Browse companies")}
                  <ArrowRight className="w-4 h-4" />
                </LinkButton>
              }
            />
          ) : (
            <div className="space-y-3">
              {companyConvos.map((c) => (
                <Link
                  key={c.connectionId}
                  href={`/orgs/${c.slug}/chat`}
                  className={cardClasses({
                    padding: "sm",
                    hoverable: true,
                    className: "block group",
                  })}
                >
                  <div className="flex items-start gap-4">
                    {c.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.logo_url}
                        alt={c.name}
                        className="w-12 h-12 object-cover border border-line shrink-0 rounded-xl"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center shrink-0 rounded-xl">
                        <Building2 className="w-5 h-5 text-ink-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="font-serif text-xl text-navy truncate min-w-0">
                          {c.name}
                        </div>
                        {c.last_at && (
                          <span className="text-xs text-ink-muted shrink-0">
                            {timeAgo(c.last_at, locale)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink truncate">
                        {c.last_content ?? (
                          <span className="text-ink-muted italic">
                            {startConvoLabel}
                          </span>
                        )}
                      </p>
                    </div>
                    <MessageCircle className="w-5 h-5 text-ink-muted group-hover:text-navy mt-1 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        // ONE column, the page's full width (the owner's call, 2026-11-13).
        // The "Founders you should meet" aside is gone: the directory is one
        // click away in the rail, and the requests and conversations are what
        // this page is for.
        <div>
          <div>
            {/* ---- Requests (pending interest) ---- */}
            {hasRequests && (
              <section className="mb-14">
                <h2 className="text-lg font-bold tracking-normal mb-5">
                  {await tServer("Requests")}
                </h2>

                {received.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-ink-muted mb-3">
                      <Inbox className="w-4 h-4" strokeWidth={1.5} />
                      {(
                        await tServer(
                          "{n} interested in you — open their profile to respond",
                        )
                      ).replace("{n}", String(received.length))}
                    </div>
                    <Card
                      padding="none"
                      className="divide-y divide-line overflow-hidden"
                    >
                      {received.map((r) => {
                        const p = profiles.get(r.from_profile_id as string);
                        const href = profileHref(p, r.from_profile_id as string);
                        // Two answers, so the row is no longer one link: the
                        // profile (where Respond leads) and "Not interested"
                        // (./actions.ts, quiet) sit side by side, and a form
                        // cannot nest inside an <a>.
                        return (
                          <div
                            key={r.id as string}
                            className="flex items-start gap-4 p-5 hover:bg-cream transition-colors"
                          >
                            <Link
                              href={href}
                              className="flex min-w-0 flex-1 items-start gap-4 group"
                            >
                              <Avatar
                                name={p?.full_name as string}
                                url={p?.photo_url as string | null}
                                size="md"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-serif text-lg text-navy group-hover:text-gold-ink transition-colors">
                                  {displayName(p)}
                                </div>
                                <div className="text-xs text-ink-muted">
                                  {roleLine(p) || "—"}
                                </div>
                                {r.note ? (
                                  <p className="text-sm text-ink mt-1.5 line-clamp-2">
                                    “{r.note as string}”
                                  </p>
                                ) : null}
                              </div>
                            </Link>
                            <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
                              <Link
                                href={href}
                                tabIndex={-1}
                                aria-hidden="true"
                                className="text-xs text-navy inline-flex items-center gap-1"
                              >
                                {respondLabel}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                              <form
                                action={declineInterestAction.bind(
                                  null,
                                  r.id as string,
                                )}
                              >
                                <button
                                  type="submit"
                                  className="text-xs text-ink-muted transition-colors hover:text-navy"
                                >
                                  {notInterestedLabel}
                                </button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                )}

                {sent.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-ink-muted mb-3">
                      <Send className="w-4 h-4" strokeWidth={1.5} />
                      {(await tServer("Waiting to hear back ({n})")).replace(
                        "{n}",
                        String(sent.length),
                      )}
                    </div>
                    <Card
                      padding="none"
                      className="divide-y divide-line overflow-hidden"
                    >
                      {sent.map((s) => {
                        const p = profiles.get(s.to_profile_id as string);
                        return (
                          <Link
                            key={s.id as string}
                            href={profileHref(p, s.to_profile_id as string)}
                            className="flex items-center gap-4 p-4 hover:bg-cream transition-colors group"
                          >
                            <Avatar
                              name={p?.full_name as string}
                              url={p?.photo_url as string | null}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-navy font-medium group-hover:text-gold-ink transition-colors">
                                {displayName(p)}
                              </div>
                              <div className="text-xs text-ink-muted">
                                {roleLine(p) || "—"}
                              </div>
                            </div>
                            <span className="text-xs uppercase tracking-[0.15em] text-ink-muted inline-flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" /> {pendingLabel}
                            </span>
                          </Link>
                        );
                      })}
                    </Card>
                  </div>
                )}
              </section>
            )}

            {/* ---- Conversations (matches) ---- */}
            <section>
              {/* `meta` is what switches the row to items-baseline. The row
                  also gains gap-3, which only shows if the count ever grows
                  long enough to touch the heading. */}
              <SectionHeading
                title={await tServer("Conversations")}
                meta={
                  (matches?.length ?? 0) > 0 ? (
                    <span className="text-xs text-ink-muted">
                      {matches?.length}{" "}
                      {await tServer("match(es) · messaging unlocked")}
                    </span>
                  ) : undefined
                }
              />

              {!matches?.length ? (
                <EmptyState
                  icon={MessageCircle}
                  title={await tServer("No conversations yet")}
                  description={noConvoBody}
                  // No CTA while someone is waiting on YOU — the requests list is
                  // directly above, and a button pointing elsewhere fights it.
                  action={
                    received.length > 0 ? undefined : (
                      <LinkButton href="/browse">
                        {openDirectoryLabel} <ArrowRight className="w-4 h-4" />
                      </LinkButton>
                    )
                  }
                />
              ) : (
                <div className="space-y-3">
                  {sortedMatches.map((m) => {
                    const otherId =
                      m.profile_a_id === user.id
                        ? (m.profile_b_id as string)
                        : (m.profile_a_id as string);
                    const p = profiles.get(otherId);
                    const msg = messagesByMatch.get(m.id as string);
                    return (
                      <Link
                        key={m.id as string}
                        href={`/messages/${m.id}`}
                        className={cardClasses({
                          padding: "sm",
                          hoverable: true,
                          className: "block group",
                        })}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar
                            name={p?.full_name as string}
                            url={p?.photo_url as string | null}
                            size="lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div className="font-serif text-xl text-navy truncate min-w-0">
                                {displayName(p)}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {msg?.last_at && (
                                  <span className="text-xs text-ink-muted">
                                    {timeAgo(msg.last_at, locale)}
                                  </span>
                                )}
                                {msg?.unread ? (
                                  <span className="text-xs uppercase tracking-[0.2em] bg-navy text-white px-2 py-0.5">
                                    {msg.unread} {newLabel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-xs text-ink-muted mb-2">
                              {roleLine(p)}
                              {((p?.intent as string[] | null) ?? []).length >
                                0 && (
                                <>
                                  {" "}
                                  &middot;{" "}
                                  <span className="text-gold-ink">
                                    {((p?.intent as string[] | null) ?? [])
                                      .map((x) => t(INTENT_LABELS[x], locale))
                                      .join(" · ")}
                                  </span>
                                </>
                              )}
                              {p?.location && (
                                <>
                                  {" "}
                                  &middot;{" "}
                                  {provinceLabel(p.location as string, locale)}
                                </>
                              )}
                            </div>
                            <p className="text-sm text-ink truncate">
                              {msg?.last_content ?? (
                                <span className="text-ink-muted italic">
                                  {mutualLabel}
                                </span>
                              )}
                            </p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-ink-muted group-hover:text-navy mt-1 shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </Section>
  );
}
