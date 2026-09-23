"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  confirmDealAction,
  declineDealAction,
  cancelDealAction,
} from "../deal-actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export function DealActions({
  dealId,
  role,
}: {
  dealId: string;
  role: "responder" | "proposer";
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (role === "responder") {
    return (
      <div>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            disabled={pending}
            onClick={() => run(() => confirmDealAction(dealId))}
          >
            <Check className="w-3.5 h-3.5" />
            {pending ? tr("Confirming…") : tr("Confirm")}
          </Button>
          <Button
            variant="secondary"
            size="xs"
            disabled={pending}
            onClick={() => run(() => declineDealAction(dealId))}
          >
            <X className="w-3.5 h-3.5" />
            {pending ? tr("Declining…") : tr("Decline")}
          </Button>
        </div>
        {error && <p className="text-xs text-danger-ink mt-1">{tr(error)}</p>}
      </div>
    );
  }

  return (
    <div>
      {/* Left hand-rolled, same as ManagePanel's Revoke: a bare 12px muted
          link that turns red. `ghost` is the nearest variant but is
          text-ink -> hover:text-navy and brings a size's padding. */}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => cancelDealAction(dealId))}
        className="text-xs text-ink-muted hover:text-danger-ink disabled:opacity-50"
      >
        {pending ? tr("Withdrawing…") : tr("Withdraw")}
      </button>
      {error && <p className="text-xs text-danger-ink mt-1">{tr(error)}</p>}
    </div>
  );
}
