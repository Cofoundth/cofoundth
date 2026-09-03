import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Inbox,
  Send,
  Clock,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { tServer, getLocale } from "@/lib/i18n-server";
import { provinceLabel } from "@/lib/provinces";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { EmptyState, LinkButton, Section } from "@/components/ui";

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
  const hasCompany = myOrgIds.length > 0;
  const tab = tabParam === "company" && hasCompany ? "company" : "personal";

  // ---- Matches (mutual) + last message / unread -------------------------
  const { data: matches } = await supabase
    .from("matches")
    .select("id, profile_a_id, profile_b_id, created_at")
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

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
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  const received = receivedRaw ?? [];
  const sent = sentRaw ?? [];

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
  const messagesByMatch = new Map<
    string,
    { last_content: string | null; last_at: string | null; unread: number }
  >();
  if (matches?.length) {
    const matchIds = matches.map((m) => m.id as string);
    const { data: allMessages } = await supabase
      .from("messages")
      .select("match_id, content, sender_id, read_at, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });
    for (const id of matchIds) {
      const msgs = (allMessages ?? []).filter((m) => m.match_id === id);
      messagesByMatch.set(id, {
        last_content: (msgs[0]?.content as string) ?? null,
        last_at: (msgs[0]?.created_at as string) ?? null,
        unread: msgs.filter((m) => m.sender_id !== user.id && !m.read_at)
          .length,
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
  let companyConvos: CompanyConvo[] = [];
  if (hasCompany) {
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

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
      active
        ? "border-navy text-navy font-medium"
        : "border-transparent text-ink-muted hover:text-navy"
    }`;

  return (
    <Section>
      <div className="max-w-[640px] mb-8">
        <h1 className="text-d3 mb-2">
          {await tServer("Connections")}
        </h1>
        <p className="text-ink">
          {await tServer("Your conversations — co-founders and companies.")}
        </p>
      </div>

      {hasCompany && (
        <nav className="flex items-center gap-1 mb-8 border-b border-line">
          <Link href="/matches" className={tabClass(tab === "personal")}>
            {await tServer("Personal")}
          </Link>
          <Link
            href="/matches?tab=company"
            className={tabClass(tab === "company")}
          >
            {await tServer("Company")}
          </Link>
        </nav>
      )}

      {tab === "company" ? (
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
                  className="block bg-white shadow-xs hover:shadow-sm transition-shadow p-5 group rounded-3xl"
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
        <>
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
                  <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
                    {received.map((r) => {
                      const p = profiles.get(r.from_profile_id as string);
                      return (
                        <Link
                          key={r.id as string}
                          href={profileHref(p, r.from_profile_id as string)}
                          className="flex items-start gap-4 p-5 hover:bg-cream transition-colors group"
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
                          <span className="text-xs text-navy inline-flex items-center gap-1 shrink-0 mt-1">
                            {respondLabel}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
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
                  <div className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden">
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
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ---- Conversations (matches) ---- */}
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-lg font-bold tracking-normal">
                {await tServer("Conversations")}
              </h2>
              {(matches?.length ?? 0) > 0 && (
                <span className="text-xs text-ink-muted">
                  {matches?.length}{" "}
                  {await tServer("match(es) · messaging unlocked")}
                </span>
              )}
            </div>

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
                      className="block bg-white shadow-xs hover:shadow-sm transition-shadow p-5 group rounded-3xl"
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
        </>
      )}
    </Section>
  );
}
