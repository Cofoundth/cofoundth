# Cofoundee — Master Strategy

> This file is read automatically by Claude Code. It contains complete project context.
> Last updated: May 2026

@AGENTS.md

---

## 🎯 Vision

**Build the platform that grows with Thai businesses from idea to exit.**

Not just co-founder matching. A multi-decade business that captures founders early and serves them through their entire journey.

```
Idea → Co-founder → Build → Funding → Hire → Partners → Scale → Exit
       └────────── All on Cofoundee ──────────┘
```

---

## 🏗️ The Phased Roadmap

### Phase 1 — Co-Founder Matching (Year 1)
- **Status:** Build this now
- **Pricing:** 100% FREE
- **Goal:** 500 active users by Month 6
- **Features:** Role-based matching, browse directory, Express Interest, mutual-interest messaging, community forum
- **Investment:** None — bootstrap with ~฿100-150K personal savings

### Phase 2 — Investor Introductions (Year 2)
- **Pricing:** Still FREE
- **Goal:** 1,500-2,000 users, real funded deals happening
- **Features:** Verified investor profiles, introduction requests, deal flow
- **Investment:** Still bootstrapped — apply for DEPA grant if needed

### Phase 3 — Monetization Begins (Year 3)
- **Pricing:** Premium tier ฿299/month launches
- **Features:** Legal services hub, job board for startups, premium memberships
- **Revenue model:** Subscriptions + per-document legal fees + job board listings
- **Goal:** First sustainable revenue

### Phase 4 — B2B Partnership Matching (Year 4+)
- **Features:** Company-to-company matching, strategic alliances, vendor marketplace
- **Revenue model:** Success fees on partnerships (฿20K-500K+ per deal)
- **Goal:** Big revenue acceleration

### Phase 5 — Regional Expansion or Deeper Thai Market
- Vietnam, Indonesia, Philippines
- Or deeper services in Thailand
- Decision based on Phase 1-4 traction

---

## 💰 Funding Strategy

**Bootstrapped. No VC. No early investors.**

- **Phase 1+2:** Personal savings (~฿100-150K total for 2 years)
- **Optional:** One DEPA grant application (up to ฿500K, no equity)
- **Optional:** AWS Activate credits (free hosting)
- **Optional:** Accelerator for mentorship only (skip equity-heavy ones)

**Why bootstrap:**
- Web platforms are cheap to maintain in 2026 (~฿1,000/month operating cost)
- 100% ownership compounds massively over time
- No investor pressure to monetize early
- Patience becomes your competitive advantage

---

## 🧠 The Matching Model (Core Phase 1 Logic)

**Every profile declares three things:**

**1. "I am..."** (Role)
- Technical / Business / Product / Marketing / Finance / Domain Expert

**2. "I'm bringing..."** (Intent)
- `idea` — Has a specific idea/vision
- `open` — Has skills, open to joining someone's idea
- `explore` — Wants to brainstorm and discover together

**3. "I'm looking for..."** (Complementary roles)

Plus filters: Industry, Stage, Location, Commitment

**Matching logic:** Complementary intent + role + industry alignment

**Complement Score weights:**
- Role complementarity (40%)
- Intent alignment (30%)
- Industry overlap (15%)
- Stage match (10%)
- Location & commitment (5%)

**The Pitch field is MANDATORY** — it's the matching fuel. 200–500 chars.

**Conviction signals to filter tire-kickers:**
- Commitment level (Full-time / Part-time / Side project)
- Financial runway (3 / 6 / 12 / 18+ months)
- Founder experience (First-time / 1-2 / 3+)
- Why this, why now

---

## 🎨 Design Principles

**Conservative, professional, trustworthy. NOT a dating app aesthetic.**

### Brand
- Think law firm or private bank (McKinsey, Baker McKenzie)
- Founders are making serious career decisions

