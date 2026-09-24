"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui";
import {
  reportProfileAction,
  type ReportState,
} from "./actions";

const INITIAL: ReportState = null;

export function ReportForm({ targetId }: { targetId: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<ReportState, FormData>(
    reportProfileAction,
    INITIAL,
  );
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return (
      <div className="text-xs text-ink-muted text-center">
        {tr("Report submitted. Thank you.")}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-muted hover:text-danger-ink inline-flex items-center gap-1.5 mx-auto"
      >
        <Flag className="w-3 h-3" /> {tr("Report profile")}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 text-left">
      <input type="hidden" name="targetId" value={targetId} />
      <label
        htmlFor="reason"
        className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
      >
        {tr("Why are you reporting this profile?")}
      </label>
      <textarea
        id="reason"
        name="reason"
        rows={3}
        minLength={5}
        maxLength={1000}
        required
        placeholder={tr("Spam, fake profile, harassment, etc.")}
        className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none rounded-xl"
      />
      {state?.error && (
        <div className="text-xs text-danger-ink">{state.error}</div>
      )}
      {/* size="xs" is px-3/text-xs already; only py comes up from 1.5 to the
          2 these two shipped with. Cancel keeps its explicit rounded-xl (14px):
          it is a `utilities`-layer class and so beats the @layer base pill —
          dropping it was a real 14px -> 17px corner change, not a no-op. The
          submit sibling never had one and pills, at 5c563c9 as now. */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="xs"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 py-2 rounded-xl"
        >
          {tr("Cancel")}
        </Button>
        <Button
          type="submit"
          size="xs"
          disabled={isPending}
          className="flex-1 py-2"
        >
          {isPending ? tr("Submitting…") : tr("Submit report")}
        </Button>
      </div>
    </form>
  );
}
