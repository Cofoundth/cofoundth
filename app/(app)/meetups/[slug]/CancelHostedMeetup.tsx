"use client";

import { useId, useState, useTransition } from "react";
import { Button, Dialog } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import { cancelHostedMeetupAction } from "../actions";

export function CancelHostedMeetup({ meetupId }: { meetupId: string }) {
  const tr = useT();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelHostedMeetupAction(meetupId);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {tr("Cancel meetup")}
      </Button>
      {open && (
        <Dialog
          labelledBy={titleId}
          size="sm"
          dismissible={!pending}
          onClose={() => { setOpen(false); setError(null); }}
        >
          <h2 id={titleId} className="text-lg font-bold tracking-normal">{tr("Cancel this meetup?")}</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {tr("Attendees and people waiting to join will receive a notification.")}
          </p>
          {error && <p role="alert" className="mt-3 text-sm text-danger-ink">{tr(error)}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => { setOpen(false); setError(null); }}>
              {tr("Keep meetup")}
            </Button>
            <Button type="button" variant="danger" size="sm" disabled={pending} onClick={cancel}>
              {tr(pending ? "Cancelling…" : "Cancel meetup")}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
