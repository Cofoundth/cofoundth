import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { listPublicFounders } from "@/lib/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { msAgoISO, DAY_MS } from "@/lib/time";
import { HeroSection } from "@/components/marketing/landing/HeroSection";
import { ForFoundersSection } from "@/components/marketing/landing/ForFoundersSection";
import { FeatureBlock } from "@/components/marketing/landing/FeatureBlock";
import { QuoteBand } from "@/components/marketing/landing/QuoteBand";
import {
  HappeningSection,
  type HappeningItem,
} from "@/components/marketing/landing/HappeningSection";
import { FaqSection } from "@/components/marketing/landing/FaqSection";
import { LandingCta } from "@/components/marketing/landing/LandingCta";
import { DirectoryVisual } from "@/components/marketing/landing/visuals/DirectoryVisual";
import { PartnershipVisual } from "@/components/marketing/landing/visuals/PartnershipVisual";
import { IntroVisual } from "@/components/marketing/landing/visuals/IntroVisual";

export const revalidate = 60; // refresh live numbers every minute

// Section order follows onfound.com, measured off their live DOM at the
// founder's direction:
//   hero → persona grid → feature (text left) → quote band → feature (reversed)
//   → 3-up activity grid → feature (text left) → 2-col FAQ → closing CTA
// Their .wrap container is already max-width 1120px, the same as ours, so the
// rhythm transplanted without changing our grid. Where their structure leans on
// something we do not have — a photographic hero, a customer testimonial, a
// four-figure member count — we keep the shape and fill it with what is true.
//
// The feature copy is the four pillars this page used to render as a 2x2 card
// grid. Reusing the exact English strings keeps their existing Thai.
const PILLARS = {
  community: {
    label: "Community",
    title: "Where Thai founders meet",
    body: "Forum, content, and events for serious Thai startup builders. Ask questions, share what you're shipping, and meet the people who'll shape your journey.",
  },
  b2b: {
    label: "B2B Network",
    title: "Companies finding companies",
    body: "Startups partner with startups — vendors, integrations, distribution, co-marketing. Send a partnership request, get a response, unlock messaging. No mutual-interest gate.",
  },
  advisors: {
    body: "Partnered with vetted Thai law firms and accountants. Get advice on incorporation, contracts, fundraising structure — without paying for a full retainer.",
  },
  capital: {
    body: "Not cold algorithmic matching. Once you're active in the community, we make warm introductions to angel networks and VCs that fit your stage.",
  },
};

export default async function LandingPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  // Live platform data — service-role to read past RLS
  const admin = createAdminClient();
  const sevenDaysAgo = msAgoISO(7 * DAY_MS);
  const thirtyDaysAgo = msAgoISO(30 * DAY_MS);
  const [
    featured,
    { data: recentMilestones },
    { count: totalFounders },
    { count: foundersThisWeek },
  ] = await Promise.all([
    // Logged-out surface → goes through the public allowlist, which also keeps
    // investors (whose presence is confidential) out of this list.
    listPublicFounders(6),
    admin
      .from("forum_posts")
      .select("id, author_id, content, kind, image_url, link_url, created_at")
      .eq("hidden", false)
      .in("kind", ["milestone", "show_and_tell"])
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(3),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("profile_complete", true)
      .eq("suspended", false),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("profile_complete", true)
      .eq("suspended", false)
      .gte("created_at", sevenDaysAgo),
  ]);

  // Hydrate milestone authors
  const milestoneAuthorIds = Array.from(
    new Set((recentMilestones ?? []).map((m) => m.author_id as string)),
  );
  const { data: milestoneAuthors } = milestoneAuthorIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", milestoneAuthorIds)
    : { data: [] };
  const milestoneAuthorMap = new Map(
    (milestoneAuthors ?? []).map((a) => [a.id as string, a]),
  );

  const happening: HappeningItem[] = (recentMilestones ?? []).map((m) => ({
    id: m.id as string,
    authorName:
      (milestoneAuthorMap.get(m.author_id as string)?.full_name as
        | string
        | null) ?? "",
    content: (m.content as string) ?? "",
    kind: m.kind as string,
    imageUrl: (m.image_url as string | null) ?? null,
    linkUrl: (m.link_url as string | null) ?? null,
    createdAt: m.created_at as string,
  }));

  return (
    <>
      <HeroSection
        locale={locale}
        founders={featured}
        totalFounders={totalFounders ?? 0}
        foundersThisWeek={foundersThisWeek ?? 0}
      />

      <ForFoundersSection locale={locale} />

      <FeatureBlock
        eyebrow={tr(PILLARS.community.label)}
        title={tr(PILLARS.community.title)}
        paragraphs={[tr(PILLARS.community.body)]}
        ctaLabel={tr("Browse founders")}
        ctaHref="/founders"
        visual={<DirectoryVisual locale={locale} />}
      />

      <QuoteBand locale={locale} />

      <FeatureBlock
        reverse
        eyebrow={tr(PILLARS.b2b.label)}
        title={tr(PILLARS.b2b.title)}
        paragraphs={[tr(PILLARS.b2b.body)]}
        visual={<PartnershipVisual />}
      />

      <HappeningSection items={happening} locale={locale} />

      {/* No CTA on purpose — neither of these is live yet, and a button that
          goes nowhere is exactly the kind of promise this page avoids. */}
      <FeatureBlock
        eyebrow={tr("Coming next")}
        title={tr("Advisors and capital, once you're trusted.")}
        paragraphs={[tr(PILLARS.advisors.body), tr(PILLARS.capital.body)]}
        visual={<IntroVisual locale={locale} />}
      />

      <FaqSection locale={locale} />

      <LandingCta locale={locale} founderCount={totalFounders ?? 0} />
    </>
  );
}
