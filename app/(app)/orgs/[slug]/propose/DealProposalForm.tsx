"use client";

import { useActionState, useState } from "react";
import { HandshakeIcon, ShieldCheck } from "lucide-react";
import { proposeDealAction, type DealFormState } from "../../deal-actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: DealFormState = null;

const DEAL_TYPES: { value: string; en: string }[] = [
  { value: "integration", en: "Integration" },
  { value: "distribution", en: "Distribution" },
  { value: "white_label", en: "White label" },
  { value: "co_marketing", en: "Co-marketing" },
  { value: "vendor_supplier", en: "Vendor / supplier" },
  { value: "partnership", en: "Partnership" },
  { value: "other", en: "Other" },
];

const inputCls =
  "w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy";

function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
      >
        {label}
        {required && <span className="text-gold-ink ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted mt-1.5">{hint}</p>}
    </div>
  );
}

export function DealProposalForm({
  targetOrgId,
  targetSlug,
  targetName,
}: {
  targetOrgId: string;
  targetSlug: string;
  targetName: string;
}) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<DealFormState, FormData>(
    proposeDealAction,
    INITIAL,
  );
  const [description, setDescription] = useState("");
  const [hasValue, setHasValue] = useState(false);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Disabling the button stops a second click, but Enter in any field
        // still fires submit — block it while a request is in flight.
        if (isPending) e.preventDefault();
      }}
      className="space-y-6"
    >
      <input type="hidden" name="target_org" value={targetOrgId} />
      <input type="hidden" name="target_slug" value={targetSlug} />

      <Field label={tr("Deal type")} required htmlFor="deal_type">
        <select id="deal_type" name="deal_type" defaultValue="" required className={inputCls}>
          <option value="" disabled>
            {tr("Select…")}
          </option>
          {DEAL_TYPES.map((d) => (
            <option key={d.value} value={d.value}>
              {tr(d.en)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tr("Title")} required htmlFor="title">
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder={tr('e.g. Distribution — Northern Thailand')}
          className={inputCls}
        />
      </Field>

      <Field
        label={tr("Deal details")}
        required
        htmlFor="description"
        hint={tr("Scope, what each side gives and gets, expected outcome.")}
      >
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          minLength={20}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} resize-y`}
        />
        <div className="text-right text-xs text-ink-muted mt-1 tabular-nums">
          {description.length} / 5000
        </div>
      </Field>

      <div>
        <label className="inline-flex items-center gap-2 text-sm text-ink mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasValue}
            onChange={(e) => setHasValue(e.target.checked)}
          />
          {tr("This deal has a value")}
        </label>
        {hasValue && (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              name="value_amount"
              type="text"
              inputMode="decimal"
              aria-label={tr("Deal value")}
              placeholder={tr("e.g. 500,000")}
              className={inputCls}
            />
            <select
              name="value_currency"
              defaultValue="THB"
              aria-label={tr("Currency")}
              className={inputCls}
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Field label={tr("Payment terms")} htmlFor="payment_terms">
          <input
            id="payment_terms"
            name="payment_terms"
            type="text"
            maxLength={200}
            placeholder={tr("e.g. 50% upfront, 50% on delivery")}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Timeline")} htmlFor="timeline">
          <input
            id="timeline"
            name="timeline"
            type="text"
            maxLength={200}
            placeholder={tr("e.g. 6 months")}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex items-start gap-3 p-4 bg-cream border border-line rounded-xl">
        <ShieldCheck className="w-5 h-5 text-gold-ink shrink-0 mt-0.5" />
        <p className="text-xs text-ink leading-relaxed">
          {tr(
            "Cofoundee charges 1% of the deal value (minimum ฿2,000) per signed deal. A partner law firm drafts and handles the contract; signing happens in person.",
          )}
        </p>
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800 rounded-xl">
          {tr(state.error)}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm tracking-wide transition-colors"
        >
          <HandshakeIcon className="w-4 h-4" />
          {isPending
            ? tr("Sending…")
            : (tr("Send proposal to {company}")).replace("{company}", targetName)}
        </button>
      </div>
    </form>
  );
}
