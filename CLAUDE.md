# Cofoundee — Master Strategy

> This file is read automatically by Claude Code. It contains complete project context.
> Last updated: May 2026 — strategy pivoted from "co-founder matching" to **community-first bridge platform**.

@AGENTS.md

---

## 🎯 Vision

**The bridge for Thailand's startup ecosystem — community, partners, capital, and co-founders, in one place.**

We're not a co-founder matching app. We're the platform where Thai startups build trust over time, then unlock everything they need on top of that trust: B2B partnerships, investor intros, legal + finance advisors, and yes — co-founders too.

```
Community  ←  the trust layer (months 0–6)
    ↓
B2B Network ←  startups partnering with startups (months 3–9)
    ↓
Advisor Partners ←  legal + finance firms via partnership (months 6–12)
    ↓
Investor Intros ←  warm intros once we're trusted (months 9–18)
    ↓
Co-founder Matching ←  cherry on top, always available
```

The community is the wedge. Everything else compounds on the trust built there.

---

## 🧭 Why community-first

Online co-founder matching mostly fails (YC tried, Founders Inc tried, dating-app-for-cofounders tried). The reasons are deep:

1. **Trust isn't built through profiles.** Co-founder is a 5–10 year equity-shared relationship. People don't hand that to strangers.
2. **Signal on platforms is cheap.** Anyone can claim a great idea or strong skills. Pitches don't predict execution.
3. **The serious founders aren't online looking.** They build from existing networks. Online sign-ups are biased toward those without strong networks.
4. **Thai culture amplifies this.** เกรงใจ, face-saving, relationship-first. Five-year equity commitments don't happen via a website three weeks in.

**But community-first works because:**
- People hang out for content, conversations, events — low commitment, repeated exposure
- Trust gets built passively over months
- Once trust exists, matching/intros/partnerships happen organically
- The platform earns the right to be the bridge

This is how Indie Hackers, Y Combinator's network, and AngelList all grew. Community came first; matching/funding/services came later, on top.

---

## 🏗️ The Phased Roadmap

### Phase 0 — Community + Bridge (Months 0–12)
- **Status:** Building now
- **Pricing:** 100% FREE
- **Goal:** 500 active community members by Month 6, 1,500 by Month 12
- **Features:** Community forum (likes, comments), content hub, founder directory, B2B profiles, co-founder matching, events listings
- **Investment:** Personal savings (~฿100–150K)

### Phase 1 — Advisor Partnerships (Months 6–18)
- **Pricing:** Still FREE for users; revenue share with partners
- **Goal:** 3–5 legal firms + 2–3 finance/accounting firms onboarded as partners
- **Features:** Partner-delivered legal templates, Q&A with vetted partners, paid consultation booking
- **Revenue model:** Revenue share on consultations + sponsored content

### Phase 2 — Investor Intros (Months 12–24)
- **Pricing:** Free for founders; paid tier or per-intro fee for VCs
- **Goal:** First 10 funded deals via Cofoundee
- **Features:** Verified investor profiles, warm intro workflows, deal flow
- **Revenue model:** VC subscriptions + success fees on funded rounds

### Phase 3 — B2B Marketplace (Months 18–36)
- **Features:** Company-to-company matching, vendor marketplace, strategic alliances
- **Revenue model:** Success fees on B2B deals (฿20K–500K+ per deal)

### Phase 4 — Premium + Expansion (Year 3+)
- Premium memberships (฿299/month) for power users
- Job board (founders hiring)
- Regional expansion (Vietnam, Indonesia, Philippines)

---

## 💰 Funding Strategy

**Bootstrapped. No VC. No early investors.**

- **Phases 0–1:** Personal savings (~฿100–150K total)
- **Optional:** DEPA grant (up to ฿500K, no equity)
- **Optional:** AWS Activate credits
- **Patience > capital.** Web platforms in 2026 cost ~฿1,000/month to run.

---

## 🧠 The Product Model

### Three core flows

**1. Community + Networking** (the trust layer — primary)
- Forum: ask, share, learn (likes + comments live now)
- Content hub / insights blog
- Events listings + (later) in-person meetups
- Founder directory: who's in the community, what they're doing

**2. Matching + Connections** (built on trust)
- **B2B startup ↔ startup**: company profile type, capabilities listing, browse by company
- **Investor ↔ founder** (Phase 2): warm intros via Cofoundee, not cold algorithmic matches
- **Co-founder ↔ co-founder** (cherry on top): role-based + intent-based pairing for those who want it

