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

Mutual interest required before messaging unlocks. The Pitch field is required (non-empty) for a profile to appear in the Founder directory — **max 500 chars, no minimum length** (the old 200/120 floors were removed in migration 0046).

### B2B profile type (built)

Every profile is either `individual` or `company`. Company profiles add:
- `company_name`
- `capabilities` (what the company offers to partners)

Browse filter lets users view All / Individuals / Companies separately.

---

## 🎨 Design Principles

**Warm, modern, quietly confident. Neutral — hierarchy from weight and surface, never from colour.**

> **Restyled Aug 2026 to Onfound's design system** (app.onfound.com), at the
> founder's explicit direction after being shown the tradeoff twice. This
> REPLACES the previous "law firm / private bank, navy + gold, Georgia serif,
> sharp corners" language entirely. Do not revert the rounding, do not
> reintroduce a brand accent hue, do not restore the serif.
> Values were measured off their live CSS custom properties, not eyeballed.
>
> **Updated Sep 2026** after a full type/spacing/surface audit plus font-binary
> measurement of the shipped Noto Sans Thai. Three changes of substance: the
> card rule below now matches the code (24px borderless + shadow-xs — the old
> "cards/panels rounded-xl" line described a treatment commit f4c3ad0 replaced),
> the size divergence from Onfound is now a recorded DECISION, and Thai
> line-height minimums are now hard rules with a CSS guard.
>
> **STATUS LEDGER — the doc describes two states, do not confuse them.**
> SHIPPED (in the repo today): the palette, radius scale, display ladder,
> geometry rules, tracking kill-switch, Card.tsx, Eyebrow.tsx, the 24px
> borderless card.
> TO-SHIP (specified here, NOT yet in code — anything referencing these must
> land the code in the same PR that starts relying on it): the `lang="th"`
> line-height guard, the danger tokens, `text-num1/num2`, the th-eyebrow
> weight rule, `components/ui/Section.tsx`. Each is marked ⏳ below. When the
> guard ships, record the measurement script path next to the Thai ink figures
> so they stay reproducible.

### Brand
- Warm-neutral product aesthetic: sand ground, white cards, one near-black primary
- Restraint does the trust work — no ornament, no accent hue

### Colors — token NAMES are legacy, read them semantically
| Token | Value | Means |
|---|---|---|
| `navy` | `#1B1A17` | **primary** — buttons, headings, body ink |
| `navy-dark` | `#0D0C0A` | primary hover |
| `gold` | `#E9E2D4` | **accent SURFACE** (bg/border) — never text on light |
| `gold-soft` | `#F1ECE1` | lighter accent surface |
| `gold-ink` | `#6A655D` | muted foreground — eyebrows, labels, meta |
| `cream` | `#F3F0E9` | app background (warm sand) |
| `ink` | `#1B1A17` | body text |
| `ink-muted` | `#6A655D` | secondary text (5.1:1 on cream — AA) |
| `line` | `#DDDBD4` | warm hairline border |
| `danger-ink` ⏳ | `#B42318` | error text (≈6.0:1 on danger-surface — AA) |
| `danger-surface` ⏳ | `#FEF3F2` | error background |
| `danger-line` ⏳ | `#F4B0A1` | error border |

Their `--accent` equals their `--muted`: there is deliberately **no brand hue**.
Emphasis comes from weight, size, or the tan surface — never colour.

The danger tokens are warm-leaning reds chosen to sit on the sand palette.
⏳ They do not exist in `globals.css` yet — add them to `@theme` before citing
them in a review. Once they land, stock Tailwind reds (`red-50/300/400/500`)
are banned — before these tokens existed the code improvised them at ~60 sites
with three different border weights, which is exactly the drift tokens exist
to stop. Until they land, do not "fix" a red by inventing a fourth variant.

**Dark-panel subsystem** — on `bg-navy`, the palette inverts to a fixed
vocabulary. This is the ONE context where `text-gold` is legal (≈13.4:1 there;
≈1.3:1 on light, where it has shipped invisible before):

| Role on `bg-navy` | Class |
|---|---|
| primary text | `text-white` |
| muted text | `text-white/70` |
| eyebrow / accent | `text-gold` |
| border | `border-gold/50` |
| icon well | `bg-gold/15` |

### Typography — FOUR registers, and they are not the same scale
- Headings: **Rethink Sans** (still exposed as the `font-serif` class — legacy name, not a
  serif), weight 600, tracking `-0.02em`
