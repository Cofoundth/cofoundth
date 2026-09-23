"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { respondInviteAction } from "./actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export function InviteActions({ inviteId }: { inviteId: string }) {
  const tr = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondInviteAction(inviteId, accept);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger-ink mr-1">{tr(error)}</span>}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => respond(true)}
        className="tracking-normal"
      >
        <Check className="w-4 h-4" />
        {tr("Accept")}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => respond(false)}
        className="rounded-xl tracking-normal"
      >
        <X className="w-4 h-4" />
        {tr("Decline")}
      </Button>
    </div>
  );
}
