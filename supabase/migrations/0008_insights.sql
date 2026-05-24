-- Cofoundee — Insights (blog) storage.
--
-- Replaces the hardcoded INSIGHTS const in lib/insights.ts so posts can be
-- added/edited without redeploys. Bilingual: same slug used across locales,
-- one row per (slug, locale) pair.
--
-- Writes are gated server-side via isAdminEmail() + service-role client;
-- RLS only needs to allow public read of published rows.

create type insight_status as enum ('draft', 'published');

create table insights (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  locale        text not null,
  title         text not null,
  excerpt       text not null,
  body          text not null,
  category      text not null,
  reading_time  integer not null default 5,
  status        insight_status not null default 'draft',
  author_id     uuid references profiles (id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (slug, locale),
  constraint locale_check    check (locale in ('en', 'th')),
  constraint slug_format     check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint title_length    check (char_length(title) between 1 and 200),
  constraint excerpt_length  check (char_length(excerpt) between 1 and 500),
  constraint body_length     check (char_length(body) between 1 and 50000),
  constraint reading_sanity  check (reading_time between 1 and 120)
);

create index insights_published_idx
  on insights (status, published_at desc)
  where status = 'published';

create index insights_slug_idx on insights (slug);

create trigger insights_set_updated_at
before update on insights
for each row execute function set_updated_at();

-- RLS: anyone (incl. anon) can read published rows; writes go through the
-- service-role client server-side, so no insert/update/delete policies needed.
alter table insights enable row level security;

create policy "insights_select_published"
  on insights for select
  to anon, authenticated
  using (status = 'published');

-- Seed: import the three Phase 1 hardcoded posts as published English rows.
insert into insights (slug, locale, title, excerpt, body, category, reading_time, status, published_at)
values
  (
    'finding-the-right-co-founder', 'en',
    'How to find the right co-founder, not just any co-founder',
    'The co-founder decision is the biggest one most founders make. Treat it like a business marriage, not a roommate match.',
    E'Picking a co-founder is the single decision that has the biggest impact on whether your startup succeeds. More than the idea, the market, or even early funding.\n\nWe see four traps Thai founders fall into:\n\n**1. Convenience over complementarity.** Picking someone you already know — a school friend, a former colleague — because the search is easier. The result: a team that looks the same, thinks the same, and can''t cover each other''s blind spots.\n\n**2. Skills-only matching.** Yes, complementary skills matter (technical + business is canonical). But conviction, work style, and how you handle disagreement matter just as much.\n\n**3. Skipping the trial.** Two or three coffee meetings isn''t enough. Spend two weeks building something together. Argue, iterate, see how the relationship survives stress.\n\n**4. Avoiding hard conversations early.** Equity split, decision rights, what happens if one of you wants to leave — these get harder, not easier, the longer you defer them.\n\nThe Cofoundee matching model is designed to surface complementarity by intent, not just skill. An "idea-haver" looking for an "open" technical co-founder is structurally aligned. Two idea-havers in the same domain are usually not.',
    'Co-founder matching', 6, 'published', '2026-05-12T00:00:00Z'
  ),
  (
    'why-complementary-skills-matter', 'en',
    'Why complementary skills beat similar passions',
    'Two product people with the same vision will make twice as many product decisions and zero distribution decisions.',
    E'The most common founder mistake is recruiting people who look just like them.\n\nTwo engineers will build a beautiful product nobody knows about. Two business people will sell a vision they can''t ship. The combinations that consistently win in Thailand:\n\n- **Technical + Business.** Classic for B2B SaaS. One ships, the other sells.\n- **Domain Expert + Builder.** Right for vertical AI, healthtech, fintech — domain knowledge unlocks the right product.\n- **Product + Growth.** Consumer apps live or die on product loops and distribution.\n\nWhat "complementary" doesn''t mean:\n- Different personalities (you still need to like working together)\n- Different values (you need to be aligned on what matters)\n- Different ambitions (a 1B exit vs. lifestyle business is a fatal split)\n\nLook for **complementary execution surface** but **aligned values and ambition**.',
    'Team building', 4, 'published', '2026-05-08T00:00:00Z'
  ),
  (
    'building-in-thailand-2026', 'en',
    'Building a startup in Thailand: what''s actually changed in 2026',
    'AI tooling dropped the cost of building. Government grants are real. Investor appetite is up. Here''s what that means for your founder strategy.',
    E'Four shifts that materially affect a Thai founding team in 2026:\n\n**1. AI tooling has collapsed build cost.** What took ten engineers in 2020 now takes two. The implication: smaller teams, faster MVPs, less need for outside funding before revenue.\n\n**2. DEPA + NIA grants are accessible.** Up to ฿500K and ฿300K respectively. Non-dilutive. The applications are tractable. Most founders don''t apply because they assume they won''t qualify — most actually do.\n\n**3. SEA-wide investor appetite for Thai startups is back.** AngelList, Wavemaker, 500 Global, East Ventures are all actively writing checks in the ฿5M–฿50M range. The bar is real revenue or extraordinary team, not pitch decks.\n\n**4. Remote-first is normalized.** Bangkok-centric teams are no longer mandatory. The best technical co-founder for your fintech idea might be in Chiang Mai or Khon Kaen.\n\nWhat hasn''t changed: trust networks, the speed of word-of-mouth in the Thai ecosystem, and the importance of starting before you''re "ready."',
    'Ecosystem', 8, 'published', '2026-05-04T00:00:00Z'
  )
on conflict (slug, locale) do nothing;