- Body: **Inter**; Thai falls through to **Noto Sans Thai** per-glyph in both faces

**Density is a decision, not drift.** Onfound's app UI is 12px-dominant (they
also ship 14 and 16 — the gap is not uniform); Cofoundee deliberately runs
larger: 16px body / 14px functional UI / 12px meta / 18px section labels,
**because Thai is the default locale** — a Thai tone mark at 12px is ~2.0–2.5px
of ink (measured from the shipped font), and the difference between mai ek and
mai tho is the difference between words. Do not compress the app toward
Onfound's 12px; they set type for Latin. Floors for any text that can be Thai
or translated:

| Tier | Floor |
|---|---|
| body | 16px |
| functional UI | 14px (`text-sm`) |
| meta / eyebrow | 12px (`text-xs`) |
| **anything translatable** | **never below 12px** |

**1. Display register — the golden ladder.** `text-d1..d5` = 26/33/42/53/68px,
stepping by √φ ≈ 1.272 off the 16px body. Each step ships its OWN paired
line-height (1.3 → 1.05), which tightens as the size grows. **Never TIGHTEN a
ladder heading's line-height** — `leading-tight` is 1.25 and so LOOSENS
`text-d3`, and anything ≤ 1.274 collides Thai marks (see the Thai table below).
(This deliberately relaxes the old blanket "never override": LOOSENING with
`leading-relaxed` is allowed on user-generated prose only — the pitch display,
the landing pull-quote. Everything else inherits the pair.) Scope: d1–d3 are
the app ladder (d3 = every page title); **d4/d5 are marketing-hero and
error-page sizes only.**

**2. UI register — off-ladder on purpose.** Section headings inside the app are
`text-lg font-bold tracking-normal` (18px/700/normal). This is OUR size for
Onfound's label role (they run it at 14px/600 — the Sep audit found no 18px
tier in their app; 18 follows from the density decision above, and the old
"measured off app.onfound.com" attribution for this line was wrong). These are
labels, not display type, so they do not belong on the golden ladder. Both
overrides are load-bearing: @layer base sets every h1–h6 to weight 600 and
`-0.02em`, so without `font-bold tracking-normal` you silently get the wrong
thing. Below a section heading → `mb-5`.

Before this, the app had NO section register — 27 section headings were 12px all-caps
eyebrows doing an 18px label's job.

**3. Card-title register — `text-xl` (20/28), rendered as `<h3>`.** Card and
list-item titles (browse cards, company cards, meetup titles) are 20px. 20 is
deliberately off-ladder — it is the "no token" step the ladder skips — and its
Tailwind line-height of 1.4 is Thai-safe for wrapping names. The `<h3>` is part
of the rule: weight and tracking come from the h1–h6 base rule (600/-0.02em),
which a `<div>` title never receives. Do not add `leading-tight` (1.25 is
under the Thai floor, and card titles are user-generated Thai — this ban binds
even in the EN locale, see the Thai section). **`text-2xl` (24) and `text-3xl`
(30) are banned for text**: neither is a register step, 24 blurs the
card-title/`text-d1` (20/26) boundary and 30 blurs d1/d2 (26/33). The registers
stay visually distinct only while the in-between sizes stay unused.

**4. Numeral register ⏳ — `text-num1` (33px) / `text-num2` (42px), line-height
1.0, `font-serif tabular-nums`, DIGITS-ONLY content.** Stat counts, calendar
day-of-month badges, error-code digits. This exists so big numbers stop
borrowing `text-d2/d3 + leading-none` (live today in CompaniesClient), which
broke two rules at once (ladder scope, leading override). LH 1.0 is safe here
precisely because digits carry no Thai marks — the content restriction is part
of the rule, not a nicety. ⏳ Define the tokens in `@theme` before use, and
verify Rethink Sans actually ships tabular figures — if it doesn't, the
`tabular-nums` half of the rule is decoration.

**Decorative single-glyph exception**: avatar initials, the org emblem, OTP
digit boxes are exempt from all registers — content must be Latin/digits, and
the glyph is sized by a FIXED BOX (`h-10 w-10 grid place-items-center`), never
by `leading-none`/`leading-tight`. This is not pedantry: the Thai guard below
force-overrides those classes in the default locale, so a line-height-sized
decorative glyph would break on most pageviews. Box-sized glyphs are immune.

