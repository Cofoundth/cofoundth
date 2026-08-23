import { ArrowLeftRight } from "lucide-react";

/**
 * Decorative abstraction of a company-to-company partnership request.
 *
 * Presentational only: no props, no data, no client JS. The whole panel is
 * aria-hidden — every company name here is a generic placeholder, never a real
 * organisation from our database, and the strings carry no meaning a screen
 * reader needs. The surrounding feature block owns the real copy.
 */
export function PartnershipVisual() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[22px] border border-line bg-white p-5 shadow-sm"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">
        Partnership request
      </p>

      <div className="mt-4 flex items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-cream text-[13px] font-semibold text-ink">
            A
          </span>
          <span className="min-w-0 text-[13px] font-semibold leading-tight text-ink">
            Acme Logistics
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden h-px w-3 bg-line sm:block" />
          <ArrowLeftRight
            aria-hidden="true"
            className="h-3.5 w-3.5 text-gold-ink"
          />
          <span className="hidden h-px w-3 bg-line sm:block" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-cream text-[13px] font-semibold text-ink">
            S
          </span>
          <span className="min-w-0 text-[13px] font-semibold leading-tight text-ink">
            Siam Retail
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm text-ink">Distribution partnership</p>
        <p className="mt-3">
          <span className="inline-block rounded-full border border-line bg-cream px-2.5 py-0.5 text-[11px] text-gold-ink">
            Awaiting response
          </span>
        </p>
      </div>
    </div>
  );
}
