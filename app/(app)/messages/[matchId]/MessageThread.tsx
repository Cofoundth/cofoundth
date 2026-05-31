"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead } from "./actions";

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
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Merge server-provided messages (from revalidation after a send or
  // read-receipt) into local state without dropping realtime-delivered ones.
  useEffect(() => {
    setMessages((prev) => mergeById(prev, initialMessages));
  }, [initialMessages]);

  // Realtime: append new INSERTs for this conversation. RLS scopes the stream
  // to conversation participants — so the WebSocket must carry the user's
  // access token (setAuth) BEFORE subscribing, or it connects as anon and RLS
  // silently delivers nothing.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`messages:${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const m = payload.new as Msg;
            setMessages((prev) => mergeById(prev, [m]));
            // Live-incoming message from the other party → clear unread badge.
            if (m.sender_id !== currentUserId) {
              void markConversationRead(matchId);
            }
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[realtime messages] channel status:", status);
          }
        });
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
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
                {m.content}
              </p>
              <div
                className={`text-[10px] mt-1.5 ${
                  mine ? "text-white/60" : "text-ink-muted"
                }`}
              >
                {new Date(m.created_at).toLocaleString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </>
  );
}
