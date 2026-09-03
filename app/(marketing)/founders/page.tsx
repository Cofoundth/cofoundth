// Public founder directory — a deliberately LIMITED preview for logged-out
// visitors. Every field on this page comes from lib/public-profile.ts, which
// owns the privacy allowlist; nothing else here may query `profiles`.
//
// noindex on purpose: real people's names must not become search results
// without their consent.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { ROLE_LABELS, STAGE_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { listPublicFounders } from "@/lib/public-profile";
import { Avatar } from "@/components/Avatar";
import { Card,
  EmptyState,
  Eyebrow,
  LinkButton,
  VerifiedBadge, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Founders",
  description:
    "A preview of the founder community on Cofoundee — Thailand's startup ecosystem.",
  robots: { index: false, follow: false },
};

export default async function PublicFoundersPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const founders = await listPublicFounders(48);
  const verifiedLabel = tr("Verified");

  return (
    <Section>
      {/* Header */}
      <div className="max-w-[640px] mb-8">
        <Eyebrow className="mb-6">{tr("Community")}</Eyebrow>
        <h1 className="text-d2 lg:text-d3 mb-4">
          {tr("Founders")}
        </h1>
        <p className="text-lg text-ink leading-relaxed">
          {tr(
            "A preview of the founders building in Thailand. Join free to see full profiles and connect.",
          )}
        </p>
      </div>

      {/* Thin gold rule — the editorial section divider used across the site. */}
      <div className="w-16 h-px bg-line mb-12" />

      {founders.length === 0 ? (
        // An unfiltered list, so this is genuinely "nobody here yet" rather than
        // "your filter matched nothing" — which makes "be the first" the honest
        // ask. It does not render today (the directory has real people in it),
        // but it is the first thing a visitor would see if it ever did.
        <EmptyState
          icon={Users}
          title={tr("No founders yet")}
          description={tr(
            "This is where founders building in Thailand show up. Create your profile and be the first.",
          )}
          action={
            <LinkButton href="/signup" size="lg">
              {tr("Join the community")}
            </LinkButton>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {founders.map((f) => {
            const roles = f.roles
              .map((r) => (ROLE_LABELS[r] ? tr(ROLE_LABELS[r]) : null))
              .filter(Boolean) as string[];
            const stageLabel = f.stage ? STAGE_LABELS[f.stage] : null;
            return (
              <Link
                key={f.slug}
                href={`/founders/${f.slug}`}
                className="group block"
              >
                <Card hoverable padding="md" className="h-full flex flex-col">
                  <div className="flex items-start gap-4">
                    <Avatar name={f.fullName} url={f.photoUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg leading-tight inline-flex items-center gap-1.5 flex-wrap group-hover:text-gold-ink transition-colors">
                        {f.fullName}
                        {f.verified && <VerifiedBadge label={verifiedLabel} />}
                      </h2>
                      {roles.length > 0 && (
                        <div className="mt-1 text-xs text-gold-ink">
                          {roles.join(" · ")}
                        </div>
                      )}
                      {f.location && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {provinceLabel(f.location, locale)}
                        </div>
                      )}
                    </div>
                  </div>

                  {f.excerpt && (
                    <p className="mt-4 text-sm text-ink leading-relaxed">
                      {f.excerpt}
                    </p>
                  )}

                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-ink-muted">
                    {f.industry.slice(0, 2).map((i) => (
                      <span key={i} className="px-2 py-0.5 border border-line rounded-full">
                        {i}
                      </span>
                    ))}
                    {stageLabel && (
                      <span className="px-2 py-0.5 border border-line text-gold-ink bg-gold-soft rounded-full">
                        {tr(stageLabel)}
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-navy group-hover:text-gold-ink transition-colors">
                      {tr("View profile")}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Conversion — the whole point of the preview. */}
      <div className="mt-16 bg-navy text-white p-10 lg:p-12 text-center rounded-xl">
        <h2 className="text-d2 lg:text-d3 text-white mb-4">
          {tr("Where Thai founders connect")}
        </h2>
        <p className="text-white/70 leading-relaxed max-w-xl mx-auto mb-8">
          {tr(
            "Community, partners, and co-founders — in one place. Free to join.",
          )}
        </p>
        {/* Inverted CTA — the app's white-on-navy band idiom. Not <LinkButton>:
            cn() does not de-duplicate Tailwind utilities, so overriding its
            bg-navy with bg-white would be a coin flip on stylesheet order. */}
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 bg-white text-navy hover:bg-cream px-8 py-4 text-sm tracking-wide transition-colors rounded-full"
        >
          {tr("Sign up to connect")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Section>
  );
}
