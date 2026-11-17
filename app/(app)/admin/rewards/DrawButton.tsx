"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { drawMonthlyWinner } from "@/lib/admin-actions";
import { Button } from "@/components/ui";

// Two presses, on purpose: a draw is stored once and cannot be redrawn
// (monthly_draws.month is the primary key), so the first press only asks.
//
// FOCUS follows the swap: into the confirmation when it opens (its question
// is a live region, so it is read out), and back to the first button on
// Cancel or after an error — each swap removes the focused element, which
// would otherwise drop focus to <body>.
export function DrawButton({ month, entrants }: { month: string; entrants: number }) {
  const tr = useT();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const askRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const backToAsk = useRef(false);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (backToAsk.current) {
      backToAsk.current = false;
      askRef.current?.focus();
    }
  }, [confirming]);

  const close = () => {
    backToAsk.current = true;
    setConfirming(false);
  };

  const draw = () =>
    start(async () => {
      const res = await drawMonthlyWinner(month).catch(() => ({
        error: "Couldn’t save the draw. Try again.",
      }));
      if (res?.error) {
        setError(res.error);
        close();
      }
    });

  return (
    <div className="space-y-3">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-ink">
            {tr("Draw one winner from {n}? This can’t be redone.").replace(
              "{n}",
              () => String(entrants),
            )}
          </p>
          <Button ref={confirmRef} size="sm" onClick={draw} disabled={pending}>
            <Gift className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {pending ? tr("Drawing…") : tr("Draw now")}
          </Button>
          <Button size="sm" variant="secondary" onClick={close} disabled={pending}>
            {tr("Cancel")}
          </Button>
        </div>
      ) : (
        <Button
          ref={askRef}
          size="sm"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          <Gift className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {tr("Draw the winner")}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-ink">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