`leading-tight` and `leading-none` are permitted ONLY on the numeral register.
Everywhere else, inherit the register's line-height.

**Eyebrows.** Canonical = whatever `components/ui/Eyebrow.tsx` renders —
today `text-xs uppercase tracking-[0.25em] text-gold-ink`. The tracking value
lives in exactly ONE place (the primitive); hand-typed 0.15/0.16/0.18/0.2em
eyebrow spellings converge to `<Eyebrow>` when touching a file. (If the
tracking should be 0.15em, that is a one-line edit to the primitive — decide
there, not per-site.) Form FIELD labels are a different role and keep their
own pattern: `text-xs uppercase tracking-[0.15em] text-ink-muted`. In the Thai
locale an eyebrow loses BOTH devices (no uppercase in Thai; tracking is
force-stripped by the globals.css kill-switch), so ⏳ `html[lang="th"]`
eyebrows compensate with weight instead: 12px / 600 / `text-gold-ink`. An
eyebrow is a label — a 12px eyebrow doing a section heading's job is the
pre-restyle bug; use the 18px UI register.

**Badge/chip tier — 11px, Latin-and-digits only.** Status codes, counts,
verified marks: `text-[11px] uppercase tracking-[0.15em]`. `text-[9px]` and
`text-[10px]` are banned — Onfound ships 10px (their measurement shows it 40
times), but they set Latin; a Thai tone mark at 10px is ~1.7px of ink, and any
badge that can carry translated text goes to 12px.

### Thai line-height minimums — measured, not vibes
Measured in the browser against the font the app actually loads, using canvas
`TextMetrics` (`actualBoundingBoxAscent` / `Descent`) at 100px. Reproduce it by
pasting this into the console on any app page:

```js
await document.fonts.ready;
const c = document.createElement("canvas").getContext("2d");
c.font = `100px ${getComputedStyle(document.body).fontFamily}`;
["ที่", "นี้", "ผู้", "สุญ"].forEach((s) => {
  const m = c.measureText(s);
  console.log(s, m.actualBoundingBoxAscent / 100, m.actualBoundingBoxDescent / 100);
});
```

Max ink **above** the baseline is **1.010em** — a tone mark stacked over an
upper vowel, the everyday case in ที่ / นี้ / ผู้, and far above Latin's 0.73em
for `Hxg` in the same face. Deepest below-baseline ink measured is **0.27em**
(sara u under a descender consonant, สุญ). Two adjacent Thai lines therefore
start sharing ink at **1.28**.

So **anything ≤ 1.28 on Thai-capable text is a real collision, not a
theoretical one** — `leading-tight` (1.25) fails outright, and `text-d1`'s
paired 1.3 clears it by only 0.02.

An earlier draft of this section quoted a 0.433em maximum descender and a
1.442 "absolute no-overlap" figure. Neither reproduced against the shipped
font — the deepest case measurable here is 0.27em — so both were dropped rather
than left in as numbers nobody can check. Every rule below depends only on the
1.28 threshold, which reproduces exactly.

| Thai-capable text | Minimum line-height |
|---|---|
| wrapping body/UI text, 12–16px | 1.5 preferred; 1.43 (`text-sm` default) acceptable |
| headings/titles that can wrap, 18–26px | 1.35 |
| display, 33px+ | 1.30 |
| real collision threshold (measured) | ≤ 1.28 |

⏳ Enforced in `globals.css` next to the tracking kill-switch ONCE THIS SHIPS
(it is not there yet), so Latin pages keep the tight ladder and only Thai pays
for Thai physics. Every declaration needs `!important`: the ladder's
line-heights and `leading-*` come from the `utilities` layer, which beats
`base` regardless of specificity — without `!important` the guard silently
loses (the same layer mechanics as the focus-ring rule already in the file).
Note d1 is covered at the 1.35 heading floor; d2–d5 at the 1.30 display floor:

```css
html[lang="th"] :where(.leading-none, .leading-tight) { line-height: 1.45 !important; }
html[lang="th"] :where(.text-d1) { line-height: 1.35 !important; }
html[lang="th"] :where(.text-d2, .text-d3, .text-d4, .text-d5) { line-height: 1.3 !important; }
```

The first rule is safe only because nothing legitimate uses
`leading-none`/`leading-tight` outside the numeral register (digits-only, so
never Thai) and decorative glyphs are box-sized, not line-height-sized — keep
both invariants. `leading-snug` (1.375) passes the common case and is left
alone. The guard covers only `lang="th"`; Thai names and pitches also render
in the EN locale, which is why `leading-tight` stays BANNED on user-content
titles rather than merely overridden.

