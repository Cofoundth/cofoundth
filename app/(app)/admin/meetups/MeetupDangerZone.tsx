"use client";

import { useState, useTransition } from "react";
import { Ban, Trash2 } from "lucide-react";
import { cancelMeetupAction, deleteMeetupAction } from "./actions";

// Destructive admin controls, kept off the main form so a stray Enter can't fire
// them. Both confirm first; delete is permanent (RSVPs cascade away), cancel is
// reversible by editing the status back.
export function MeetupDangerZone({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onCancel() {
    if (!confirm("Cancel this meetup? Attendees will see it as cancelled.")) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelMeetupAction(id);
      if (res?.error) setError(res.error);
    });
  }

  function onDelete() {
    if (
      !confirm(
        "Permanently delete this meetup and all its RSVPs? This cannot be undone.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      await deleteMeetupAction(id); // redirects on success
    });
  }

  return (
    <div className="mt-12 pt-8 border-t border-line">
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
        Danger zone
      </div>
      <div className="flex flex-wrap gap-3">
        {status !== "cancelled" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 border border-line hover:border-danger-line text-ink hover:text-danger-ink disabled:opacity-50 text-sm tracking-wide inline-flex items-center gap-2"
          >
            <Ban className="w-4 h-4" /> Cancel meetup
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="px-4 py-2 border border-danger-line text-danger-ink hover:bg-danger-surface disabled:opacity-50 text-sm tracking-wide inline-flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete meetup
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
