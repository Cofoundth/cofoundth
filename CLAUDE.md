# CoFound.th — Project Handoff Brief

> This file is read automatically by Claude Code. It contains complete project context.
> Last updated: May 2026

@AGENTS.md

---

## 🎯 What We're Building

**CoFound.th** is a co-founder matching platform for Thai entrepreneurs. Phase 1 focuses exclusively on connecting founders with complementary co-founders. Investor matching comes in Phase 2 (not now).

**One-sentence pitch:** The platform for Thai founders to find their co-founder based on complementary skills, intent, and industry — not random swipes.

---

## ✅ Phase 1 Scope (Build ONLY These)

### Critical (Must Have)
- User registration & authentication (email + LinkedIn OAuth)
- Profile creation with role-based model (see below)
- Browse directory with filters
- Express Interest flow
- Mutual interest unlock messaging
- Email notifications

### Important (Build Soon After)
- Community forum (basic)
- Content hub / blog
- Profile verification (email + LinkedIn)
- Admin moderation tools

### Nice to Have (Don't Block on These)
- Legal templates library (just static downloads)
- Event listings
- Search analytics

### DO NOT BUILD in Phase 1
- ❌ Investor matching
- ❌ Paid subscriptions / payment integration
- ❌ Mobile app (web responsive is enough)
- ❌ Swipe interface
- ❌ Video calls (users will use Google Meet / Zoom / LINE on their own)
- ❌ Calendar booking
- ❌ Multi-language (Thai-only first)
- ❌ Anything related to investors

**Phase 1 is 100% FREE for all users. No payments. Focus on growth.**

---

## 🧠 The Matching Model (Core Logic)

This is the most important part. Get this right.

### Every Profile Declares Three Things:

**1. "I am..."** (Role)
- Technical
- Business
- Product
- Marketing
- Finance
- Domain Expert

**2. "I'm bringing..."** (Intent)
- `idea` — Has a specific idea/vision
- `open` — Has skills, open to joining someone's idea
- `explore` — Wants to brainstorm and discover together

**3. "I'm looking for..."** (Complementary roles — can select multiple)
- Same options as Role above

### Matching Logic

```
You: Role = X, Intent = Y, Looking for = [Z1, Z2]
Match: Their Role is in [Z1, Z2] AND their Looking for contains X
```

Plus filter by:
- Industry (FinTech, HealthTech, E-commerce, SaaS, AI, PropTech, Consumer, etc.)
- Stage (Just exploring / Building MVP / Have traction / Raising)
- Location (Bangkok / Chiang Mai / Phuket / Remote OK / Other)
- Commitment (Full-time / Part-time / Side project)

### Complement Score (instead of "Match Score")

Calculate based on:
- Role complementarity (40%)
- Intent alignment (30%)
- Industry match (15%)
- Stage match (10%)
- Location/commitment match (5%)

---

## 📝 Profile Required Fields

### Basic
- Full name
- Age (optional but helpful)
- Location (city or "Remote OK")
- Profile photo
- LinkedIn URL (for verification)

### Role Declaration
- I am (single select)
- I'm bringing (single select: idea / open / explore)
- I'm looking for (multi-select roles)

### The Pitch (MANDATORY — this is the matching fuel)
- 200–500 character text field
- Idea-havers describe their idea
- Skill-bringers describe what they can offer
- Explorers describe their interests

### Skills & Expertise
- Tag-based input (React, Sales, Product Design, etc.)
- Industry tags
- Years of experience

### Conviction Signals (builds trust, filters tire-kickers)
- Commitment level (Full-time / Part-time / Side project)
- Financial runway (3 / 6 / 12 / 18+ months)
- Founder experience (First-time / 1-2 ventures / 3+ ventures)
- Why this, why now (open text)

---

## 🎨 Design System

### Brand: Conservative, Professional, Trustworthy

**This is NOT a dating app aesthetic.** Think law firm or private bank — McKinsey / Baker McKenzie. Founders are making serious career decisions.

