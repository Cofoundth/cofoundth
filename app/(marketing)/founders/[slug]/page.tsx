// Public founder PREVIEW — the honest, partial version of /profile/[id].
//
// Everything rendered here comes from lib/public-profile.ts, which owns the
// privacy allowlist. The rest of the profile (what they're building, what
// they're looking for, background, and any way to contact them) is a member
// surface and is NOT fetched here — the gate below says so out loud rather
// than teasing blurred content.
//
// noindex on purpose: real people's names must not become search results
// without their consent. generateMetadata therefore stays generic — no pitch,
// no location, no contact details.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, MapPin } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { ROLE_LABELS, STAGE_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { getPublicFounder } from "@/lib/public-profile";
import { Avatar } from "@/components/Avatar";
import { Card, Eyebrow, VerifiedBadge } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const founder = await getPublicFounder(slug);
  const noindex = { index: false, follow: false } as const;
  if (!founder) return { title: "Founder", robots: noindex };
  return {
    // Bare title — the root layout's "%s · Cofoundee" template adds the suffix.
    title: founder.fullName,
    description: `${founder.fullName} is part of the Cofoundee founder community.`,
    robots: noindex,
  };
}

export default async function PublicFounderPage({ params }: Props) {
  const { slug } = await params;
  const founder = await getPublicFounder(slug);
  if (!founder) notFound();

  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  const roles = founder.roles
    .map((r) => (ROLE_LABELS[r] ? tr(ROLE_LABELS[r]) : null))
    .filter(Boolean) as string[];
  const stageLabel = founder.stage ? STAGE_LABELS[founder.stage] : null;

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-[88px]">
      <Link
        href="/founders"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {tr("All founders")}
      </Link>

      {/* Preview — allowlisted fields only */}
      <Card padding="lg" className="lg:p-10">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar name={founder.fullName} url={founder.photoUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-d2 lg:text-d3 inline-flex items-center gap-2 flex-wrap">
              {founder.fullName}
              {founder.verified && (
                <VerifiedBadge label={tr("Verified")} size="lg" />
              )}
            </h1>

            {roles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 text-xs border border-navy/25 text-navy bg-navy/[0.03] rounded-full"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}

            {founder.location && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {provinceLabel(founder.location, locale)}
              </div>
            )}
          </div>
        </div>

        {founder.excerpt && (
          <p className="mt-8 text-ink leading-relaxed">{founder.excerpt}</p>
        )}

        {(founder.industry.length > 0 || stageLabel) && (
          <div className="mt-8 pt-6 border-t border-line flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {founder.industry.map((i) => (
              <span key={i} className="px-2 py-0.5 border border-line rounded-full">
                {i}
              </span>
            ))}
            {stageLabel && (
              <span className="px-2 py-0.5 border border-line text-gold-ink bg-gold-soft rounded-full">
                {tr(stageLabel)}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* The honest gate — say what's behind it, don't tease it. A plain div,
          not <Card>: Card is bg-white and cn() does not de-duplicate Tailwind
          utilities, so bg-cream on top of it would be a coin flip on
          stylesheet order. */}
      <div className="mt-4 bg-cream border border-line p-8 lg:p-10 rounded-xl">
        <Eyebrow className="mb-4 inline-flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" strokeWidth={2} />
          {tr("Members only")}
        </Eyebrow>
        <h2 className="text-d1 mb-3">
          {tr("This is a preview of the full profile")}
        </h2>
        <p className="text-ink leading-relaxed mb-8">
          {tr(
            "What they're building, what they're looking for in a co-founder, their background — and the ability to connect and message — are for members of the community.",
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors rounded-full"
          >
            {tr("Join free to see the full profile")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 border border-line hover:border-navy text-navy text-sm tracking-wide transition-colors rounded-xl"
          >
            {tr("Sign in")}
          </Link>
        </div>
      </div>
    </div>
  );
}
