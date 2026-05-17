// Content hub for Phase 1 — hardcoded articles.
// Migrate to a CMS or markdown collection when content velocity demands it.

export type Insight = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  readingTime: number;
  publishedAt: string;
};

export const INSIGHTS: Insight[] = [
  {
    slug: "finding-the-right-co-founder",
    title: "How to find the right co-founder, not just any co-founder",
    excerpt:
      "The co-founder decision is the biggest one most founders make. Treat it like a business marriage, not a roommate match.",
    category: "Co-founder matching",
    readingTime: 6,
    publishedAt: "2026-05-12",
    body: `Picking a co-founder is the single decision that has the biggest impact on whether your startup succeeds. More than the idea, the market, or even early funding.

We see four traps Thai founders fall into:

**1. Convenience over complementarity.** Picking someone you already know — a school friend, a former colleague — because the search is easier. The result: a team that looks the same, thinks the same, and can't cover each other's blind spots.

**2. Skills-only matching.** Yes, complementary skills matter (technical + business is canonical). But conviction, work style, and how you handle disagreement matter just as much.

**3. Skipping the trial.** Two or three coffee meetings isn't enough. Spend two weeks building something together. Argue, iterate, see how the relationship survives stress.

**4. Avoiding hard conversations early.** Equity split, decision rights, what happens if one of you wants to leave — these get harder, not easier, the longer you defer them.

The CoFound.th matching model is designed to surface complementarity by intent, not just skill. An "idea-haver" looking for an "open" technical co-founder is structurally aligned. Two idea-havers in the same domain are usually not.`,
  },
  {
    slug: "why-complementary-skills-matter",
    title: "Why complementary skills beat similar passions",
    excerpt:
      "Two product people with the same vision will make twice as many product decisions and zero distribution decisions.",
    category: "Team building",
    readingTime: 4,
    publishedAt: "2026-05-08",
    body: `The most common founder mistake is recruiting people who look just like them.

Two engineers will build a beautiful product nobody knows about. Two business people will sell a vision they can't ship. The combinations that consistently win in Thailand:

- **Technical + Business.** Classic for B2B SaaS. One ships, the other sells.
- **Domain Expert + Builder.** Right for vertical AI, healthtech, fintech — domain knowledge unlocks the right product.
- **Product + Growth.** Consumer apps live or die on product loops and distribution.

What "complementary" doesn't mean:
- Different personalities (you still need to like working together)
- Different values (you need to be aligned on what matters)
- Different ambitions (a 1B exit vs. lifestyle business is a fatal split)

Look for **complementary execution surface** but **aligned values and ambition**.`,
  },
  {
    slug: "building-in-thailand-2026",
    title: "Building a startup in Thailand: what's actually changed in 2026",
    excerpt:
      "AI tooling dropped the cost of building. Government grants are real. Investor appetite is up. Here's what that means for your founder strategy.",
    category: "Ecosystem",
    readingTime: 8,
    publishedAt: "2026-05-04",
    body: `Four shifts that materially affect a Thai founding team in 2026:

**1. AI tooling has collapsed build cost.** What took ten engineers in 2020 now takes two. The implication: smaller teams, faster MVPs, less need for outside funding before revenue.

**2. DEPA + NIA grants are accessible.** Up to ฿500K and ฿300K respectively. Non-dilutive. The applications are tractable. Most founders don't apply because they assume they won't qualify — most actually do.

**3. SEA-wide investor appetite for Thai startups is back.** AngelList, Wavemaker, 500 Global, East Ventures are all actively writing checks in the ฿5M–฿50M range. The bar is real revenue or extraordinary team, not pitch decks.

**4. Remote-first is normalized.** Bangkok-centric teams are no longer mandatory. The best technical co-founder for your fintech idea might be in Chiang Mai or Khon Kaen.

What hasn't changed: trust networks, the speed of word-of-mouth in the Thai ecosystem, and the importance of starting before you're "ready."`,
  },
];

export function getInsightBySlug(slug: string): Insight | undefined {
  return INSIGHTS.find((i) => i.slug === slug);
}
