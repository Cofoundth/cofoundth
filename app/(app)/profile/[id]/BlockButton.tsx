"use client";

import { useActionState, useState } from "react";
import { Ban } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { blockProfileAction, type BlockState } from "./actions";

const INITIAL: BlockState = null;

// Sits beside Report. Two-step: the confirm row replaces the trigger, so a
// stray tap never blocks anyone. There is no success branch — the action
// redirects to /browse from the server, because this page 404s for the pair
// the moment the block lands and a client-side push would race the render of
// a page that no longer exists.
export function BlockButton({ targetId }: { targetId: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<BlockState, FormData>(
    blockProfileAction,
    INITIAL,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-muted hover:text-danger-ink inline-flex items-center gap-1.5 mx-auto"
      >
        <Ban className="w-3 h-3" /> {tr("Block")}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 text-left">
      <input type="hidden" name="targetId" value={targetId} />
      <p className="text-xs text-ink-muted leading-relaxed">
        {tr(
          "You won’t see each other in the directory, and neither of you can send new interest. Unblock anytime in Settings.",
        )}
      </p>
      {state?.error && (
        <div className="text-xs text-danger-ink">{tr(state.error)}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 px-3 py-2 border border-line text-sm text-ink hover:border-navy rounded-full"
        >
          {tr("Cancel")}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-3 py-2 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm rounded-full"
        >
          {isPending ? tr("Blocking…") : tr("Block")}
        </button>
      </div>
    </form>
  );
}
