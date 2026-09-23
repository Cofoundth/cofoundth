"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { LinkedText } from "@/components/LinkedText";
import { useLocale, useT } from "@/lib/i18n-client";
import {
  editMessageAction,
  fetchMessagesAction,
  markConversationRead,
  unsendMessageAction,
} from "./actions";
import { withinEditWindow, withinUnsendWindow } from "./windows";

export type Msg = {
  id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  edited_at: string | null;
  unsent_at: string | null;
};

// The clock, as an external store rather than state-in-an-effect.
//
// Two constraints meet here. The server has no business guessing a client's
// clock, so the SERVER snapshot is null and the thread renders no menus in the
// HTML — which is also what keeps hydration honest; a `useState(Date.now())`
// initialiser renders one number on the server and a different one in the
// browser. And the value has to CHANGE over time, which a plain module
// constant cannot. useSyncExternalStore is the shape React has for exactly
// this, and unlike setState-in-an-effect it does not cascade a render on
// mount.
//
// One timer for the whole thread, not one per bubble: it is started by the
// first subscriber and stopped by the last.
let clockNow = 0;
const clockSubscribers = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(onChange: () => void): () => void {
  // Re-seed on the way IN as well: the module outlives the component, and a
  // stale value here is a menu offering Edit on a message whose window closed
  // while the user was on another page. React re-reads getSnapshot right after
  // subscribing, so the corrected value lands on the same commit — without
  // this the first minute after a remount is judged against the old clock.
  clockNow = Date.now();
  clockSubscribers.add(onChange);
  clockTimer ??= setInterval(() => {
    clockNow = Date.now();
    for (const fn of clockSubscribers) fn();
  }, 60_000);
  return () => {
    clockSubscribers.delete(onChange);
    if (clockSubscribers.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
      // ...and on the way OUT, so nothing can read a frozen clock even if a
      // future caller reaches getClockSnapshot before subscribing.
      clockNow = 0;
    }
  };
}

// Cached, not `Date.now()` per call: getSnapshot must return a stable value
// between ticks or React re-renders forever.
function getClockSnapshot(): number | null {
  if (clockNow === 0) clockNow = Date.now();
  return clockNow;
}

function getClockServerSnapshot(): number | null {
  return null;
}

function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );
}

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
  const tr = useT();
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

  // Which bubble is open for editing. Only ever one — an edit is a focused
  // act, and two open editors would fight over Escape.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Which bubble is asking "really unsend this?".
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // A ticking clock, because the edit window CLOSES: 15 minutes after a
  // message is sent the menu must stop offering Edit, and nothing else on this
  // page would re-render to notice. Once a minute is plenty for a 15-minute
  // and a 24-hour window.
  const now = useNow();

  // Live updates via a server-action poll. Auth tokens are HttpOnly, so the
  // browser has no JS-readable session — the previous browser-client realtime
  // socket AND REST poll could no longer authenticate and silently returned
  // nothing. fetchMessagesAction runs server-side (reads the HttpOnly cookie,
  // RLS-scoped to participants) every 4s while the tab is visible. mergeById
  // dedupes, so re-sending the whole list each tick is cheap and idempotent.
  //
  // mergeById takes the POLLED row over the local one, which is what makes an
  // edit or an unsend by the other founder land here without any extra
  // plumbing: their bubble's content changes under the same id.
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
        const unsent = m.unsent_at !== null;
        // `now === null` is the server render and the first client paint. No
        // menu then — it appears a tick later, which is invisible and keeps
        // hydration honest.
        const canEdit =
          mine && !unsent && now !== null && withinEditWindow(m.created_at, now);
        const canUnsend =
          mine &&
          !unsent &&
          now !== null &&
          withinUnsendWindow(m.created_at, now);

        return (
          <div
            key={m.id}
            className={`group flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                mine
                  ? "bg-navy text-white"
                  : "bg-white text-ink border border-line"
              }`}
            >
              {editingId === m.id ? (
                <BubbleEditor
                  message={m}
                  onDone={() => setEditingId(null)}
                />
              ) : unsent ? (
                // The tombstone. Italic muted ink, no link parsing, no menu —
                // there is nothing left to act on.
                <p
                  className={`text-sm leading-relaxed italic ${
                    mine ? "text-white/60" : "text-ink-muted"
                  }`}
                >
                  {tr("Message unsent")}
                </p>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  <LinkedText text={m.content} />
                </p>
              )}

              <div
                className={`mt-1.5 flex items-center gap-2 text-xs ${
                  mine ? "text-white/60" : "text-ink-muted"
                }`}
              >
                <span>
                  {new Date(m.created_at).toLocaleString(
                    locale === "th" ? "th-TH" : "en-GB",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    },
                  )}
                </span>
                {m.edited_at && !unsent && <span>{tr("edited")}</span>}
                {(canEdit || canUnsend) && editingId !== m.id && (
                  <BubbleMenu
                    canEdit={canEdit}
                    canUnsend={canUnsend}
                    onEdit={() => setEditingId(m.id)}
                    onUnsend={() => setConfirmingId(m.id)}
                  />
                )}
              </div>
            </div>

            {confirmingId === m.id && (
              <UnsendDialog
                messageId={m.id}
                preview={m.content}
                onClose={() => setConfirmingId(null)}
              />
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </>
  );
}

