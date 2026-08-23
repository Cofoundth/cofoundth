// Cofoundee — the `.fv` visual panel beside the ADVISORS + CAPITAL feature block.
//
// Composed entirely from real UI in CSS (no imagery, no client JS, nothing
// animated). It illustrates a WARM INTRO: an investor or a vetted advisor
// reaching out THROUGH the community.
//
// Product truth this panel must never contradict (CLAUDE.md): funding is
// INVESTOR-INITIATED. Investors reach out to companies — founders never pitch,
// apply, or submit to a list. Every string below is written from that direction.
//
// `locale` is optional so the panel can be slotted as a bare `<IntroVisual />`
// into FeatureBlock's `visual` prop; pass the page locale when you have it and
// the copy translates. t() is used synchronously — never tServer().

import { BadgeCheck, Landmark, Scale, Users } from "lucide-react";
import { t, type Locale, DEFAULT_LOCALE } from "@/lib/i18n";

const rows = [
  {
    Icon: Landmark,
    title: "Bangkok angel network",
    meta: "Investor · reached out to a company here",
  },
  {
    Icon: Scale,
    title: "Vetted law firm",
    meta: "Legal advisor · introduced through the community",
  },
];

export function IntroVisual({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const tr = (en: string) => t(en, locale);

  return (
    <div
      aria-hidden="true"
      className="rounded-[22px] border border-line bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <span className="text-[11px] uppercase tracking-[0.18em] text-gold-ink font-medium">
          {tr("Warm intro")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-gold-soft px-2.5 py-1 text-[11px] text-ink">
          <BadgeCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
          {tr("Verified")}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map(({ Icon, title, meta }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-line bg-cream/60 p-3.5"
          >
            <span className="shrink-0 w-10 h-10 rounded-xl bg-white border border-line flex items-center justify-center">
              <Icon className="w-[18px] h-[18px] text-navy" strokeWidth={1.5} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink break-words">
                {tr(title)}
              </span>
              <span className="block text-xs text-ink-muted leading-relaxed break-words">
                {tr(meta)}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4">
        <Users
          className="w-4 h-4 text-gold-ink shrink-0 mt-0.5"
          strokeWidth={1.5}
        />
        <p className="text-xs text-ink-muted leading-relaxed">
          {tr(
            "Intros come to you. No cold pitching, no applications.",
          )}
        </p>
      </div>
    </div>
  );
}