### Colors
- Primary: Navy `#0A1F44`
- Accent: Gold `#B8941F`
- Background: Cream `#FAFAF7`
- Ink (body): `#4A4A4A`
- Ink muted: `#888888`
- Border line: `#E2E8F0`

### Typography
- Headings: Georgia serif
- Body: Noto Sans Thai + system UI (covers Thai + Latin)
- Numbers/stats: Serif (elegant, like a finance report)

### Visual Language
- Sharp corners, no rounded buttons
- Generous whitespace, editorial layout
- Roman numerals for steps
- Thin gold accent lines as section dividers
- Verified badges in gold (not blue checkmarks)

### Language Rules
- "Express Interest" not "Like"
- "Complement Score" not "Match %"
- "Founder Directory" not "Discover"
- "Verified founder" not "Pro user"
- "The Pitch" not "Bio"
- "Capital Partners" (Phase 2) not "Investors"

**No swipe interface ever.** Co-founder selection is a serious business decision.

---

## ✅ Phase 1 Build Scope (MVP)

### Critical (Must Have)
- User registration & authentication (email + Google OAuth + LinkedIn OAuth)
- Profile creation with role-based model
- Browse directory with filters
- Express Interest flow
- Mutual interest unlock messaging
- Email notifications

### Important (Build Soon After)
- Community forum (basic)
- Content hub / blog
- Profile verification
- Admin moderation tools

### Nice to Have
- Legal templates (static downloads)
- Event listings

### DO NOT BUILD in Phase 1
- ❌ Investor matching
- ❌ Paid subscriptions / payments
- ❌ Mobile app (web responsive is enough)
- ❌ Swipe interface
- ❌ In-app video calls (users use Google Meet/LINE on their own)
- ❌ In-app calendar booking (Google Calendar URL templates only)
- ❌ Anything related to investors

**Multi-language (Thai + English)** — Phase 1 ships with both. Thai is the primary market; English is included since most Thai founders use both.

---

## 🚀 Tech Stack (Current)

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Backend:** Next.js Server Actions + Route Handlers
- **Database:** Supabase (Postgres + Auth + Storage) — Singapore region
- **Hosting:** Vercel
- **Email:** Resend
- **Auth:** Supabase Auth (Google OAuth, email/password, LinkedIn OAuth code present but hidden)
- **Analytics:** TBD (Plausible recommended)

**Total monthly hosting cost target:** ~฿500–1,500

---

## 🗄️ Database Schema (Designed for Phase 4 too)

```sql
profiles
├── id (uuid, PK, references auth.users)
├── type (enum: individual, company)  -- Phase 4 extensibility
├── full_name (text)
├── company_name (text, nullable)     -- Phase 4
├── email (text)                      -- synced from auth.users
├── age (int, nullable)
├── location (text)
├── photo_url (text)
├── linkedin_url (text)
├── i_am (enum: technical, business, product, marketing, finance, domain_expert)
├── intent (enum: idea, open, explore)
├── looking_for (array of profile_role)
├── industry (array of text)
├── stage (enum: exploring, building, traction, raising)
├── commitment (enum: full_time, part_time, side_project)
├── runway (enum: three_months, six_months, twelve_months, eighteen_plus)
├── experience (enum: first_time, one_to_two, three_plus)
├── pitch (text, 200-500 chars when set)
├── why_this (text)
├── skills (array of text)
├── capabilities (array of text)      -- Phase 4 B2B
├── verified (boolean, default false)
├── onboarded (boolean, default false)
├── created_at, updated_at

interests
├── id, from_profile_id, to_profile_id, note, status, created_at

matches
├── id, profile_a_id, profile_b_id, created_at (canonical ordering)

messages
├── id, match_id, sender_id, content, read_at, created_at

profile_views
├── id, viewer_id, viewed_id, viewed_at

forum_posts
├── id, author_id, title, content, created_at, updated_at

reports
├── id, reporter_id, target_kind, target_id, reason, status, created_at

user_google_tokens (dormant — for Phase 1.5+ Google Calendar API)
├── user_id, access_token, refresh_token, expires_at, scope
```

