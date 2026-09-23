"use client";

import { useActionState, useState } from "react";
import { HandshakeIcon } from "lucide-react";
import { createAskAction, type AskState } from "../actions";
import { Button, Input, Textarea } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import { LONG_TEXT_MAX } from "@/lib/limits";

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

  const remaining = LONG_TEXT_MAX - context.length;
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

      <Input
        id="subject"
        name="subject"
        type="text"
        required
        minLength={5}
        maxLength={200}
        label={tr("Subject")}
        placeholder={tr('e.g. "Logistics partner covering Northern Thailand"')}
      />

      <div>
        <Textarea
          id="context"
          name="context"
          rows={8}
          required
          minLength={50}
          maxLength={LONG_TEXT_MAX}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          resize="y"
          label={tr("Context")}
          hint={
            <span
              className={`text-xs tabular-nums ${
                tooLong || tooShort ? "text-ink-muted" : "text-gold-ink"
              }`}
            >
              {context.length} / {LONG_TEXT_MAX}
            </span>
          }
          placeholder={tr(
            "Describe your business, why you need this kind of partner, expected volume, timeline, and any key conditions.",
          )}
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

      {/* `w-auto` keeps HEAD's intrinsic date-picker width — the field
          primitive is w-full, this one never was. */}
      <Input
        id="deadline_at"
        name="deadline_at"
        type="date"
        min={new Date().toISOString().slice(0, 10)}
        label={tr("Deadline (optional)")}
        className="w-auto"
      />

      {state?.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {state.error}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending || tooShort || tooLong}>
          <HandshakeIcon className="w-4 h-4" />
          {isPending ? tr("Posting…") : tr("Post ask")}
        </Button>
      </div>
    </form>
  );
}
