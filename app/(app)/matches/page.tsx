import Link from "next/link";
import { ArrowRight, MessageCircle, Inbox, Send, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { tServer, getLocale } from "@/lib/i18n-server";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";

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

// "Connections" — the whole relationship funnel in one place:
//   pending interest (sent / received)  →  match  →  conversation
// Replaces the old separate /interests and /matches pages.
export default async function ConnectionsPage() {
  const supabase = await createClient();
  const user = await requireUser();
  const locale = await getLocale();

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

  const roleLine = (p: ReturnType<typeof profiles.get>) =>
    ((p?.i_am as string[] | null) ?? []).map((r) => ROLE_LABELS[r]).join(" · ");
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

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          {await tServer("Your founders")}
        </div>
        <h1 className="text-4xl lg:text-5xl mb-2">
          {await tServer("Connections")}
        </h1>
        <p className="text-ink">
          {await tServer(
            "Interest, matches, and conversations — all in one place.",
          )}
        </p>
      </div>

      {/* ---- Requests (pending interest) ---- */}
      {hasRequests && (
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
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
              <div className="bg-white border border-line divide-y divide-line">
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
                        <div className="font-serif text-lg text-navy group-hover:text-gold transition-colors">
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
              <div className="bg-white border border-line divide-y divide-line">
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
                        <div className="text-sm text-navy font-medium group-hover:text-gold transition-colors">
                          {displayName(p)}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {roleLine(p) || "—"}
                        </div>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.15em] text-ink-muted inline-flex items-center gap-1 shrink-0">
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
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gold">
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
          <div className="bg-white border border-line p-12 text-center">
            <h3 className="text-2xl mb-2">
              {await tServer("No matches yet")}
            </h3>
            <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
              {await tServer(
                "Mutual interest creates a match. Browse the directory, express interest in founders whose profiles align, and matches will appear here when they reciprocate.",
              )}
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
            >
              {await tServer("Open directory")}{" "}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
                  className="block bg-white border border-line hover:border-navy transition-colors p-5 group"
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
                            <span className="text-[10px] uppercase tracking-[0.2em] bg-gold text-white px-2 py-0.5">
                              {msg.unread} {newLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-xs text-ink-muted mb-2">
                        {roleLine(p)}
                        {((p?.intent as string[] | null) ?? []).length > 0 && (
                          <>
                            {" "}
                            &middot;{" "}
                            <span className="text-gold">
                              {((p?.intent as string[] | null) ?? [])
                                .map((x) => INTENT_LABELS[x])
                                .join(" · ")}
                            </span>
                          </>
                        )}
                        {p?.location && <> &middot; {p.location as string}</>}
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
  );
}
