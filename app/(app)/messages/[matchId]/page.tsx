import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { Avatar } from "@/components/Avatar";
import { MessageComposer } from "./MessageComposer";
import { ConversationActions } from "./ConversationActions";
import { NextStepsPanel } from "./NextStepsPanel";

type Props = { params: Promise<{ matchId: string }> };

export default async function MessagePage({ params }: Props) {
  const { matchId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: match } = await supabase
    .from("matches")
    .select("id, profile_a_id, profile_b_id, created_at")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  const otherId =
    match.profile_a_id === user!.id
      ? (match.profile_b_id as string)
      : (match.profile_a_id as string);

  const { data: other } = await supabase
    .from("profiles")
    .select("id, full_name, i_am, intent, location, photo_url, email")
    .eq("id", otherId)
    .single();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, read_at, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  const unreadFromOther = (messages ?? [])
    .filter((m) => m.sender_id !== user!.id && !m.read_at)
    .map((m) => m.id as string);
  if (unreadFromOther.length) {
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadFromOther);
  }

  const otherName = (other?.full_name as string) ?? "Founder";

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] grid lg:grid-cols-12">
      {/* Conversation column */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-0 border-r border-line">
        <header className="border-b border-line bg-white px-6 py-4">
          <Link
            href="/matches"
            className="text-xs text-ink-muted hover:text-navy mb-3 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" /> All matches
          </Link>
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/profile/${otherId}`}
              className="flex items-center gap-4 group min-w-0"
            >
              <Avatar
                name={other?.full_name as string}
                url={other?.photo_url as string | null}
                size="md"
              />
              <div className="min-w-0">
                <div className="font-serif text-xl text-navy group-hover:text-gold truncate">
                  {otherName}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {other?.i_am && ROLE_LABELS[other.i_am as string]}
                  {other?.intent && (
                    <>
                      {" "}
                      &middot;{" "}
                      <span className="text-gold">
                        {INTENT_LABELS[other.intent as string]}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
            <ConversationActions
              matchId={matchId}
              otherName={otherName}
              otherEmail={(other?.email as string | null) ?? null}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-cream px-6 py-8 space-y-4">
          {!messages?.length ? (
            <div className="text-center py-12">
              <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
                Mutual interest unlocked
              </div>
              <p className="text-ink leading-relaxed max-w-md mx-auto">
                You both expressed interest. This is the start of your
                conversation &mdash; be specific, be considered.
              </p>
              <SuggestedOpeners />
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user!.id;
              return (
                <div
                  key={m.id as string}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 ${
                      mine
                        ? "bg-navy text-white"
                        : "bg-white text-ink border border-line"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content as string}
                    </p>
                    <div
                      className={`text-[10px] mt-1.5 ${
                        mine ? "text-white/60" : "text-ink-muted"
                      }`}
                    >
                      {new Date(m.created_at as string).toLocaleString(
                        "en-GB",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <MessageComposer matchId={matchId} />
      </div>

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:col-span-4 flex-col bg-white overflow-y-auto p-6">
        <NextStepsPanel />
      </aside>
    </div>
  );
}

function SuggestedOpeners() {
  const suggestions = [
    "What problem are you most excited to solve right now?",
    "What does your ideal co-founder look like?",
    "What have you tried that didn't work?",
  ];
  return (
    <div className="mt-8 max-w-md mx-auto text-left">
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
        First-call questions
      </div>
      <ul className="space-y-2 text-sm text-ink">
        {suggestions.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-gold font-serif text-base leading-none">
              &middot;
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
