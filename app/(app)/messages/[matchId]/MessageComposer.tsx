"use client";

import { useActionState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { sendMessageAction, type SendMessageState } from "./actions";

const INITIAL: SendMessageState = null;

export function MessageComposer({ matchId }: { matchId: string }) {
  const [state, formAction, isPending] = useActionState<
    SendMessageState,
    FormData
  >(sendMessageAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form after successful send (no error, was pending)
  useEffect(() => {
    if (!isPending && !state?.error && formRef.current) {
      formRef.current.reset();
      textareaRef.current?.focus();
    }
  }, [isPending, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-line bg-white p-4"
    >
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          name="content"
          rows={2}
          maxLength={4000}
          required
          placeholder="Write a message…"
          className="flex-1 px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-3 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Sending…" : "Send"}
        </button>
      </div>
      {state?.error && (
        <div className="mt-2 text-xs text-red-700">{state.error}</div>
      )}
      <div className="text-[11px] text-ink-muted mt-2">
        ⌘+Enter to send
      </div>
    </form>
  );
}
