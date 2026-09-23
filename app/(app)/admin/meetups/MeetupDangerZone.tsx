"use client";

import { useState, useTransition } from "react";
import { Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
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
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="gap-2 hover:border-danger-line hover:text-danger-ink"
          >
            <Ban className="w-4 h-4" /> Cancel meetup
          </Button>
        )}
        <Button
          variant="danger-outline"
          size="sm"
          onClick={onDelete}
          disabled={isPending}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete meetup
        </Button>
      </div>
      {error && <p className="mt-3 text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
