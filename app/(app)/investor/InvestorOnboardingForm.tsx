"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import {
  saveInvestorProfileAction,
  type InvestorFormState,
} from "./actions";
import { Button, Input, Textarea, ToggleChip } from "@/components/ui";
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

// There is no Select primitive, so the one <select> on this form keeps the
// canonical field recipe as a literal. It is byte-identical to Input's
// FIELD_BASE + the md size tier; the 14px radius comes from @layer base.
const selectCls =
  "w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy";

// Kept for the <select> and the stage-chip group — neither is a field the
// Input primitive covers. Every real text field below is an <Input> /
// <Textarea>, which renders this same label itself.
function Field({
  label,
  required,
  children,
}: {
  label: string;
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
          className={selectCls}
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

      <Input
        id="firm_name"
        name="firm_name"
        type="text"
        maxLength={120}
        defaultValue={initial?.firm_name ?? ""}
        label={tr("Firm / fund name")}
        placeholder={tr("e.g. Siam Ventures")}
      />

      <div>
        <Input
          id="focus_industries"
          name="focus_industries"
          type="text"
          defaultValue={(initial?.focus_industries ?? []).join(", ")}
          label={tr("Focus industries")}
        />
        <p className="text-xs text-ink-muted mt-1.5">
          {tr("Comma-separated, e.g. Fintech, Logistics")}
        </p>
      </div>

      <Field label={tr("Stages you back")}>
        <div className="flex flex-wrap gap-2">
          {/* ToggleChip's `sm` tier is px-3 py-1.5 text-sm — this group's
              exact geometry. Two HEAD-preserving overrides: tracking={false},
              because these chips never carried tracking-wide, and a selected
              fill of bg-cream/text-navy rather than the primitive's solid
              navy. The Check stays a child so it keeps its gold-ink tint. */}
          {STAGE_OPTS.map((s) => {
            const on = stages.includes(s.value);
            return (
              <ToggleChip
                key={s.value}
                selected={on}
                size="sm"
                tracking={false}
                onClick={() => toggleStage(s.value)}
                className={on ? "bg-cream text-navy" : undefined}
              >
                {on && <Check className="w-3.5 h-3.5 text-gold-ink" />}
                {tr(s.en)}
              </ToggleChip>
            );
          })}
        </div>
      </Field>

      <div>
        <Input
          id="ticket_size"
          name="ticket_size"
          type="text"
          maxLength={60}
          defaultValue={initial?.ticket_size ?? ""}
          label={tr("Typical ticket size")}
        />
        <p className="text-xs text-ink-muted mt-1.5">
          {tr("e.g. ฿500K–฿5M")}
        </p>
      </div>

      <div>
        <Textarea
          id="thesis"
          name="thesis"
          rows={4}
          maxLength={THESIS_MAX}
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          resize="y"
          label={tr("What you look for")}
        />
        <div className="text-right text-xs text-ink-muted mt-1 tabular-nums">
          {thesis.length} / {THESIS_MAX}
        </div>
        <p className="text-xs text-ink-muted mt-1.5">
          {tr("Your thesis — the kind of founders and companies you back.")}
        </p>
      </div>

      <Input
        id="location"
        name="location"
        type="text"
        maxLength={80}
        defaultValue={initial?.location ?? ""}
        label={tr("Location")}
        placeholder={tr("e.g. Bangkok")}
      />

      {state?.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {tr(state.error)}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? tr("Saving…") : tr("Save investor profile")}
        </Button>
      </div>
    </form>
  );
}
