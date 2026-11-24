"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import type { ChatMessage } from "@/lib/meetup-data";
import { postMeetupMessageAction } from "../actions";

export function MeetupChat({
  meetupId,
  initialMessages,
  locale,
}: {
  meetupId: string;
  initialMessages: ChatMessage[];
  locale: string;
}) {
  const tr = useT();
  const [messages, setMessages] = useState(initialMessages);
  const [refresh, setRefresh] = useState(0);
  const [available, setAvailable] = useState(true);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;

    async function poll() {
      if (document.hidden || loading) return;
      loading = true;
      try {
        const response = await fetch(`/api/meetups/${meetupId}/chat`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setAvailable(false);
          setMessages([]);
        } else if (response.ok) {
          const next: ChatMessage[] = await response.json();
          if (controller.signal.aborted) return;
          setMessages(next);
          setAvailable(true);
        }
      } catch {
        // Keep the last successful read while the connection recovers.
      } finally {
        loading = false;
      }
    }

    void poll();
    const timer = window.setInterval(poll, 5000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [meetupId, refresh]);

  function send() {
    const clean = text.trim();
    if (!clean) return;
    setError(null);
    startTransition(async () => {
      const res = await postMeetupMessageAction(meetupId, clean);
      if (res.error) {
        setError(tr(res.error));
        return;
      }
      setText("");
      setRefresh((value) => value + 1);
    });
  }

  if (!available) {
    return <p className="text-sm text-ink-muted">{tr("This chat is no longer available.")}</p>;
  }

  return (
    <div id="chat">
      {messages.length === 0 ? (
        <p className="text-sm text-ink-muted mb-4">
          {tr("Nothing here yet — say hi to the people going.")}
        </p>
      ) : (
        <div className="space-y-4 mb-5">
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <Link
                href={`/profile/${m.author?.slug ?? m.author?.id ?? ""}`}
                className="shrink-0"
              >
                <Avatar
                  name={m.author?.full_name}
                  url={m.author?.photo_url}
                  size="sm"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-navy truncate">
                    {m.author?.full_name ?? "—"}
                  </span>
                  <span className="text-xs text-ink-muted shrink-0">
                    {timeAgo(m.created_at, locale)}
                  </span>
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
                  {m.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-3 text-sm text-danger-ink bg-danger-surface border border-danger-line rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={tr("Message the attendees…")}
          aria-label={tr("Message the attendees…")}
          className="min-w-0 flex-1 h-11 px-4 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          aria-label={tr("Send")}
          className="shrink-0 grid h-11 w-11 place-items-center rounded-full bg-navy text-white hover:bg-navy-dark transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
