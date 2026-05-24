import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { tServer } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // All my matches
  const { data: matches } = await supabase
    .from("matches")
    .select("id, profile_a_id, profile_b_id, created_at")
    .or(`profile_a_id.eq.${user!.id},profile_b_id.eq.${user!.id}`)
    .order("created_at", { ascending: false });

  // Resolve "other party" IDs and fetch profiles
  const otherIds = (matches ?? []).map((m) =>
    m.profile_a_id === user!.id
      ? (m.profile_b_id as string)
      : (m.profile_a_id as string),
  );

  const { data: profilesData } = otherIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id, full_name, i_am, intent, location, photo_url, type, company_name",
        )
        .in("id", otherIds)
    : { data: [] };

  const profiles = new Map(
    (profilesData ?? []).map((p) => [p.id as string, p]),
  );

  // Get last message + unread count per match
  const messagesByMatch = new Map<
    string,
    {
      last_content: string | null;
      last_at: string | null;
      unread: number;
    }
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
        unread: msgs.filter(
          (m) => m.sender_id !== user!.id && !m.read_at,
        ).length,
      });
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          {await tServer("Mutual interest")}
        </div>
        <h1 className="text-4xl lg:text-5xl mb-2">{await tServer("Matches")}</h1>
        <p className="text-ink">
          {matches?.length ?? 0}{" "}
          {await tServer("match(es) so far · messaging is unlocked.")}
        </p>
      </div>

      {!matches?.length ? (
        <div className="bg-white border border-line p-12 text-center">
          <h3 className="text-2xl mb-2">{await tServer("No matches yet")}</h3>
          <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
            {await tServer(
              "Mutual interest creates a match. Browse the directory, express interest in founders whose profiles align, and matches will appear here when they reciprocate.",
            )}
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            {await tServer("Open directory")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const otherId =
              m.profile_a_id === user!.id
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
                      <div className="font-serif text-xl text-navy">
                        {p?.type === "company" && p?.company_name
                          ? (p.company_name as string)
                          : (p?.full_name as string)}
                      </div>
                      {msg?.unread ? (
                        <span className="text-[10px] uppercase tracking-[0.2em] bg-gold text-white px-2 py-0.5 shrink-0">
                          {msg.unread} new
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-ink-muted mb-2">
                      {p?.i_am && ROLE_LABELS[p.i_am as string]}
                      {p?.intent && (
                        <>
                          {" "}
                          &middot;{" "}
                          <span className="text-gold">
                            {INTENT_LABELS[p.intent as string]}
                          </span>
                        </>
                      )}
                      {p?.location && (
                        <>
                          {" "}
                          &middot; {p.location as string}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-ink truncate">
                      {msg?.last_content ?? (
                        <span className="text-ink-muted italic">
                          Mutual interest! Start the conversation.
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
    </div>
  );
}
