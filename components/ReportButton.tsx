"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { reportContentAction } from "@/lib/post-actions";

// Flag a post or comment. Collapsed = a small "Report" link; expanded = a
// reason box. On success it collapses to a "Reported" note.
export function ReportButton({
  kind,
  targetId,
}: {
  kind: "post" | "comment";
  targetId: string;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span className="text-[11px] text-ink-muted">{tr("Reported")}</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-red-700 tracking-wide transition-colors"
      >
        <Flag className="w-3 h-3" /> {tr("Report")}
      </button>
    );
  }

  return (
    <div className="mt-2 w-full max-w-sm space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={tr("What’s wrong with this?")}
        className="w-full px-2 py-1.5 border border-line bg-white text-ink text-xs focus:outline-none focus:border-navy resize-none"
      />
      {error && <div className="text-[11px] text-red-700">{error}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="px-2 py-1 border border-line text-[11px] text-ink hover:border-navy"
        >
          {tr("Cancel")}
        </button>
        <button
          type="button"
          disabled={pending || reason.trim().length < 5}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await reportContentAction(kind, targetId, reason);
              if (res.error) setError(res.error);
              else setDone(true);
            })
          }
          className="px-2 py-1 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-[11px]"
        >
          {pending ? tr("Submitting…") : tr("Submit report")}
        </button>
      </div>
    </div>
  );
}