// The per-bubble menu. Hidden until hover or keyboard focus on a pointer
// device; ALWAYS visible on touch, where there is no hover to reveal it and an
// invisible control is simply a missing one.
function BubbleMenu({
  canEdit,
  canUnsend,
  onEdit,
  onUnsend,
}: {
  canEdit: boolean;
  canUnsend: boolean;
  onEdit: () => void;
  onUnsend: () => void;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Which way the panel opens. Upward by default — a menu hanging off the
  // bottom of your own bubble reads as belonging to the message below it.
  const [placement, setPlacement] = useState<"top" | "bottom">("top");

  // ...but "upward" is only safe while there is room upward. The panel is
  // absolutely positioned inside the thread's scroll container
  // (page.tsx's `flex-1 overflow-y-auto`), which CLIPS it: with the bubble
  // scrolled near the top of the viewport the whole menu can render outside
  // the container and simply not be painted, while the "…" that opens it is
  // still visible and tappable. Measured before paint, so the flip never
  // flickers, and against the scroller rather than the window because the
  // scroller is what does the clipping.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const needed = menu.offsetHeight + 4; // + the mb-1/mt-1 gap
    const t = trigger.getBoundingClientRect();

    let top = 0;
    let bottom = window.innerHeight;
    for (let el = trigger.parentElement; el; el = el.parentElement) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        const r = el.getBoundingClientRect();
        top = r.top;
        bottom = r.bottom;
        break;
      }
    }

    const above = t.top - top;
    const below = bottom - t.bottom;
    // Up if it fits up; otherwise down if it fits down; otherwise whichever
    // side has more room, because a partly visible menu still beats one that
    // is entirely off the edge.
    setPlacement(needed <= above || above >= below ? "top" : "bottom");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tr("Message options")}
        onClick={() => setOpen((v) => !v)}
        className={`grid h-6 w-6 place-items-center text-current transition-opacity hover:bg-white/15 focus-visible:opacity-100 ${
          open
            ? "opacity-100"
            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          // Overlay geometry, per the surfaces table: 14px radius, hairline
          // border AND shadow — the one surface that carries both, because it
          // floats over the thread.
          className={`absolute right-0 z-20 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg ${
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {canEdit && (
            <MenuItem
              icon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
              label={tr("Edit")}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
                onEdit();
              }}
            />
          )}
          {canUnsend && (
            <MenuItem
              icon={<Trash2 className="h-4 w-4" strokeWidth={1.5} />}
              label={tr("Unsend")}
              onClick={() => {
                // Focus goes back to the "…" BEFORE the dialog opens, so the
                // dialog captures a still-mounted opener to return focus to
                // when it closes. Activating a menu item unmounts it in the
                // same commit; without this the opener is a detached node and
                // Cancel drops a keyboard user at the top of the document.
                setOpen(false);
                triggerRef.current?.focus();
                onUnsend();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      // rounded-lg, not the global pill: this is a row inside a list, the same
      // role the sidebar nav item plays, and a pill row in a 14px-radius panel
      // reads as a stray chip.
      className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-cream"
    >
      <span className="shrink-0 text-ink-muted">{icon}</span>
      {label}
    </button>
  );
}

// Editing happens IN the bubble, not in the composer: the message keeps its
// place in the conversation, so you can see what you are changing next to what
// came before it.
function BubbleEditor({
  message,
  onDone,
}: {
  message: Msg;
  onDone: () => void;
}) {
  const tr = useT();
  const [draft, setDraft] = useState(message.content);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Deliberately NOT useActionState + "close when the state settles".
  // Closing means setEditingId(null) in the PARENT, and the settle-check runs
  // during THIS component's render — React refuses to update another component
  // mid-render and says so in the console ("Cannot update a component while
  // rendering a different component"). MessageComposer's identical-looking
  // pattern is fine only because the state it resets is its own.
  //
  // Calling the action inside a transition puts onDone() in an event callback,
  // where a parent update is ordinary. Same shape ConversationActions already
  // uses for its own post-then-close.
  function save(formData: FormData) {
    startTransition(async () => {
      const result = await editMessageAction(null, formData);
      if (result?.error) setError(result.error);
      else onDone();
    });
  }

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Grow with the content, capped — same behaviour as the composer, smaller
  // ceiling because a bubble is not a composer.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 200)}px`;
  }, [draft]);

  return (
    <form ref={formRef} action={save} className="min-w-[14rem]">
      <input type="hidden" name="messageId" value={message.id} />
      <textarea
        ref={textareaRef}
        name="content"
        value={draft}
        maxLength={4000}
        required
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onDone();
            return;
          }
          // Enter saves, Shift+Enter is a newline — the composer's contract,
          // and skipped mid-IME so a Thai candidate list does not submit.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className="w-full resize-none border border-white/30 bg-white/10 px-3 py-2 text-sm leading-relaxed text-white placeholder:text-white/50 focus:border-white focus:outline-none"
      />
      {/* tr() on the message, not just on the labels: these strings come back
          from the server action in English and have Thai keys in
          lib/translations.json, so a Thai founder gets a Thai refusal. On
          bg-navy the error colour is danger-LINE — danger-ink measures 2.65:1
          there, i.e. an invisible error. */}
      {error && (
        <div className="mt-2 text-xs text-danger-line">{tr(error)}</div>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white disabled:opacity-60"
        >
          {tr("Cancel")}
        </button>
        <button
          type="submit"
          disabled={isPending || draft.trim().length === 0}
          className="border border-gold/50 bg-gold/15 px-3 py-1.5 text-xs text-white transition-colors hover:bg-gold/25 disabled:opacity-60"
        >
          {isPending ? tr("Saving…") : tr("Save")}
        </button>
      </div>
    </form>
  );
}

// The panel itself is programmatically focusable but must never sit in the Tab
// cycle — same list companies/PartnershipRequestDialog.tsx uses.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Unsend destroys text, and it destroys it for the other founder too. That is
// worth one deliberate tap, in the shared modal scrim the schedule dialog and
// the meetup modal already use.
function UnsendDialog({
  messageId,
  preview,
  onClose,
}: {
  messageId: string;
  preview: string;
  onClose: () => void;
}) {
  const tr = useT();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Same reason as BubbleEditor: dismissing is the parent's state.
  function unsend(formData: FormData) {
    startTransition(async () => {
      const result = await unsendMessageAction(null, formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  // aria-modal="true" is a promise that the rest of the page is unavailable,
  // and it was false: nothing moved focus in, nothing held it, and the page
  // behind the scrim stayed tabbable — the composer could be typed into and
  // submitted with the confirmation still painted. Worse, the menu item that
  // opens this unmounts in the same commit, so focus fell to <body> and the
  // first Tab landed BEHIND the dialog. Same shape as
  // companies/PartnershipRequestDialog.tsx, which already got this right.
  //
  // Focus goes to Cancel, not to the first control: this destroys text for
  // two people, so the safe button is the one under the cursor when the
  // keyboard arrives.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const panel = panelRef.current;
    const cancel = panel?.querySelector<HTMLElement>('button[type="button"]');
    (cancel ?? panel)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      opener?.focus?.();
    };
  }, []);

  // Escape closes. Tab / Shift+Tab cycle inside the panel instead of walking
  // into the page the modal claims is inert.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 text-left shadow-xs focus:outline-none lg:p-8"
      >
        <h2 id={titleId} className="text-d1">
          {tr("Unsend this message?")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {tr(
            "The text is deleted for both of you. The bubble stays, marked as unsent.",
          )}
        </p>
        <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-ink line-clamp-3">
          {preview}
        </p>
        {error && (
          <div className="mt-3 text-xs text-danger-ink">{tr(error)}</div>
        )}
        <form action={unsend} className="mt-5 flex gap-3">
          <input type="hidden" name="messageId" value={messageId} />
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 border border-line bg-white px-4 py-3 text-sm tracking-wide text-ink transition-colors hover:border-navy disabled:opacity-60"
          >
            {tr("Cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-danger-ink px-4 py-3 text-sm tracking-wide text-white transition-colors hover:bg-danger-ink-dark disabled:opacity-60"
          >
            {isPending ? tr("Unsending…") : tr("Unsend")}
          </button>
        </form>
      </div>
    </div>
  );
}
