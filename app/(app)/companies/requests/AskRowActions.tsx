"use client";

import { useTransition } from "react";
import { updateAskStatusAction } from "./actions";
import { useT } from "@/lib/i18n-client";

type Props = {
  askId: string;
  status: "open" | "filled" | "closed";
  locale: "en" | "th";
};

export function AskRowActions({ askId, status }: Props) {
  const tr = useT();
  const [, startTransition] = useTransition();

  if (status === "open") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await updateAskStatusAction(askId, "filled");
            });
          }}
          className="text-xs px-3 py-1.5 border border-gold text-gold hover:bg-gold/10 transition-colors"
        >
          {tr("Mark as filled")}
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await updateAskStatusAction(askId, "closed");
            });
          }}
          className="text-xs text-ink-muted hover:text-red-700"
        >
          {tr("Close")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await updateAskStatusAction(askId, "open");
        });
      }}
      className="text-xs text-ink-muted hover:text-navy"
    >
      {tr("Reopen")}
    </button>
  );
}
