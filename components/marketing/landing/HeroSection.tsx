import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import type { PublicProfile } from "@/lib/public-profile";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";

// Onfound's hero shape: full-viewport, centred, a very large display h1, one
// line of sub, a CTA row, then a trust row of stacked avatars.
//
// Two deliberate departures, both about not lying:
//
// 1. NO PHOTO. Theirs is a full-bleed photograph under a dark scrim. We have no
//    photography of this community, and stock founders would misrepresent a Thai
//    platform with a couple of dozen real members. The warm sand ground carries
//    it instead — which is also the one surface the whole restyle is built on.
// 2. THE TRUST ROW IS REAL. Theirs reads "Sarah, James, Priya and 1000+ founders
//    joined this month". Ours stacks the actual member avatars and names them,
//    and the numeric count stays behind the same >= 25 gate the old hero used —
//    below that it undersells, and inflating it is not on the table.
export function HeroSection({
  locale,
  founders,
  totalFounders,
  foundersThisWeek,
}: {
  locale: Locale;
  founders: PublicProfile[];
  totalFounders: number;
  foundersThisWeek: number;
}) {
  const tr = (en: string) => t(en, locale);
  const stack = founders.slice(0, 5);
  const firstNames = stack
    .slice(0, 3)
    .map((f) => f.fullName.trim().split(/\s+/)[0])
    .filter(Boolean);

  return (
    // Theirs is a full-viewport hero. Ours matches the proportion by centring in
    // a viewport-height field (minus the 64px nav) rather than by padding to it —
    // so a short viewport shrinks gracefully instead of pushing the CTA below the
    // fold, and there is never a band of dead cream under the content.
    <header className="relative bg-cream border-b border-line lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center">
      <div className="w-full max-w-[1120px] mx-auto px-6 lg:px-10 pt-[104px] pb-[88px] lg:py-[104px]">
        <div className="max-w-[760px] mx-auto text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-ink-muted mb-6 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse motion-reduce:animate-none" />
            {tr("Thailand's startup community")}
          </div>

          <h1 className="text-d3 sm:text-d4 lg:text-d5 mb-6">
            {tr("The bridge for Thailand's startup ecosystem.")}
          </h1>

          <p className="text-lg text-ink-muted leading-relaxed max-w-[560px] mx-auto mb-9">
            {tr(
              "Community, partners, capital, and co-founders — in one place.",
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/signup" size="lg">
              {tr("Create your profile")}
            </LinkButton>
            <LinkButton href="/founders" size="lg" variant="secondary">
              {tr("Browse founders")}
            </LinkButton>
          </div>

          {stack.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <div className="flex -space-x-1">
                {stack.map((f) => (
                  <span
                    key={f.slug}
                    className="ring-2 ring-cream rounded-full inline-flex"
                  >
                    <Avatar name={f.fullName} url={f.photoUrl} size="sm" />
                  </span>
                ))}
              </div>
              <p className="text-sm text-ink-muted">
                {/* One whole sentence per string — Thai word order differs, so
                    concatenating fragments would not translate. */}
                {totalFounders >= 25
                  ? tr("{names} and {n}+ other founders are here")
                      .replace("{names}", firstNames.join(", "))
                      .replace("{n}", String(totalFounders - firstNames.length))
                  : tr("{names} and others are building here").replace(
                      "{names}",
                      firstNames.join(", "),
                    )}
                {foundersThisWeek > 0 && (
                  <>
                    {" · "}
                    <span className="text-gold-ink">
                      {tr("{n} joined this week").replace(
                        "{n}",
                        `+${foundersThisWeek}`,
                      )}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          <p className="mt-6 text-xs text-ink-muted">
            <Link href="/founders" className="hover:text-navy transition-colors">
              {tr("Free for founders")}
            </Link>
            {" · "}
            {tr("Thai and English")}
          </p>
        </div>
      </div>
    </header>
  );
}
