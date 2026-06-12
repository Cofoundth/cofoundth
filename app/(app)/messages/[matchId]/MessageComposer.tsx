"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { sendMessageAction, type SendMessageState } from "./actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: SendMessageState = null;

export const QUICK_REPLY_EVENT = "cofoundee:quick-reply";

export function MessageComposer({ matchId }: { matchId: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    SendMessageState,
    FormData
  >(sendMessageAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");

  // Clear the draft after a successful (non-error) send. Mirrors the effect
  // below's [isPending, state] trigger but runs during render so the reset
  // isn't a setState-in-effect. Tracking the previous deps keeps it firing on
  // the same transitions the effect did (incl. initial mount, which is a no-op
  // on an empty draft).
  const [prevSettled, setPrevSettled] = useState<{
    isPending: boolean;
    state: SendMessageState;
  }>({ isPending, state });
  if (prevSettled.isPending !== isPending || prevSettled.state !== state) {
    setPrevSettled({ isPending, state });
    if (!isPending && !state?.error) setDraft("");
  }

  // Refocus the box after a successful send. focus() is a real DOM effect, so
  // it stays in an effect.
  useEffect(() => {
    if (!isPending && !state?.error) {
      textareaRef.current?.focus();
    }
  }, [isPending, state]);

  // A quick-reply button elsewhere on the page asks us to drop its text into
  // the box (without sending). Append to whatever's already typed.
  useEffect(() => {
    function onQuickReply(e: Event) {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      setDraft((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
    window.addEventListener(QUICK_REPLY_EVENT, onQuickReply);
    return () => window.removeEventListener(QUICK_REPLY_EVENT, onQuickReply);
  }, []);

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
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tr("Write a message…")}
          className="flex-1 px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a newline.
            // Don't submit if the user is composing IME (Thai, etc.) text.
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isPending || draft.trim().length === 0}
          className="px-5 py-3 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <Send className="w-4 h-4" />
          {isPending ? tr("Sending…") : tr("Send")}
        </button>
      </div>
      {state?.error && (
        <div className="mt-2 text-xs text-red-700">{state.error}</div>
      )}
      <div className="text-[11px] text-ink-muted mt-2">
        {tr("Enter to send · Shift+Enter for new line")}
      </div>
    </form>
  );
}
