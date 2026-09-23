"use client";

import { useActionState, useState } from "react";
import { HandshakeIcon, ShieldCheck } from "lucide-react";
import { proposeInvestorDealAction, type FundingFormState } from "./actions";
import { cofoundeeFee } from "@/lib/fee";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

const INITIAL: FundingFormState = null;

export function FundingProposalForm({ connectionId }: { connectionId: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    FundingFormState,
    FormData
  >(proposeInvestorDealAction, INITIAL);

  // Live Cofoundee-fee preview from the entered cash terms.
  const [monthly, setMonthly] = useState("");
  const [months, setMonths] = useState("");
  const m = Number(monthly.replace(/,/g, ""));
  const n = Number(months);
  const fee = cofoundeeFee(
    isFinite(m) ? m : 0,
    Number.isInteger(n) ? n : 0,
  );

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
        <Input
          id="equity_pct"
          name="equity_pct"
          type="text"
          inputMode="decimal"
          label={tr("Equity %")}
          placeholder={tr("e.g. 10")}
        />
        <Input
          id="monthly_amount"
          name="monthly_amount"
          type="text"
          inputMode="decimal"
          label={tr("Monthly amount (฿)")}
          placeholder={tr("e.g. 50,000")}
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          id="contract_months"
          name="contract_months"
          type="text"
          inputMode="numeric"
          label={tr("Contract length (months)")}
          placeholder={tr("e.g. 12")}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
        />
        <Input
          id="payment_terms"
          name="payment_terms"
          type="text"
          maxLength={500}
          label={tr("Payment terms")}
          placeholder={tr("e.g. monthly transfer")}
        />
      </div>

      <Textarea
        id="description"
        name="description"
        rows={3}
        maxLength={5000}
        resize="y"
        label={tr("Notes (optional)")}
        placeholder={tr("Anything else about the terms.")}
      />

      <Card tone="cream" padding="xs" className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-gold-ink shrink-0 mt-0.5" />
        <div className="text-xs text-ink leading-relaxed">
          <p>
            {tr(
              "Cofoundee charges 1% of the deal value (minimum ฿2,000) per signed deal. A partner law firm drafts and handles the contract; signing happens in person.",
            )}
          </p>
          <p className="mt-2 text-navy">
            {tr("Cofoundee fee for this deal")}:{" "}
            <span className="font-serif">฿{fee.toLocaleString()}</span>
            {m * n <= 0 && (
              <span className="text-ink-muted">
                {" "}
                ({tr("minimum — add monthly terms to compute 1%")})
              </span>
            )}
          </p>
        </div>
      </Card>

      {state?.error && (
        <div
          role="alert"
          className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl"
        >
          {tr(state.error)}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          <HandshakeIcon className="w-4 h-4" />
          {isPending ? tr("Sending…") : tr("Send proposal")}
        </Button>
      </div>
    </form>
  );
}