### Color Palette
```css
--navy-primary: #0A1F44      /* Main brand color */
--navy-dark: #0F2654         /* Hover states */
--gold-accent: #B8941F       /* Subtle accents, badges */
--cream-bg: #FAFAF7          /* Page background */
--slate-text: #4A4A4A        /* Body text */
--slate-light: #888888       /* Muted text */
--white: #FFFFFF
--border: #E2E8F0
```

### Typography
- **Headings:** Georgia serif (or similar — Lora, Source Serif Pro)
- **Body & UI:** System UI sans-serif
- **Numbers/stats:** Serif (elegant, like a finance report)

### Visual Language
- **Sharp corners** on buttons (no rounded — too playful)
- **Generous whitespace** — editorial layout
- **Roman numerals** (I, II, III) for steps and sections
- **Thin gold accent lines** as section dividers
- **Verified badges** in gold, not blue checkmarks
- **No emoji-heavy design** — use icons sparingly

### Language Rules
- "Express Interest" not "Like" or "Match"
- "Complement Score" not "Match %"
- "Founder Directory" not "Discover" or "Browse Singles"
- "Verified founder" not "Pro user"
- "The Pitch" not "Bio" or "About Me"

---

## 🛠️ Recommended Tech Stack

You said you'd figure it out in Claude Code. Here are suggestions to consider:

### Option A: Fastest Time-to-Market
- **Frontend:** Next.js 14+ (App Router) + TailwindCSS
- **Backend:** Next.js API routes + Server Actions
- **Database:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Coolify on your VPS (cheap)
- **Email:** Resend or SendGrid
- **Analytics:** Plausible (privacy-friendly, popular in TH)

### Option B: More Control
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express + Prisma
- **Database:** PostgreSQL (self-hosted on Coolify)
- **Auth:** Lucia Auth or NextAuth.js
- **Hosting:** Coolify on your VPS

**My recommendation:** Go with Option A (Next.js + Supabase) for Phase 1. You can migrate later if needed.

---

## 📂 Suggested File Structure

```
./
├── app/                          # Next.js app router
│   ├── (marketing)/              # Public landing pages
│   │   ├── page.tsx              # Landing page
│   │   ├── how-it-works/
│   │   ├── for-founders/
│   │   └── insights/
│   ├── (app)/                    # Authenticated pages
│   │   ├── dashboard/
│   │   ├── browse/               # Founder directory
│   │   ├── profile/[id]/         # Individual founder profile
│   │   ├── messages/
│   │   ├── settings/
│   │   └── community/
│   ├── api/                      # API routes
│   │   ├── profiles/
│   │   ├── interests/
│   │   ├── messages/
│   │   └── auth/
│   └── layout.tsx
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── profile/
│   ├── browse/
│   └── shared/
├── lib/
│   ├── supabase/
│   ├── matching/                 # The matching algorithm
│   └── utils/
├── docs/
│   └── (strategy docs go here)
├── public/
└── CLAUDE.md                     # This file
```

---

## 🗄️ Database Schema (Suggested)

```sql
-- Users (handled by Supabase Auth)
-- Adds custom user profile data

profiles
├── id (uuid, PK, references auth.users)
├── full_name (text)
├── age (int, nullable)
├── location (text)
├── photo_url (text)
├── linkedin_url (text)
├── i_am (enum: technical, business, product, marketing, finance, domain_expert)
├── intent (enum: idea, open, explore)
├── looking_for (array of enums)
├── industry (array of text)
├── stage (enum: exploring, building, traction, raising)
├── commitment (enum: full_time, part_time, side_project)
├── runway (enum: 3_months, 6_months, 12_months, 18_plus)
├── experience (enum: first_time, 1_2, 3_plus)
├── pitch (text)
├── why_this (text)
├── skills (array of text)
├── verified (boolean, default false)
├── created_at (timestamp)
└── updated_at (timestamp)

interests
├── id (uuid, PK)
├── from_profile_id (uuid, FK)
├── to_profile_id (uuid, FK)
├── note (text)             -- personal intro message
├── status (enum: pending, accepted, declined)
├── created_at (timestamp)

matches
├── id (uuid, PK)
├── profile_a_id (uuid, FK)
├── profile_b_id (uuid, FK)
├── created_at (timestamp)   -- when mutual interest unlocked

messages
├── id (uuid, PK)
├── match_id (uuid, FK)
├── sender_id (uuid, FK)
├── content (text)
├── read_at (timestamp, nullable)
├── created_at (timestamp)

profile_views
├── id (uuid, PK)
├── viewer_id (uuid, FK)
├── viewed_id (uuid, FK)
├── viewed_at (timestamp)
```

