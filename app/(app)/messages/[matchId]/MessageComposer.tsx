"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Send } from "lucide-react";
import { sendMessageAction, type SendMessageState } from "./actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: SendMessageState = null;

// The box is MIN_ROWS tall at rest and grows with what's typed up to MAX_ROWS,
// after which it scrolls internally. 8 is the ceiling because the chat page is
// a fixed-height column (h-dvh) and the composer's height comes out of the
// thread's: at the shortest screen we support this leaves the thread ~47% of
// the column, still comfortably scrollable.
//
// 2 at rest, not 3: a textarea fills from the top, so a three-line empty box
// strands the caret with a gap under it. The box being big enough is the
// GROWTH's job (and the full-bleed column's — it is 1028px wide now), not the
// resting height's. The Send button stays `items-end` for the same reason: it
// belongs beside the line you are typing, and centring it would leave it
// floating mid-box once a message runs long.
const MIN_ROWS = 2;
const MAX_ROWS = 8;

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

  // Grow the box with its content. Keyed on `draft`, so the one effect covers
  // typing, the quick-reply insertion below, and the reset to MIN_ROWS after a
  // successful send (which clears the draft during render, above).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight);
    const border =
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const min = line * MIN_ROWS + padding + border;
    const max = line * MAX_ROWS + padding + border;
    // "auto" releases the previous measurement so the box can shrink as well
    // as grow; scrollHeight is then the content's own height (border-box, so
    // it covers the padding but not the border).
    el.style.height = "auto";
    const wanted = el.scrollHeight + border;
    el.style.height = `${Math.min(Math.max(wanted, min), max)}px`;
    el.style.overflowY = wanted > max ? "auto" : "hidden";
  }, [draft]);

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
      className="border-t border-line bg-white p-4 rounded-xl"
    >
      <input type="hidden" name="matchId" value={matchId} />
      {/* Capped to match the thread above: the form's surface is full-bleed,
          the box lines up with the messages. */}
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            name="content"
            rows={MIN_ROWS}
            maxLength={4000}
            required
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={tr("Write a message…")}
            className="flex-1 px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none rounded-xl"
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
          <div className="mt-2 text-xs text-danger-ink">{state.error}</div>
        )}
        <div className="text-xs text-ink-muted mt-2">
          {tr("Enter to send · Shift+Enter for new line")}
        </div>
      </div>
    </form>
  );
}
