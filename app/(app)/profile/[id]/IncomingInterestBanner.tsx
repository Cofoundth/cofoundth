"use client";

import { useActionState } from "react";
import { Check, Heart } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { expressInterestAction, type InterestState } from "./actions";

// Full-width, high-contrast banner at the top of a profile when this founder
// has expressed interest in YOU. Accepting is the single most important action
// on the page, so it gets a navy bar + gold button — unmissable, not a small
// sidebar control.
export function IncomingInterestBanner({
  toId,
  otherName,
}: {
  toId: string;
  otherName: string;
}) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    InterestState,
    FormData
  >(expressInterestAction, null);

  return (
    <div className="mb-6 bg-navy border border-gold/50">
      <div className="flex items-center justify-between gap-5 flex-wrap p-6 lg:p-7">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-gold/15 border border-gold/50 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-gold" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-lg text-white font-medium leading-tight">
              {tr("{name} wants to connect with you").replace(
                "{name}",
                otherName,
              )}
            </div>
            <div className="text-sm text-white/70 mt-0.5">
              {tr("Accept to connect — messaging unlocks for both of you.")}
            </div>
          </div>
        </div>
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="toId" value={toId} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-soft disabled:opacity-60 text-navy font-medium tracking-wide transition-colors"
          >
            {isPending ? tr("Connecting…") : tr("Accept & connect")}
            {!isPending && <Check className="w-5 h-5" strokeWidth={2.5} />}
          </button>
        </form>
      </div>
      {state?.error && (
        <div className="px-6 pb-4 -mt-2 text-sm text-red-300">
          {state.error}
        </div>
      )}
    </div>
  );
}