---

## 🚀 Build Order (Week-by-Week)

### Week 1: Foundation
- Project setup (Next.js, Supabase, Tailwind)
- Authentication (email + LinkedIn OAuth)
- Database schema migration
- Basic layout & navigation
- Landing page

### Week 2: Profile System
- Profile creation flow (multi-step form)
- Profile edit
- Profile view (own + others)
- Photo upload
- Verification logic

### Week 3: Browse & Discover
- Founder directory page
- Filter sidebar (role, intent, industry, stage, location)
- Profile cards
- Complement score calculation
- Profile detail page

### Week 4: Interest & Messaging
- Express Interest flow
- Mutual interest detection
- Match creation
- Messaging UI
- Email notifications

### Week 5: Polish & Pre-Launch
- Onboarding flow
- Empty states
- Error handling
- Mobile responsive testing
- Admin moderation panel

### Week 6: Soft Launch
- Deploy to production
- Recruit first 100 users manually
- Iterate based on feedback

---

## 📊 Success Metrics (Phase 1)

- **Month 6 target:** 500 active users
- **Active = ** logged in within 30 days
- **Quality metric:** % of matches that result in actual conversations
- **Retention:** % of users still active after 90 days

---

## 🎨 Design Reference

A complete React prototype showing all 5 pages with the exact design language is included as `/design/CoFound_Prototype.jsx`. Use this as visual reference for:

- Landing page layout & copywriting
- Dashboard structure
- Browse page filters & cards
- Profile page detailed view
- Community forum structure

Match the typography, color palette, spacing, and tone shown in the prototype.

---

## 📚 Strategy Documents

In `/docs/` folder:
- `CoFound_Phase1_Strategy.docx` — Detailed strategy document
- `CoFound_Business_Plan.docx` — Full business plan
- `CoFound_Pitch_Deck.pptx` — Visual pitch deck

Read these for full context on the business model and reasoning behind decisions.

---

## ⚠️ Important Reminders for Claude Code

1. **Phase 1 only** — Don't build investor features, payments, or video calls
2. **Conservative design** — No swipe interfaces, no dating-app vibe
3. **Role-based matching** is the core innovation — get this right
4. **The Pitch field is mandatory** — it's the matching fuel
5. **Mutual interest required** before messaging unlocks
6. **Free for all users** in Phase 1 — no paywalls anywhere
7. **Build for Thailand first** — Thai language ready, PDPA compliant
8. **Mobile responsive is enough** — no native mobile app

---

## 🤝 Founder Profile (You)

- Solo developer + non-technical co-founder doing content
- Budget: ฿150,000 total for Phase 1
- Hosting: Coolify on VPS (cheap)
- Tools: Claude Code for development
- Timeline: MVP in 4-6 weeks

---

## 💬 First Tasks for Claude Code

When you start Claude Code in this folder, try these prompts:

1. *"Read CLAUDE.md and the strategy docs in /docs. Summarize what we're building."*
2. *"Set up a Next.js 14 project with TypeScript, Tailwind, and Supabase."*
3. *"Create the database schema based on CLAUDE.md."*
4. *"Build the profile creation flow first — multi-step form following the role-based model."*

---

**Built by founders, for founders. Let's go. 🚀**