### Vertical rhythm — Fibonacci is a lookup table, not a scale
Fibonacci lands on Tailwind's scale within a couple px at every step (worst:
13→12), so the rhythm uses only these:

| fib | 8 | 13 | 21 | 34 | 55 | 89 |
|---|---|---|---|---|---|---|
| class | `mb-2` | `mb-3` | `mb-5` | `mb-8` | `mb-14` | `py-[88px]` |
| px | 8 | 12 | 20 | 32 | 56 | 88 |

`py-[88px]` was already the 89 step — it came from measuring their section rhythm before
anyone noticed it was Fibonacci.

**The rhythm is five named role→class pairings, a closed list** (`mb-3` sits in
the lookup table for the record but has NO structural role — it is
component-tier spacing only):

| Structural role | Class |
|---|---|
| section padding | `py-[88px]` |
| between major sections | `mb-14` |
| page-header block → content | `mb-8` |
| h1 → subtitle | `mb-2` |
| below a section heading | `mb-5` |

**Operational test for "structural"**: any margin/padding between SIBLING
page-level blocks — sections, the page header, a section heading, a card grid.
Structural spacing MUST come from this table; there is no sixth value
(`mb-6`, `mb-10`, `mb-12`, `mb-16` between page blocks are all bugs).
`py-[104px]` is the marketing pages' second rhythm nobody decided on — it is
live in 6+ marketing files today; DECISION: there is ONE rhythm, marketing
included, and those sections migrate to `py-[88px]` as a deliberate sweep (do
not mix 88 and 104 within one page while migrating).

**Everything inside a card, row, or chip is COMPONENT spacing and lives on the
plain 4px Tailwind grid — officially.** `gap-2`, `py-3`, `px-4`, `p-6` inside
components are correct, not violations. This was always the practice (the 16px
family outnumbers the 20px Fibonacci step 3:1 in the code); the previous
wording just never said it, so the exemption leaked upward into page-level
margins. The table above is the boundary.

**Horizontal spacing is NOT Fibonacci and never was.** The page gutter is
`px-6 lg:px-10` (24→40px) — 40 is off-ladder on purpose; horizontal rhythm
follows the container system, not the vertical scale. The intra-component
horizontal pad is the 4px grid.

**Section primitive ⏳.** `components/ui/Section.tsx` does not exist yet —
create it as `max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]`, with
`rhythm={false}` for chat/article pages, before citing it in review. The
motivating problem is real: that string is hand-typed verbatim ~25 times, and
changing the gutter today is a multi-file sweep. Once the primitive lands, new
pages use `<Section>`, not the string.

### Layout — measured from their live DOM
- Section container **`max-w-[1120px]`**, vertical rhythm **`py-[88px]`**
- Intro/header block **`max-w-[640px]`** — a narrow intro above a wide grid
- Card grid **`gap-4 sm:grid-cols-2 lg:grid-cols-3`** (renders 328.4px columns at 1120px, identical to their `.lm-grid`). `gap-4` is the rule for CARD grids; form-field grids are layout inside a component and may differ
- Card body order: meta row → title → excerpt → footer row
- Reading/article pages keep a narrow column; only the rhythm applies
- Chat/conversation views are full-height and take no vertical rhythm

**Those two numbers are the whole vocabulary.** A page-level container is either
`max-w-[1120px]` or `max-w-[640px]` — Tailwind's `max-w-2xl/3xl/4xl/5xl` presets
are not part of the system and reading one back tells you the page predates the
rule. Which of the two:

| Page shape | Width |
|---|---|
| Single column — forms, editors, settings, onboarding, propose | `max-w-[640px]` |
| Grid or main+aside — directories, feeds, profile and org detail | `max-w-[1120px]`, with the intro block `max-w-[640px]` inside it |
| Reading/article, chat | exempt, per the two rules above |

640 is not arbitrary for forms: it puts a full-width field at 560px and a
two-column row at 272px each, and the insight editor's body textarea lands at
~80 characters per line. Inner blocks, modals and skeletons are components, not
page containers, and this does not apply to them.

