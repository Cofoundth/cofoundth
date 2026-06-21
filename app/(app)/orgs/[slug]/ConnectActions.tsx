"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Handshake, X } from "lucide-react";
import {
  requestConnectionAction,
  respondConnectionAction,
} from "../actions";
import { useT } from "@/lib/i18n-client";

export type ConnState =
  | "self"
  | "no_org"
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export function ConnectActions({
  targetOrgId,
  state,
  connectionId,
}: {
  targetOrgId: string;
  state: ConnState;
  connectionId?: string | null;
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | { ok?: boolean }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (state === "self") return null;

  if (state === "no_org") {
    return (
      <p className="text-xs text-ink-muted">
        {tr("Create a company to connect.")}
      </p>
    );
  }

  if (state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gold">
        <Check className="w-4 h-4" />
        {tr("Connected")}
      </span>
    );
  }

  if (state === "pending_sent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
        <Clock className="w-4 h-4" />
        {tr("Request sent")}
      </span>
    );
  }

  if (state === "pending_received") {
    return (
      <div>
        <p className="text-sm text-ink mb-2">
          {tr("This company wants to connect.")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => respondConnectionAction(connectionId ?? "", true))
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            {tr("Accept")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => respondConnectionAction(connectionId ?? "", false))
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-line hover:border-navy disabled:opacity-50 text-ink text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            {tr("Decline")}
          </button>
        </div>
        {error && <p className="text-xs text-red-700 mt-1.5">{tr(error)}</p>}
      </div>
    );
  }

  // state === "none"
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => requestConnectionAction(targetOrgId))}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm tracking-wide transition-colors"
      >
        <Handshake className="w-4 h-4" />
        {pending ? tr("Connecting…") : tr("Connect")}
      </button>
      {error && <p className="text-xs text-red-700 mt-1.5">{tr(error)}</p>}
    </div>
  );
}
