"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { respondInviteAction } from "./actions";
import { useT } from "@/lib/i18n-client";

export function InviteActions({ inviteId }: { inviteId: string }) {
  const tr = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondInviteAction(inviteId, accept);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-700 mr-1">{tr(error)}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm transition-colors"
      >
        <Check className="w-4 h-4" />
        {tr("Accept")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(false)}
        className="inline-flex items-center gap-1.5 px-4 py-2 border border-line hover:border-navy disabled:opacity-50 text-ink text-sm transition-colors"
      >
        <X className="w-4 h-4" />
        {tr("Decline")}
      </button>
    </div>
  );
}
