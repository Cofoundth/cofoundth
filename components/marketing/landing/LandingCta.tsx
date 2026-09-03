// Cofoundee — landing page closing CTA.
//
// Mirrors Onfound's footer CTA block (780px inner, centred, sits directly above
// the footer), but keeps our copy. The heading + paragraph are the SAME English
// strings the old inline CTA used, so their existing Thai in translations.json
// keeps applying instead of silently falling back to English.
//
// `founderCount` is the real number of complete profiles. It is deliberately
// NOT rendered at today's numbers: "Join 13 founders" reads as a warning, not
// as proof. The count line only appears once the number can carry its own
// weight (SOCIAL_PROOF_FLOOR), so this is honest either way — no fabricated
// social proof, and no code change needed later.

import { LinkButton } from "@/components/ui/Button";
import { t, type Locale } from "@/lib/i18n";

/** Below this, the raw count undersells the community — show nothing instead. */
const SOCIAL_PROOF_FLOOR = 250;

export function LandingCta({
  locale,
  founderCount,
}: {
  locale: Locale;
  founderCount: number;
}) {
  const tr = (en: string) => t(en, locale);
  const showCount = founderCount >= SOCIAL_PROOF_FLOOR;

  return (
    <section className="border-t border-line bg-cream py-[88px]">
      <div className="mx-auto max-w-[780px] px-6 text-center lg:px-10">
        <h2 className="text-d3 lg:text-d4">
          {tr("It's still early — which is the best reason to join now.")}
        </h2>

        <p className="mx-auto mt-6 max-w-[600px] text-lg leading-relaxed text-ink-muted">
          {tr(
            "The people who join now shape what this becomes.",
          )}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <LinkButton href="/signup" size="lg" className="w-full sm:w-auto">
            {tr("Create your profile")}
          </LinkButton>
          <LinkButton
            href="/founders"
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            {tr("Browse founders")}
          </LinkButton>
        </div>

        {showCount ? (
          <p className="mt-6 text-sm text-ink-muted">
            {tr("{n} founders have built a profile so far.").replace(
              "{n}",
              String(founderCount),
            )}
          </p>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">
            {tr("Free to join. No pitch deck, no gatekeeping.")}
          </p>
        )}
      </div>
    </section>
  );
}
