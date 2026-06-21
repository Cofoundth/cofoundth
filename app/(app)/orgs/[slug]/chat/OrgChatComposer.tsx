"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendOrgMessageAction } from "../../chat-actions";
import { useT } from "@/lib/i18n-client";
import { MESSAGE_MAX } from "@/lib/limits";

export function OrgChatComposer({ connectionId }: { connectionId: string }) {
  const tr = useT();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send() {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    start(async () => {
      const res = await sendOrgMessageAction(connectionId, text);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-line bg-white px-6 py-3">
      {error && <p className="text-xs text-red-700 mb-2">{tr(error)}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={MESSAGE_MAX}
          placeholder={tr("Write a message…")}
          aria-label={tr("Message")}
          className="flex-1 resize-none px-4 py-2.5 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
        <button
          type="button"
          disabled={pending || !body.trim()}
          onClick={send}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
          {pending ? tr("Sending…") : tr("Send")}
        </button>
      </div>
    </div>
  );
}
