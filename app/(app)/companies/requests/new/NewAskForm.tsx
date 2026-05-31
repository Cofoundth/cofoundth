"use client";

import { useActionState, useState } from "react";
import { HandshakeIcon } from "lucide-react";
import { createAskAction, type AskState } from "../actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: AskState = null;

// en / hintEN are dictionary keys; Thai comes from tr() at render.
const REQUEST_TYPES: {
  value: string;
  en: string;
  hintEN: string;
}[] = [
  {
    value: "integration",
    en: "Integration",
    hintEN: "API, SDK, or platform integration",
  },
  {
    value: "distribution",
    en: "Distribution",
    hintEN: "Selling, channel, or market access",
  },
  {
    value: "white_label",
    en: "White label",
    hintEN: "Using your product under their brand (or vice versa)",
  },
  {
    value: "co_marketing",
    en: "Co-marketing",
    hintEN: "Joint campaigns, content, events",
  },
  {
    value: "vendor_supplier",
    en: "Vendor / supplier",
    hintEN: "Looking for a service provider",
  },
  {
    value: "other",
    en: "Other",
    hintEN: "Custom partnership",
  },
];

export function NewAskForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<AskState, FormData>(
    createAskAction,
    INITIAL,
  );
  const [requestType, setRequestType] = useState("integration");
  const [context, setContext] = useState("");

  const remaining = 2000 - context.length;
  const tooShort = context.length < 50;
  const tooLong = remaining < 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="request_type" value={requestType} />

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
          {tr("Partner type")}
        </label>
        <div className="grid sm:grid-cols-2 gap-2">
          {REQUEST_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setRequestType(rt.value)}
              className={`text-left p-3 border transition-colors ${
                requestType === rt.value
                  ? "bg-cream border-navy"
                  : "bg-white border-line hover:border-navy"
              }`}
            >
              <div className="text-sm text-navy font-medium">
                {tr(rt.en)}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {tr(rt.hintEN)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Subject")}
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={5}
          maxLength={200}
          placeholder={tr('e.g. "Logistics partner covering Northern Thailand"')}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="context"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            {tr("Context")}
          </label>
          <span
            className={`text-xs tabular-nums ${
              tooLong || tooShort ? "text-ink-muted" : "text-gold"
            }`}
          >
            {context.length} / 2000
          </span>
        </div>
        <textarea
          id="context"
          name="context"
          rows={8}
          required
          minLength={50}
          maxLength={2000}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={tr(
            "Describe your business, why you need this kind of partner, expected volume, timeline, and any key conditions.",
          )}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-y"
        />
        {tooShort && context.length > 0 && (
          <p className="text-xs text-ink-muted mt-1">
            {tr("{n} more chars needed (50 min)").replace(
              "{n}",
              String(50 - context.length),
            )}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="deadline_at"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Deadline (optional)")}
        </label>
        <input
          id="deadline_at"
          name="deadline_at"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          className="px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending || tooShort || tooLong}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors"
        >
          <HandshakeIcon className="w-4 h-4" />
          {isPending ? tr("Posting…") : tr("Post ask")}
        </button>
      </div>
    </form>
  );
}
