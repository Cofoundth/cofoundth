"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { buttonClasses } from "@/components/ui";
import { rsvpAction } from "./actions";

type Props = {
  meetupId: string;
  initialGoing: boolean;
  goingCount: number;
  capacity: number | null;
  /** Past or cancelled — RSVP is closed. */
  disabled?: boolean;
};

// Optimistic RSVP toggle. The button flips instantly; the server action also
// revalidates the page, so the attendee list + counts reconcile on the next
// render. On error we roll the button back and surface the (translated) reason.
export function RsvpButton({
  meetupId,
  initialGoing,
  goingCount,
  capacity,
  disabled,
}: Props) {
  const tr = useT();
  const [going, setGoing] = useState(initialGoing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const full = capacity != null && !going && goingCount >= capacity;

  function toggle() {
    if (disabled || full || isPending) return;
    const next = !going;
    setError(null);
    setGoing(next); // optimistic
    startTransition(async () => {
      const res = await rsvpAction(meetupId, next);
      if (res.error) {
        setGoing(!next); // roll back
        setError(tr(res.error));
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || full || isPending}
        aria-pressed={going}
        className={buttonClasses({
          variant: going ? "secondary" : "primary",
          size: "md",
        })}
      >
        {going ? (
          <>
            <Check className="w-4 h-4" /> {tr("You're going")}
          </>
        ) : full ? (
          tr("Meetup full")
        ) : (
          <>
            <Plus className="w-4 h-4" /> {tr("RSVP")}
          </>
        )}
      </button>
      {going && !disabled && (
        <p className="mt-2 text-xs text-ink-muted">{tr("Tap again to cancel")}</p>
      )}
      {error && <p className="mt-2 text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