**3. Partner Services** (Phase 1)
- Legal partners: templates, Q&A, consultations
- Finance partners: accounting, fundraising prep, structuring advice
- Cofoundee aggregates + distributes; partners deliver

### Co-founder matching — design (already built, not the headline)

**Every profile declares three things:**
1. **"I am..."** (Role) — Technical / Business / Product / Marketing / Finance / Domain Expert
2. **"I'm bringing..."** (Intent) — `idea` / `open` / `explore`
3. **"I'm looking for..."** (Complementary roles)

**Complement Score weights:** Role 40% / Intent 30% / Industry 15% / Stage 10% / Location+Commitment 5%

Mutual interest required before messaging unlocks. The Pitch field is mandatory (200–500 chars).

### B2B profile type (built)

Every profile is either `individual` or `company`. Company profiles add:
- `company_name`
- `capabilities` (what the company offers to partners)

Browse filter lets users view All / Individuals / Companies separately.

---

## 🎨 Design Principles

**Conservative, professional, trustworthy. Editorial — not dating-app.**

### Brand
- Law firm / private bank aesthetic (McKinsey, Baker McKenzie)
- Founders are making serious business decisions; the platform should feel that way

### Colors
- Primary: Navy `#0A1F44`
- Accent: Gold `#B8941F`
- Background: Cream `#FAFAF7`
- Ink (body): `#4A4A4A`
- Ink muted: `#888888`
- Border line: `#E2E8F0`

### Typography
- Headings: Georgia serif (English) / Noto Sans Thai (Thai locale)
- Body: Noto Sans Thai + system UI (covers Thai + Latin)
- Numbers/stats: Serif (elegant, like a finance report)

### Visual Language
- Sharp corners, no rounded buttons
- Generous whitespace, editorial layout
- Roman numerals for steps (I, II, III)
- Thin gold accent lines as section dividers
- Verified badges in gold (not blue checkmarks)

### Language Rules
- Thai users naturally code-switch — keep English loanwords (`founder`, `co-founder`, `pitch`, `MVP`, `startup`) where they sound natural in Thai
- Avoid over-formal translations that read bureaucratic
- "Express Interest" not "Like"
- "Complement Score" not "Match %"
- "Founder Directory" not "Discover"
- "The Pitch" not "Bio"

**No swipe interface ever.** Trust + commitment > velocity + dopamine.

---

## ✅ Currently Built (Phase 0)

### Working end-to-end
- Auth: email + Google + LinkedIn OAuth, password confirm, link-only confirmation flow
- Onboarding: 4-step form with B2B toggle (individual / company), Thai i18n
- Browse directory: filter by role / industry / stage / commitment / **profile type (B2B)**
- Profile pages: individual + company display variants
- Express Interest → mutual → messaging unlock (with Google Calendar invite gen)
- Community forum: posts, **likes (optimistic)**, **comments (own can delete)**
- Insights blog: DB-backed, bilingual, admin CRUD at `/admin/insights`
- Admin: insights editor, reports moderation
- Thai i18n: full coverage of marketing + app pages with natural Thai register
- Email pipeline: Supabase Auth → Resend (verified `cofoundee.co` domain)

### Not yet built
- Partner section (legal + finance firms) — Phase 1
- Investor section — Phase 2
- Events listings (static placeholder exists)
- Job board — Phase 4
- Direct messaging from community / B2B (currently DM requires mutual interest via co-founder flow)
- Premium tier / payments — Phase 4

---

## 🚀 Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- **Backend:** Next.js Server Actions + Route Handlers + Supabase service role
- **Database:** Supabase (Postgres + Auth + Storage) — Singapore region, project `fhimrhyhmdwrktfctvcc`
- **Email:** Resend (verified domain `cofoundee.co`), used both for Supabase Auth and app transactional emails
- **Hosting:** Vercel
- **Domain:** cofoundee.co (GoDaddy, M365 for `chayanonr@cofoundee.co`)
- **MCPs:** Supabase MCP authenticated, Claude Preview for dev server

**Total monthly hosting cost target:** ~฿500–1,500

---

## 🗄️ Database Schema (current)

