"use client";

// The meetup's attendee chat — the reference app's Messages > Meetups thread,
// mounted where attendees already are: on the meetup page itself. Messages
// arrive server-rendered; posting goes through postMeetupMessageAction (RLS
// allows attendees only) and refreshes the route for the new row. No socket:
// the app's realtime pill is a documented no-op under HttpOnly auth.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { postMeetupMessageAction } from "../actions";

export type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    slug: string | null;
    full_name: string | null;
    photo_url: string | null;
  } | null;
};

export function MeetupChat({
  meetupId,
  messages,
  locale,
}: {
  meetupId: string;
  messages: ChatMessage[];
  locale: string;
}) {
  const tr = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      router.refresh();
    });
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
