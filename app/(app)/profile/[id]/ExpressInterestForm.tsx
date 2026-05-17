"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  expressInterestAction,
  type InterestState,
} from "./actions";

const INITIAL: InterestState = null;

type Props = {
  toId: string;
  alreadySent: boolean;
};

export function ExpressInterestForm({ toId, alreadySent }: Props) {
  const [state, formAction, isPending] = useActionState<InterestState, FormData>(
    expressInterestAction,
    INITIAL,
  );
  const [open, setOpen] = useState(false);

  if (alreadySent || state?.ok) {
    return (
      <div className="bg-cream border border-gold/40 p-6 text-center">
        <div className="w-12 h-12 bg-white border border-gold/40 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-gold" strokeWidth={2} />
        </div>
        <div className="text-sm font-medium text-navy mb-1">Interest sent</div>
        <p className="text-xs text-ink-muted leading-relaxed">
          You&rsquo;ll be notified if they also express interest. Messaging
          unlocks on mutual interest.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-6 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
      >
        Express Interest <ArrowRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="toId" value={toId} />
      <div>
        <label
          htmlFor="note"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          Personal note (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          maxLength={500}
          placeholder="A short intro: who you are, why you connected with their pitch."
          className="w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 px-6 py-3 border border-line bg-white hover:border-navy text-ink text-sm tracking-wide transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending ? "Sending…" : "Send interest"}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
