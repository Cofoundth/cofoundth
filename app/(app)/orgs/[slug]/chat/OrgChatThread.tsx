"use client";

import { useEffect, useRef, useState } from "react";
import { LinkedText } from "@/components/LinkedText";
import { useLocale } from "@/lib/i18n-client";
import { fetchOrgMessagesAction } from "../../chat-actions";
import type { OrgMsg } from "../../chat-types";

function mergeById(a: OrgMsg[], b: OrgMsg[]): OrgMsg[] {
  const map = new Map<string, OrgMsg>();
  for (const m of a) map.set(m.id, m);
  for (const m of b) map.set(m.id, m);
  return [...map.values()].sort((x, y) =>
    x.created_at.localeCompare(y.created_at),
  );
}

export function OrgChatThread({
  connectionId,
  currentUserId,
  initialMessages,
  emptyText,
}: {
  connectionId: string;
  currentUserId: string;
  initialMessages: OrgMsg[];
  emptyText: string;
}) {
  const locale = useLocale();
  const [messages, setMessages] = useState<OrgMsg[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Merge server-revalidated messages (after a send) into local state.
  const [prevInitial, setPrevInitial] = useState(initialMessages);
  if (initialMessages !== prevInitial) {
    setPrevInitial(initialMessages);
    setMessages((prev) => mergeById(prev, initialMessages));
  }

  // Live updates via a server-action poll (auth cookie is HttpOnly, so a
  // browser REST poll can't authenticate). RLS-scoped to members; mergeById
  // dedupes, so re-sending the list each tick is cheap + idempotent.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const rows = await fetchOrgMessagesAction(connectionId);
      if (stopped || rows.length === 0) return;
      setMessages((prev) => mergeById(prev, rows));
    };
    void tick();
    const interval = setInterval(tick, 5000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [connectionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <p className="text-center text-sm text-ink-muted py-12">{emptyText}</p>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((m) => {
        const mine = m.sender_id === currentUserId;
        return (
          <div
            key={m.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[78%]">
              <div
                className={`text-[10px] text-ink-muted mb-1 ${
                  mine ? "text-right" : ""
                }`}
              >
                {m.sender_name}
                {m.sender_org_name ? ` · ${m.sender_org_name}` : ""}
              </div>
              <div
                className={`px-4 py-2.5 ${
                  mine
                    ? "bg-navy text-white"
                    : "bg-white text-ink border border-line"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  <LinkedText text={m.body} />
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
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
