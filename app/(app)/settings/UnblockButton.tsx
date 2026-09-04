"use client";

import { useActionState } from "react";
import { useT } from "@/lib/i18n-client";
import {
  unblockProfileAction,
  type BlockState,
} from "@/app/(app)/profile/[id]/actions";

const INITIAL: BlockState = null;

export function UnblockButton({ targetId }: { targetId: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<BlockState, FormData>(
    unblockProfileAction,
    INITIAL,
  );

  if (state?.ok) {
    return <span className="text-xs text-ink-muted">{tr("Unblocked")}</span>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="targetId" value={targetId} />
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-1.5 border border-line text-xs text-ink hover:border-navy disabled:opacity-60 transition-colors rounded-full"
      >
        {isPending ? tr("Unblocking…") : tr("Unblock")}
      </button>
      {state?.error && (
        <span className="block text-xs text-danger-ink mt-1">
          {tr(state.error)}
        </span>
      )}
    </form>
  );
}
