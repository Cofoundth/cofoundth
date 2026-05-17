# Cofoundee

The platform for Thai founders to find their co-founder based on complementary skills, intent, and industry.

## Getting Started

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Start Claude Code in this folder

```bash
claude
```

### 3. First prompt

Once Claude Code is running, paste this:

```
Read CLAUDE.md and the strategy docs in /docs. Then help me set up a Next.js 14 project with TypeScript, Tailwind CSS, and Supabase for authentication and database.
```

Claude Code will read all the context and begin building.

## Local Development

```bash
npm install        # if node_modules missing
cp .env.example .env.local   # then fill in Supabase keys
npm run dev        # http://localhost:3000
```

## Project Structure

```
./
├── CLAUDE.md                       # Main context for Claude Code (READ THIS FIRST)
├── AGENTS.md                       # Next.js 16 caveat for AI agents
├── README.md                       # This file
├── app/                            # Next.js App Router
├── lib/supabase/                   # Supabase server + browser clients
├── proxy.ts                        # Auth session refresh (Next.js 16 proxy)
├── docs/                           # Strategy documents (.docx / .pptx)
└── design/CoFound_Prototype.jsx    # Full React design reference
```

## What's Built

- Next.js 16 + React 19 + TypeScript scaffold
- Tailwind v4 with Cofoundee design tokens (navy / gold / cream, Georgia serif)
- Supabase client helpers (server + browser) wired with `@supabase/ssr`
- Placeholder branded landing page

**Not yet built:** auth flows, profile schema, founder directory, matching, messaging.

## Phase 1 Goal

Build co-founder matching platform. No investors yet. No payments yet. No video calls yet.

**Target:** 500 active users by Month 6.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- **Backend:** Next.js API routes + Server Actions
- **Database:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Coolify on VPS
- **Email:** Resend (to add)

## Resources

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

Built by founders, for founders.