```sql
profiles
├── id, type ('individual'|'company'), full_name, company_name, email,
├── age, location, photo_url, linkedin_url
├── i_am, intent, looking_for[], industry[], stage, commitment, runway, experience
├── pitch, why_this, skills[], capabilities[]
├── verified, onboarded, created_at, updated_at

interests / matches / messages / profile_views
forum_posts / forum_likes / forum_comments
reports
insights (bilingual, draft/published)
user_google_tokens
```

15 migrations applied (0001–0015 + recent additions), all tracked in Supabase migration history.

---

## 📅 Operating Cadence

### Now → Month 3 (foundation)
- Polish + ship community features (forum, content, networking)
- Manually recruit first 100 active community members
- Daily/weekly content (Insights blog posts)
- Start hosting small online events (Q&A sessions, founder AMAs)

### Months 3–6 (community gains traction)
- 500 active members target
- Identify natural B2B matches happening in the community
- Begin reaching out to 1–2 legal firms as Phase 1 partners

### Months 6–12 (advisor partnerships)
- 1–2 legal + 1 finance partner onboarded
- Per-consultation booking flow live
- 1,500 members
- First in-person event in Bangkok

### Months 12–24 (investor flow)
- Reach out to angel networks (Wavemaker, 500 Global, East Ventures TH partners)
- Warm-intro flow live
- First 5 funded deals via Cofoundee

---

## 📊 Success Metrics

### Phase 0 (Year 1)
- 500 community members by Month 6
- 1,500 by Month 12
- Forum: 5+ daily active posters
- Content: 1 insight published per week minimum
- Retention: 30%+ monthly active

### Phase 1 (Year 2)
- 3+ partners delivering services
- 50+ paid consultations facilitated
- First sustainable revenue stream

### Phase 2 (Year 2–3)
- 10+ funded deals via investor intros
- Press coverage in TechSauce / e27

---

## 🧠 Founder Self-Awareness

### Strengths
- Technical (can build + iterate fast)
- Co-founder doing content (free distribution)
- Lean cost structure
- Patient mindset

### Honest gaps
- 27 years old, no prior startup
- Will need advisor network
- 1 real user today — distribution is the bottleneck, not code
- Community-building is slow; need emotional stamina for 12+ months of "nothing happening"

---

## 🛡️ Brutal Truths

- **This is a 2–3 year build before meaningful revenue.**
- **Building features ≠ users.** With 1 user, every hour on code is an hour not spent recruiting members. Code is the easy 10%.
- **Community needs to be alive before anything else matters.** An empty forum is worse than no forum.
- **Partner outreach starts at month 4–6**, not month 1. You need eyeballs to pitch them.
- **Investor matching only works once you're trusted.** Don't pitch this in year 1.
- **Some users will bypass the platform once they meet.** That's fine — community trust is the long game.
- **Year 1 may feel like nothing is happening.** It is. Stay.

---

## ⚠️ Important Reminders for Claude Code

1. **Community-first** — features that help community grow > features that don't
2. **Co-founder matching is built but NOT the headline.** Don't make it the main marketing message.
3. **B2B (company profile type) is first-class**, not an afterthought
4. **Design for trust** — no swipes, no gamification, no urgency hacks
5. **Mutual interest required** before messaging unlocks (current pattern)
6. **Free for all users** in Phase 0–1
7. **Build for Thailand first** — Thai + English UI, PDPA compliant, Thai cultural register
8. **Mobile responsive is enough** — no native mobile app
9. **Database is built for B2B + investors + partners already** — schema extensibility is in place
10. **Honesty over agreement** — when user wants to ship a feature that's premature, push back

---

## 🎯 The Long Vision

- **Year 1:** Community + bridge for Thai startup ecosystem
- **Year 2:** Advisor partnerships generating first revenue
- **Year 3:** Investor flow + premium tier
- **Year 5:** Thailand's go-to platform for the founder journey
- **Year 10:** SEA's startup operating system

Each phase compounds on the trust built in the prior phase.

---

## 🚦 Active project status (May 2026)

- **Users:** 1 real onboarded founder (Ratthamontree Burimas)
- **Code:** Phase 0 features mostly complete; community + B2B + co-founder all live
- **Distribution:** Not started — biggest gap right now
- **Strategy clarity:** Just pivoted from "co-founder matching" to "community-first bridge platform" (May 2026)

---

**Built by founders, for the Thai startup community. 🚀**
