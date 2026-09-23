"use client";

import { useActionState, useState } from "react";
import { Ban } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui";
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
      {/* `tracking-normal` is not decoration: size="sm" carries tracking-wide
          (the canonical CTA face) and this pair never had it. cn() merges, so
          the override wins and the row keeps its exact letter-spacing. The
          px-3 -> px-4 the size brings IS accepted (the plan's +4px), and it is
          invisible on a flex-1 button with a centred label. */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 tracking-normal"
        >
          {tr("Cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="flex-1 tracking-normal"
        >
          {isPending ? tr("Blocking…") : tr("Block")}
        </Button>
      </div>
    </form>
  );
}
