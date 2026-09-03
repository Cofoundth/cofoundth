// Public founder directory — a deliberately LIMITED preview for logged-out
// visitors. Every field on this page comes from lib/public-profile.ts, which
// owns the privacy allowlist; nothing else here may query `profiles`.
//
// noindex on purpose: real people's names must not become search results
// without their consent.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { ROLE_LABELS, STAGE_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { listPublicFounders } from "@/lib/public-profile";
import { DirectoryCard } from "@/components/DirectoryCard";
import { EmptyState, Eyebrow, LinkButton, Section } from "@/components/ui";

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
    <Section rhythm="marketing">
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
              <DirectoryCard
                key={f.slug}
                as="h2"
                href={`/founders/${f.slug}`}
                name={f.fullName}
                photoUrl={f.photoUrl}
                location={
                  f.location ? provinceLabel(f.location, locale) : null
                }
                verified={f.verified}
                verifiedLabel={verifiedLabel}
                stage={f.stage}
                stageLabel={stageLabel ? tr(stageLabel) : undefined}
                sectors={f.industry}
                blurb={f.excerpt}
                blurbLabel={tr("Working on")}
                chipsIcon={Users}
                chipsLabel={tr("Role")}
                chips={roles}
              />
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
