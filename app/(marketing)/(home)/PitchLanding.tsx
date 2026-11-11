// The pitch landing: what / serves until the maker shelf has enough on it to
// stand as the front door (FRONT_DOOR_MIN_PRODUCTS in
// ../products/shelf-data.ts). Its own component, rather than inline in the
// page, so the live-data reads below run ONLY on this arm — the shelf arm must
// not pay for founders, milestones or counts it does not render.

import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import {
  listPublicFounders,
  countPublicFounders,
} from "@/lib/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPubliclyAttributable } from "@/lib/public-author";
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
// grid, since edited down: one idea per paragraph, and the two longest runs
// split in two so the 488px column reads light instead of dense.
const PILLARS = {
  community: {
    label: "Community",
    title: "Where Thai founders meet",
    body: [
      "Forum, content, and events for people serious about building.",
      "Ask, share what you're shipping, meet the people who'll shape it.",
    ],
  },
  b2b: {
    label: "B2B Network",
    title: "Companies finding companies",
    body: [
      "Startups partner with startups — vendors, integrations, distribution.",
      "Send a request, get a reply, start talking. No mutual-interest gate.",
    ],
  },
  advisors: {
    body: "Vetted Thai law firms and accountants, without a full retainer.",
  },
  capital: {
    body: "And warm intros to investors who fit your stage — once you're known here.",
  },
};

// "Happening now": the newest MILESTONES, and only milestones.
//
// It used to take `show_and_tell` too, which made adding a product an
// announcement on the public front page. Products are added quietly
// (CLAUDE.md, Language Rules): the deck and their own page show them, nothing
// announces them. Milestones are still this section's whole content.
//
// AND ITS AUTHORS ARE GATED, as they never were. The section credits each item
// to its author by name, to every anonymous visitor and to crawlers, and links
// to /p/<id> — so it applies the same author test /p/<id> does
// (lib/public-author.ts isPubliclyAttributable: not suspended, not a bot,
// founder or explorer). Before this, any non-hidden milestone in the window
// went on the front page whoever wrote it, a suspended account included.
// FAILS CLOSED: a failed author read shows nothing. The development-only
// test-account allowance (lib/test-accounts.ts) deliberately does NOT apply
// here.
const HAPPENING_SHOWN = 3;
// Read before the author gate drops anyone, so a moderated author in the
// window does not leave the section short. Same idea as /p/<id>'s
// PREVIEW_FETCH.
const HAPPENING_FETCH = 12;

export async function PitchLanding() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  // Live platform data — service-role to read past RLS
  const admin = createAdminClient();
  const sevenDaysAgo = msAgoISO(7 * DAY_MS);
  const thirtyDaysAgo = msAgoISO(30 * DAY_MS);
  const [
    featured,
    { data: recentMilestones },
    totalFounders,
    { count: foundersThisWeek },
  ] = await Promise.all([
    // Logged-out surface → goes through the public allowlist, which also keeps
    // investors (whose presence is confidential) out of this list.
    listPublicFounders(6),
    admin
      .from("forum_posts")
      .select("id, author_id, content, kind, image_url, link_url, created_at")
      .eq("hidden", false)
      .eq("kind", "milestone")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(HAPPENING_FETCH),
    // Same allowlist the directory uses, so the number on this page agrees
    // with the number of founders a visitor can actually open.
    countPublicFounders(),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("profile_complete", true)
      .eq("suspended", false)
      .gte("created_at", sevenDaysAgo),
  ]);

  // The authors, and the gate: only an author isPubliclyAttributable() passes
  // is in the map, so a milestone whose author is not in it is dropped. All
  // three gate columns are selected — the predicate reads a missing
  // `suspended` or `is_bot` as "not set" (see lib/public-author.ts).
  const milestoneAuthorIds = Array.from(
    new Set((recentMilestones ?? []).map((m) => m.author_id as string)),
  );
  const { data: milestoneAuthors, error: authorsError } =
    milestoneAuthorIds.length
      ? await admin
          .from("profiles")
          .select("id, full_name, suspended, is_bot, account_type")
          .in("id", milestoneAuthorIds)
      : { data: [], error: null };
  const milestoneAuthorMap = new Map(
    (authorsError ? [] : (milestoneAuthors ?? []))
      .filter(isPubliclyAttributable)
      .map((a) => [a.id as string, a]),
  );

  const happening: HappeningItem[] = (recentMilestones ?? [])
    .filter((m) => milestoneAuthorMap.has(m.author_id as string))
    .slice(0, HAPPENING_SHOWN)
    .map((m) => ({
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
        totalFounders={totalFounders}
        foundersThisWeek={foundersThisWeek ?? 0}
      />

      <ForFoundersSection locale={locale} />

      <FeatureBlock
        eyebrow={tr(PILLARS.community.label)}
        title={tr(PILLARS.community.title)}
        paragraphs={PILLARS.community.body.map(tr)}
        ctaLabel={tr("Browse founders")}
        ctaHref="/founders"
        visual={<DirectoryVisual locale={locale} />}
      />

      <QuoteBand locale={locale} />

      <FeatureBlock
        reverse
        eyebrow={tr(PILLARS.b2b.label)}
        title={tr(PILLARS.b2b.title)}
        paragraphs={PILLARS.b2b.body.map(tr)}
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

      <LandingCta locale={locale} founderCount={totalFounders} />
    </>
  );
}