**Key design principle:** Build extensibility for Phase 4 (B2B) now, even though we're only doing individuals in Phase 1. Adding `type`, `company_name`, `capabilities` columns up front means Phase 4 doesn't need a destructive migration.

---

## 📅 90-Day Launch Plan

### Month 1 — Build
- Register Thai company (DBD online)
- Build MVP
- Apply to DEPA grant (parallel)
- Start posting content (TikTok, LinkedIn, Facebook)

### Month 2 — Soft Launch
- Manually recruit first 100 founders
- Founding member lifetime free premium (future benefit)
- One online networking event
- Iterate based on feedback

### Month 3 — Public Launch
- Press push via Techsauce, e27
- First in-person event in Bangkok
- Target 300+ users

### Month 4-6 — Optimize
- Refine matching quality
- Build community engagement
- Reach 500 users
- Begin Phase 2 prep

---

## 📊 Success Metrics

### Phase 1 (Year 1)
- 500 active users by Month 6
- 50+ successful co-founder matches
- 70%+ user satisfaction
- Strong organic growth

### Phase 2 (Year 2)
- 1,500–2,000 active users
- First investor introductions
- 10+ funded deals via platform
- Press coverage and partnerships

### Phase 3+ (Year 3+)
- First sustainable revenue
- ฿200K–500K/month gross revenue
- Multiple revenue streams
- Recognized brand in Thai startup ecosystem

---

## 🧠 Founder Psychology — What I Know About Me

### Strengths
- Technical co-founder (can build and iterate fast)
- Co-founder doing content (free distribution)
- Lean cost structure (can survive long-term)
- Patient mindset (right for community building)
- No investor pressure (can take time)

### Honest gaps
- 27, no prior startup experience
- Will need to say "I don't know" often
- Need to build network of advisors
- Need emotional stamina for slow growth

### Mindset
- I'm building this WITH founders, not above them
- "I don't know, let me find out" is a strength, not weakness
- Reliability comes from showing up consistently, not credentials
- The community grows together

---

## 🛡️ Brutal Truths I've Accepted

- This is a 2–3 year build to meaningful revenue
- Free for 2 years means I personally fund operations
- Network effects need critical mass before monetization works
- Some users will bypass the platform once they meet
- Retention is harder than acquisition
- I will feel imposter syndrome regularly
- Year 1 may feel like nothing is happening
- Patience is my competitive advantage

---

## 🎯 The Long Vision

- **Year 1:** Co-founder matching platform
- **Year 3:** Multi-service startup hub
- **Year 5:** Thailand's go-to platform for the founder journey
- **Year 10:** SEA's startup operating system

Each phase builds on the last. Each user grows with the platform.

**One founder. 13 years. Multiple revenue moments per user.**

That's the real opportunity.

---

## ⚠️ Important Reminders for Claude Code

1. **Phase 1 only** — Don't build investor features, payments, or video calls
2. **But design for Phase 4** — Database extensibility now saves migration pain later
3. **Conservative design** — No swipe interfaces, no dating-app vibe
4. **Role-based matching** is the core innovation — get this right
5. **The Pitch field is mandatory** — it's the matching fuel
6. **Mutual interest required** before messaging unlocks
7. **Free for all users** in Phase 1 — no paywalls anywhere
8. **Build for Thailand first** — Thai + English UI, PDPA compliant
9. **Mobile responsive is enough** — no native mobile app
10. **Bootstrapped mindset** — every feature should justify its operating cost

---

## 💪 Mantras to Remember

- "Build the platform I would have wanted as a founder"
- "Free for 2 years builds the trust I need for 20 years"
- "I don't know" makes me MORE trustworthy, not less
- "Reliability is shown by showing up, not by experience"
- "Patience is my unfair advantage"
- "Phase 1 first, vision later"

---

**Built by founders, for founders. The platform that grows with you. 🚀**
