"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import {
  saveInvestorProfileAction,
  type InvestorFormState,
} from "./actions";
import { useT } from "@/lib/i18n-client";
import { LONG_TEXT_MAX } from "@/lib/limits";
import { INVESTOR_TYPES } from "@/lib/investor";

const INITIAL: InvestorFormState = null;
const THESIS_MAX = LONG_TEXT_MAX;

const STAGE_OPTS: { value: string; en: string }[] = [
  { value: "pre_seed", en: "Pre-seed" },
  { value: "seed", en: "Seed" },
  { value: "series_a", en: "Series A" },
  { value: "growth", en: "Growth" },
];

const inputCls =
  "w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
        {label}
        {required && <span className="text-gold-ink ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted mt-1.5">{hint}</p>}
    </div>
  );
}

export type InvestorInitial = {
  investor_type?: string | null;
  firm_name?: string | null;
  focus_industries?: string[] | null;
  stages?: string[] | null;
  ticket_size?: string | null;
  thesis?: string | null;
  location?: string | null;
};

export function InvestorOnboardingForm({
  initial,
}: {
  initial?: InvestorInitial;
}) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    InvestorFormState,
    FormData
  >(saveInvestorProfileAction, INITIAL);
  const [stages, setStages] = useState<string[]>(initial?.stages ?? []);
  const [thesis, setThesis] = useState(initial?.thesis ?? "");

  function toggleStage(v: string) {
    setStages((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="stages" value={stages.join(",")} />

      <Field label={tr("Investor type")} required>
        <select
          name="investor_type"
          required
          defaultValue={initial?.investor_type ?? ""}
          className={inputCls}
        >
          <option value="" disabled>
            {tr("Select…")}
          </option>
          {INVESTOR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {tr(t.en)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tr("Firm / fund name")}>
        <input
          name="firm_name"
          type="text"
          maxLength={120}
          defaultValue={initial?.firm_name ?? ""}
          placeholder={tr("e.g. Siam Ventures")}
          className={inputCls}
        />
      </Field>

      <Field
        label={tr("Focus industries")}
        hint={tr("Comma-separated, e.g. Fintech, Logistics")}
      >
        <input
          name="focus_industries"
          type="text"
          defaultValue={(initial?.focus_industries ?? []).join(", ")}
          className={inputCls}
        />
      </Field>

      <Field label={tr("Stages you back")}>
        <div className="flex flex-wrap gap-2">
          {STAGE_OPTS.map((s) => {
            const on = stages.includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleStage(s.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-sm transition-colors ${
                  on
                    ? "bg-cream border-navy text-navy"
                    : "bg-white border-line text-ink hover:border-navy"
                }`}
              >
                {on && <Check className="w-3.5 h-3.5 text-gold-ink" />}
                {tr(s.en)}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label={tr("Typical ticket size")}
        hint={tr("e.g. ฿500K–฿5M")}
      >
        <input
          name="ticket_size"
          type="text"
          maxLength={60}
          defaultValue={initial?.ticket_size ?? ""}
          className={inputCls}
        />
      </Field>

      <Field
        label={tr("What you look for")}
        hint={tr("Your thesis — the kind of founders and companies you back.")}
      >
        <textarea
          name="thesis"
          rows={4}
          maxLength={THESIS_MAX}
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          className={`${inputCls} resize-y`}
        />
        <div className="text-right text-xs text-ink-muted mt-1 tabular-nums">
          {thesis.length} / {THESIS_MAX}
        </div>
      </Field>

      <Field label={tr("Location")}>
        <input
          name="location"
          type="text"
          maxLength={80}
          defaultValue={initial?.location ?? ""}
          placeholder={tr("e.g. Bangkok")}
          className={inputCls}
        />
      </Field>

      {state?.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {tr(state.error)}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm tracking-wide transition-colors"
        >
          {isPending ? tr("Saving…") : tr("Save investor profile")}
        </button>
      </div>
    </form>
  );
}
