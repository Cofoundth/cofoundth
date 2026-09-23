// The two windows, in one place, because three layers have to agree on them:
// the trigger in migration 0074 (the only one that actually binds), the server
// actions in ./actions.ts, and the bubble menu in ./MessageThread.tsx, which
// decides whether to OFFER the action at all.
//
// They are deliberately different lengths and the difference is the product
// argument, not a rounding of "a while":
//   * EDIT is 15 minutes — the typo window. Long enough to fix a wrong number
//     or a mangled Thai word before the other founder has read it; short
//     enough that a message someone replied to cannot be rewritten underneath
//     the reply. WhatsApp and Telegram both sit here; LINE has no edit at all.
//   * UNSEND is 24 hours — LINE's own window, which is the one Thai founders
//     already have in their fingers. Unsend only ever REMOVES text, so a long
//     window costs the reader nothing.
//
// Not exported from actions.ts because that file is "use server": every export
// there has to be an async function.
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const UNSEND_WINDOW_MS = 24 * 60 * 60 * 1000;

// `now` is a parameter so the thread can re-evaluate against a ticking clock
// without these reading Date.now() during render (which would make the first
// client render disagree with the server's HTML and hydrate mismatched).
export function withinEditWindow(createdAt: string, now: number): boolean {
  return now - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}

export function withinUnsendWindow(createdAt: string, now: number): boolean {
  return now - new Date(createdAt).getTime() <= UNSEND_WINDOW_MS;
}
