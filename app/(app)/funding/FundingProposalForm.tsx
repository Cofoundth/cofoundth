"use client";

import { useActionState } from "react";
import { HandshakeIcon, ShieldCheck } from "lucide-react";
import { proposeInvestorDealAction, type FundingFormState } from "./actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: FundingFormState = null;
const inputCls =
  "w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy";
const labelCls =
  "block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2";

export function FundingProposalForm({ connectionId }: { connectionId: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    FundingFormState,
    FormData
  >(proposeInvestorDealAction, INITIAL);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (isPending) e.preventDefault();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="connection_id" value={connectionId} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="equity_pct" className={labelCls}>
            {tr("Equity %")}
          </label>
          <input
            id="equity_pct"
            name="equity_pct"
            type="text"
            inputMode="decimal"
            placeholder={tr("e.g. 10")}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="monthly_amount" className={labelCls}>
            {tr("Monthly amount (฿)")}
          </label>
          <input
            id="monthly_amount"
            name="monthly_amount"
            type="text"
            inputMode="decimal"
            placeholder={tr("e.g. 50,000")}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contract_months" className={labelCls}>
            {tr("Contract length (months)")}
          </label>
          <input
            id="contract_months"
            name="contract_months"
            type="text"
            inputMode="numeric"
            placeholder={tr("e.g. 12")}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="payment_terms" className={labelCls}>
            {tr("Payment terms")}
          </label>
          <input
            id="payment_terms"
            name="payment_terms"
            type="text"
            maxLength={500}
            placeholder={tr("e.g. monthly transfer")}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>
          {tr("Notes (optional)")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={5000}
          placeholder={tr("Anything else about the terms.")}
          className={`${inputCls} resize-y`}
        />
      </div>

      <div className="flex items-start gap-3 p-4 bg-cream border border-line">
        <ShieldCheck className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <p className="text-xs text-ink leading-relaxed">
          {tr(
            "Cofoundee charges 1% of the deal value (minimum ฿2,000) per signed deal. A partner law firm drafts and handles the contract; signing happens in person.",
          )}
        </p>
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {tr(state.error)}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm tracking-wide transition-colors"
        >
          <HandshakeIcon className="w-4 h-4" />
          {isPending ? tr("Sending…") : tr("Send proposal")}
        </button>
      </div>
    </form>
  );
}