### App chrome — sidebar, not top nav
Same split their product uses:
- **App routes** (`app/(app)/*`, including `/investor`): `components/AppSidebar.tsx` — a
  fixed `w-64` left rail on `lg+` (brand → vertical nav with badges → org switcher /
  language / notifications / avatar / sign out), and a slim `sticky` top bar with the
  hamburger below `lg`. The layout offsets content with `lg:pl-64`.
- **Marketing routes**: keep the horizontal `AppHeader` (rendered by `MarketingNav`).
- Adding an app route that investors may read means adding it to the allowlist in
  `app/(app)/layout.tsx` **and** to `navItems` in `AppSidebar`.

### Surfaces — one radius per role
This table REPLACES the old "cards/panels `rounded-xl`" line, which described
the pre-f4c3ad0 treatment the code deliberately abandoned. The radius TOKEN
scale stays `sm 6 / md 8 / lg 10 / xl 14` (their shadcn scale); 16 and 24 come
from Tailwind's own `2xl/3xl` defaults — documented, not tokenized, because
~75 `rounded-3xl` sites have used the default for months with zero drift, and
Onfound's measured 24px card is equally underivable from their own `--radius`.

| Surface | Radius | Border | Shadow |
|---|---|---|---|
| app content card | 24 `rounded-3xl` | **none** | `shadow-xs` |
| tinted panel (`bg-cream`) / dark panel (`bg-navy`) | 24 `rounded-3xl` | none / `border-gold/50` | none |
| marketing card | 22 `rounded-[22px]` | `border-line` | **none** |
| chat bubble | 16 `rounded-2xl` | none | none |
| overlay (dropdown, popover, mobile menu) | 14 `rounded-xl` | `border-line` | `shadow-lg` |
| field | 14 (enforced in `@layer base`) | per component | none |
| sidebar nav item | 10 `rounded-lg` | none | none |
| compact in-page tab strip | 8 `rounded-md` | none | none |
| chip / badge / button | `rounded-full` | per component | none |

- **App card = borderless + `shadow-xs`, never border AND shadow.** The
  hairline shadow REPLACES the border: white on cream alone is too weak a
  boundary. Onfound's measured card shadow matches Tailwind's `--shadow-xs`
  exactly (recorded in Card.tsx's header). Marketing cards are the inverse:
  border, no shadow — the split is deliberate on their side and ours; do not
  unify, do not mix. Overlays are the one border+shadow surface, because they
  float.
- **New cards MUST use `components/ui/Card.tsx`.** The recipe survived 62
  hand-written copies only because it is one exact string; that is how the
  pre-Button drift happened. Padding comes from the primitive's tiers and
  nowhere else: `p-6` (`md`, DEFAULT) for grid/list cards — 24px is right for
  our 16px type; Onfound's 16px pad suits their 12px type, same 1.4–1.5 ratio
  — `p-8` (`lg`) for page-level single panels (auth, profile, big forms),
  `p-5` (`sm`) for dense list rows, `p-12` (`xl`) ONLY for full-width empty
  states (via `EmptyState`), `p-4` (`xs`) rare. `p-10` is off-menu — it is not
  a Card tier; a hand-written `p-10` card is legacy, migrate it to the nearest
  tier when touching the file.
- Sticky bottom bars: `bg-white/95 backdrop-blur border-t border-line`
  `shadow-[0_-2px_16px_rgba(27,26,23,0.08)]` — the shadow tint is `navy`
  #1B1A17; `rgba(10,31,68,…)` is the RETIRED pre-restyle blue.
- ⚠️ **Do not wrap the geometry rules in `:where()`.** Tailwind v4 preflight ships
  `button, input, select, optgroup, textarea { border-radius: 0 }` at specificity (0,0,1);
  a `:where()` wrapper sits at 0 and silently loses to it. Plain element selectors are
  correct here — call sites still win, because `utilities` is a later cascade layer than
  `base` and layer order outranks specificity.
- **Buttons and `[role="button"]` are pills; inputs/textareas/selects are 14px —
  both enforced globally in `globals.css` `@layer base`**, so no call site has
  to remember. `Button`/`LinkButton` ALSO carry `rounded-full` in `BASE` — the
  base-layer rule only matches `<button>`/`[role=button]`, and `LinkButton`
  renders an `<a>`.
- Prose elements get `overflow-wrap: break-word` globally — one member pitch with a long
  unbroken run used to widen the whole document inside the 3-up grid
- Generous whitespace, white cards on warm sand
- Verified badges neutral, not coloured
- No swipes, no gamification, no urgency hacks (unchanged)

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
