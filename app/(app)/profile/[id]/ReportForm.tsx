"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { useT } from "@/lib/i18n-client";
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
        className="text-xs text-ink-muted hover:text-red-700 inline-flex items-center gap-1.5 mx-auto"
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
        className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
      />
      {state?.error && (
        <div className="text-xs text-red-700">{state.error}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 px-3 py-2 border border-line text-xs text-ink hover:border-navy"
        >
          {tr("Cancel")}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-3 py-2 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-xs"
        >
          {isPending ? tr("Submitting…") : tr("Submit report")}
        </button>
      </div>
    </form>
  );
}
