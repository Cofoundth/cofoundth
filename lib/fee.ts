// Cofoundee's per-signed-deal fee: 1% of the deal's total cash value, floored at
// ฿2,000. "Deal value" = the contract's total cash (monthly amount × months).
// Equity-only deals have no cash basis, so they fall to the ฿2,000 minimum.
// Shared by the proposal form (live preview), the server action (stored on the
// deal), the deal detail page, and the admin queue — one source of truth.
export const COFOUNDEE_FEE_RATE = 0.01;
export const COFOUNDEE_FEE_MIN = 2000;
export const COFOUNDEE_FEE_CURRENCY = "THB";

export function cofoundeeFee(
  monthlyAmount: number | null | undefined,
  contractMonths: number | null | undefined,
): number {
  const cash = (monthlyAmount ?? 0) * (contractMonths ?? 0);
  return Math.max(COFOUNDEE_FEE_MIN, Math.round(cash * COFOUNDEE_FEE_RATE));
}
