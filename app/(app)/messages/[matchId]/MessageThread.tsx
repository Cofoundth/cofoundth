"use client";

import { useEffect, useRef, useState } from "react";
import { LinkedText } from "@/components/LinkedText";
import { useLocale } from "@/lib/i18n-client";
import { fetchMessagesAction, markConversationRead } from "./actions";

export type Msg = {
  id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

function mergeById(a: Msg[], b: Msg[]): Msg[] {
  const map = new Map<string, Msg>();
  for (const m of a) map.set(m.id, m);
  for (const m of b) map.set(m.id, m);
  return [...map.values()].sort((x, y) =>
    x.created_at.localeCompare(y.created_at),
  );
}

export function MessageThread({
  matchId,
  currentUserId,
  initialMessages,
  emptyState,
}: {
  matchId: string;
  currentUserId: string;
  initialMessages: Msg[];
  emptyState: React.ReactNode;
}) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Merge server-provided messages (from revalidation after a send or
  // read-receipt) into local state without dropping realtime-delivered ones.
  // Done during render (not an effect) by comparing against the prop we last
  // merged, so the merge runs synchronously when `initialMessages` changes.
  const [prevInitial, setPrevInitial] = useState(initialMessages);
  if (initialMessages !== prevInitial) {
    setPrevInitial(initialMessages);
    setMessages((prev) => mergeById(prev, initialMessages));
  }

  // Live updates via a server-action poll. Auth tokens are HttpOnly, so the
  // browser has no JS-readable session — the previous browser-client realtime
  // socket AND REST poll could no longer authenticate and silently returned
  // nothing. fetchMessagesAction runs server-side (reads the HttpOnly cookie,
  // RLS-scoped to participants) every 4s while the tab is visible. mergeById
  // dedupes, so re-sending the whole list each tick is cheap and idempotent.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const rows = await fetchMessagesAction(matchId);
      if (stopped || rows.length === 0) return;
      setMessages((prev) => mergeById(prev, rows));
      if (rows.some((m) => m.sender_id !== currentUserId && !m.read_at)) {
        void markConversationRead(matchId);
      }
    };
    void tick();
    const interval = setInterval(tick, 4000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [matchId, currentUserId]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {messages.map((m) => {
        const mine = m.sender_id === currentUserId;
        return (
          <div
            key={m.id}
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
                <LinkedText text={m.content} />
              </p>
              <div
                className={`text-[10px] mt-1.5 ${
                  mine ? "text-white/60" : "text-ink-muted"
                }`}
              >
                {new Date(m.created_at).toLocaleString(
                  locale === "th" ? "th-TH" : "en-GB",
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
      })}
      <div ref={bottomRef} />
    </>
  );
}
