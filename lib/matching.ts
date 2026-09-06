// Cofoundee — profile label maps + shared profile shape.

export type ProfileLike = {
  id?: string;
  i_am: string[];
  intent: string[];
  looking_for: string[];
  industry: string[];
  stage: string | null;
  commitment: string | null;
  location: string | null;
};

// Friendly labels ----------------------------------------------------

export const ROLE_LABELS: Record<string, string> = {
  technical: "Technical",
  business: "Business",
  product: "Product",
  marketing: "Marketing",
  finance: "Finance",
  legal: "Legal",
};

/**
 * The same six roles as bare QUALIFIERS, for prose. Distinct from ROLE_LABELS,
 * which are UI labels for chips and filters.
 *
 * Thai puts the qualifier AFTER the noun — "co-founder สายเทคนิค", never
 * "เทคนิคอล co-founder" — so every sentence template below reads
 * "co-founder สาย{role}" and needs the bare qualifier word, not the label. The
 * label's Thai ("เทคนิคอล", a transliteration of the English adjective) does
 * not sit after สาย; these do. English is the same word either way.
 */
export const ROLE_PROSE: Record<string, string> = {
  technical: "technical",
  business: "business",
  product: "product",
  marketing: "marketing",
  finance: "finance",
  legal: "legal",
};

/** The prose qualifier for a role key, translated. Falls back to the label. */
function roleWord(key: string, tr: (en: string) => string): string {
  const en = ROLE_PROSE[key] ?? ROLE_LABELS[key];
  return en ? tr(en).toLowerCase() : key;
}

export const INTENT_LABELS: Record<string, string> = {
  idea: "Has an idea",
  open: "Open to ideas",
  explore: "Exploring",
};

export const STAGE_LABELS: Record<string, string> = {
  exploring: "Exploring",
  building: "Building MVP",
  traction: "Have traction",
  raising: "Raising",
};

export const COMMITMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  side_project: "Side project",
};

export const RUNWAY_LABELS: Record<string, string> = {
  three_months: "3 months",
  six_months: "6 months",
  twelve_months: "12 months",
  eighteen_plus: "18+ months",
};

// How long in the CURRENT venture. Distinct from EXPERIENCE_LABELS, which
// counts how many ventures someone has had — a second-time founder six weeks in
// and a first-timer five years in are opposites here and identical there.
export const BUILDING_SINCE_LABELS: Record<string, string> = {
  under_six_months: "Under 6 months",
  six_to_twelve_months: "6–12 months",
  one_to_two_years: "1–2 years",
  two_to_five_years: "2–5 years",
  over_five_years: "5+ years",
};

// Age is stored as an integer, so the bands are a presentation concern only —
// no column, no migration. Bounds are inclusive on both ends.
export const AGE_BANDS: { key: string; label: string; min: number; max: number }[] =
  [
    { key: "18_24", label: "18–24", min: 18, max: 24 },
    { key: "25_30", label: "25–30", min: 25, max: 30 },
    { key: "31_35", label: "31–35", min: 31, max: 35 },
    { key: "36_40", label: "36–40", min: 36, max: 40 },
    { key: "41_50", label: "41–50", min: 41, max: 50 },
    { key: "51_plus", label: "50+", min: 51, max: 200 },
  ];

export const EXPERIENCE_LABELS: Record<string, string> = {
  first_time: "First-time founder",
  one_to_two: "1–2 ventures",
  three_plus: "3+ ventures",
};

// ── COMPLEMENT SCORE ──────────────────────────────────────────────────────
// The weighting CLAUDE.md has specified since the pivot, and that /terms
// already promises to users ("based on complementary skills, intent, and
// industry") — but which existed nowhere in the code until now. The matching
// surfaces filtered; nothing ranked.
//
//   role 40 / intent 30 / industry 15 / stage 10 / location+commitment 5
//
// COMPLEMENT, not similarity, and the two pull in opposite directions on the
// first two axes: you want someone who IS what you are looking for, and whose
// intent fits yours rather than repeats it. Two people who both have an idea
// and both want a technical co-founder are a poor pair, however alike they
// look. Industry, stage and location are the axes where sameness IS the
// signal, so those score on overlap.
//
// Pure and dependency-free so it can run on the server, in a client filter, or
// in a test without a database.

/** Intent pairs that complement rather than duplicate. */
const INTENT_FIT: Record<string, Record<string, number>> = {
  // someone with an idea wants people who want in on one
  idea: { open: 1, explore: 0.75, idea: 0.15 },
  // open to ideas — best paired with someone who has one
  open: { idea: 1, explore: 0.4, open: 0.3 },
  // still exploring — an idea-haver gives them something to join
  explore: { idea: 0.75, open: 0.4, explore: 0.3 },
};

function overlap(a: string[] | null, b: string[] | null): number {
  const A = a ?? [];
  const B = b ?? [];
  if (A.length === 0 || B.length === 0) return 0;
  const hits = A.filter((x) => B.includes(x)).length;
  return hits / Math.min(A.length, B.length);
}

export type ComplementBreakdown = {
  role: number;
  intent: number;
  industry: number;
  stage: number;
  context: number;
};

/**
 * 0–100. `me` is the viewer, `them` the candidate.
 *
 * Asymmetric on purpose: score(me, them) answers "how well do they fit what I
 * asked for", which is not the same question as score(them, me).
 */
export function complementScore(
  me: ProfileLike,
  them: ProfileLike,
): { score: number; breakdown: ComplementBreakdown } {
  // ROLE 40 — what fraction of the roles I asked for do they actually hold.
  // Divided by what I ASKED for, not by the smaller set: wanting two roles and
  // getting one is half a match, and a generalist who ticks every box should
  // not outrank the specialist I actually need.
  const wanted = me.looking_for ?? [];
  const theirRoles = them.i_am ?? [];
  const role =
    wanted.length === 0
      ? 0
      : wanted.filter((r) => theirRoles.includes(r)).length / wanted.length;

  // INTENT 30 — fit, not sameness (see INTENT_FIT).
  const myIntents = me.intent ?? [];
  const theirIntents = them.intent ?? [];
  let intent = 0;
  for (const a of myIntents) {
    for (const b of theirIntents) {
      intent = Math.max(intent, INTENT_FIT[a]?.[b] ?? 0);
    }
  }

  // INDUSTRY 15 / STAGE 10 / CONTEXT 5 — here sameness is the signal.
  const industry = overlap(me.industry, them.industry);
  const stage = me.stage && them.stage && me.stage === them.stage ? 1 : 0;
  const samePlace = !!me.location && me.location === them.location;
  const samePace = !!me.commitment && me.commitment === them.commitment;
  const context = (Number(samePlace) + Number(samePace)) / 2;

  const breakdown = { role, intent, industry, stage, context };
  const score =
    role * 40 + intent * 30 + industry * 15 + stage * 10 + context * 5;

  return { score: Math.round(score), breakdown };
}

// ── WHY THIS ONE RANKS ────────────────────────────────────────────────────
// The score alone re-sorts the grid silently, which is the same as explaining
// nothing: the reader sees a different order and has to take it on faith.
// These helpers turn the SAME breakdown the score is made of into one plain
// sentence, so the ranking is auditable by the person reading it.
//
// Rule-based and deterministic — there is no model here, and the UI must never
// imply one. Same inputs, same sentence, every time.
//
// `tr` is passed in rather than imported so these run on the client (useT()),
// on the server (t(en, locale)), and in a plain node script with a stub.

export type Wants = {
  /** Role KEYS (ROLE_LABELS) the viewer asked for. */
  roles: string[];
  /** Industry LABELS (INDUSTRIES) named in the query. */
  industries: string[];
};

/** Translated labels for the "what we understood" chips. */
export function understoodWants(
  wants: Wants,
  tr: (en: string) => string,
): { roles: string[]; industries: string[] } {
  return {
    roles: (wants.roles ?? [])
      .map((r) => (ROLE_LABELS[r] ? tr(ROLE_LABELS[r]) : null))
      .filter((x): x is string => !!x),
    // NOT translated: industry labels render in English in both locales by
    // design (see the header of lib/industries.ts), and pushing 100+ of them
    // through tr() would only add 100+ permanently-missing dictionary keys.
    industries: [...(wants.industries ?? [])],
  };
}

/**
 * A fact is "strong" when its own contribution clears HALF its weight — the
 * same weights complementScore() uses, so a sentence can never claim something
 * the score did not actually reward. role 40/2, intent 30/2, industry 15/2 all
 * reduce to the raw 0–1 component being >= 0.5.
 */
const STRONG = 0.5;

/**
 * The score at which a candidate is worth calling a match at all. 40 is the
 * ROLE weight: below it a profile cannot be holding the whole role that was
 * asked for, whatever else it has going for it.
 */
export const MATCH_FLOOR = 40;

/** Which axis of the breakdown a fact came from. */
type FactAxis = "role" | "industry" | "intent" | "stage" | "context";

type Fact = {
  /** The scoring axis this fact is reading — see draftIntroNote(). */
  axis: FactAxis;
  /** Third person, follows the candidate's name. Already translated. */
  third: string;
  /** Second person, for a note written TO them. Already translated. */
  second: string;
};

function fill(s: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.split("{" + k + "}").join(v),
    s,
  );
}

/**
 * The strongest facts first: role, then industry, then intent, then stage and
 * context. Priority follows the weight order, so a sentence always leads with
 * whatever moved the score most.
 */
function reasonFacts(
  me: ProfileLike,
  them: ProfileLike,
  wants: Wants,
  tr: (en: string) => string,
): Fact[] {
  const facts: Fact[] = [];
  const wanted = wants.roles?.length ? wants.roles : (me.looking_for ?? []);
  const theirRoles = them.i_am ?? [];

  // ROLE 40 — they hold at least half of what was asked for.
  //
  // `wants.roles` is what the QUERY named; the fallback above is the viewer's
  // stored looking_for. The two are not interchangeable in prose: "you asked
  // for" is a claim about the query, and saying it over roles the reader never
  // typed is a stated falsehood. So the sentence tracks which one it is
  // reading — the second person ("I'm looking for") is true either way, since
  // looking_for IS what the viewer is looking for.
  const askedForRoles = (wants.roles ?? []).length > 0;
  const hits = wanted.filter((r) => theirRoles.includes(r));
  if (wanted.length > 0 && hits.length / wanted.length >= STRONG) {
    const role = roleWord(hits[0], tr);
    facts.push({
      axis: "role",
      third: fill(
        tr(
          askedForRoles
            ? "is the {role} co-founder you asked for"
            : "is the {role} co-founder you're looking for",
        ),
        { role },
      ),
      second: fill(tr("you're the {role} co-founder I'm looking for"), { role }),
    });
  }

  // INDUSTRY 15 — the industry NAMED in the query outranks a merely shared
  // one: "the industry you named" is an answer, "we overlap" is a coincidence.
  const theirIndustry = them.industry ?? [];
  const named = (wants.industries ?? []).filter((i) => theirIndustry.includes(i));
  const mine = me.industry ?? [];
  const shared = mine.filter((i) => theirIndustry.includes(i));
  const sharedRatio =
    mine.length === 0 || theirIndustry.length === 0
      ? 0
      : shared.length / Math.min(mine.length, theirIndustry.length);
  if (named.length > 0) {
    const industry = named[0]; // English in both locales — see understoodWants
    facts.push({
      axis: "industry",
      third: fill(tr("builds in {industry}, the industry you named"), {
        industry,
      }),
      second: fill(tr("you're building in {industry}, where I'm focused"), {
        industry,
      }),
    });
  } else if (sharedRatio >= STRONG) {
    const industry = shared[0];
    facts.push({
      axis: "industry",
      third: fill(tr("shares {industry} with you"), { industry }),
      second: fill(tr("we're both in {industry}"), { industry }),
    });
  }

  // INTENT 30 — complement, not sameness. The fragment describes THEM; which
  // of their intents to describe is the one that pairs best with mine.
  let bestIntent = 0;
  let theirIntent: string | null = null;
  for (const a of me.intent ?? []) {
    for (const b of them.intent ?? []) {
      const fit = INTENT_FIT[a]?.[b] ?? 0;
      if (fit > bestIntent) {
        bestIntent = fit;
        theirIntent = b;
      }
    }
  }
  if (bestIntent >= STRONG && theirIntent) {
    const copy: Record<string, Fact> = {
      idea: {
        axis: "intent",
        third: tr("has an idea and wants a partner"),
        second: tr("you already have an idea and want a partner"),
      },
      open: {
        axis: "intent",
        third: tr("is open to joining someone else's idea"),
        second: tr("you're open to joining someone else's idea"),
      },
      explore: {
        axis: "intent",
        third: tr("is still exploring what to build"),
        second: tr("you're still exploring what to build"),
      },
    };
    if (copy[theirIntent]) facts.push(copy[theirIntent]);
  }

  // STAGE 10 / CONTEXT 5 — the weakest axes, so in practice they only ever
  // fill the second slot of a sentence.
  if (me.stage && them.stage && me.stage === them.stage) {
    // NOT lowercased: "Building MVP" -> "building mvp" mangles the acronym,
    // and the templates are written to read with the label capitalised.
    const stage = tr(STAGE_LABELS[me.stage] ?? me.stage);
    facts.push({
      axis: "stage",
      third: fill(tr("is also at {stage}"), { stage }),
      second: fill(tr("we're both at {stage}"), { stage }),
    });
  }
  const samePlace = !!me.location && me.location === them.location;
  const samePace = !!me.commitment && me.commitment === them.commitment;
  if (samePlace && samePace) {
    facts.push({
      axis: "context",
      third: tr("is nearby and on the same commitment"),
      second: tr("we're nearby and on the same commitment"),
    });
  } else if (samePlace) {
    facts.push({
      axis: "context",
      third: tr("is based near you"),
      second: tr("we're in the same place"),
    });
  } else if (samePace) {
    facts.push({
      axis: "context",
      third: tr("is on the same commitment as you"),
      second: tr("we're on the same commitment"),
    });
  }

  return facts;
}

/**
 * ONE sentence saying why `them` ranks where it does for `me`. Deterministic.
 * Two facts when two are strong, one when one is, and an honest admission when
 * none are — never a compliment the breakdown does not support.
 */
export function complementReason(
  me: ProfileLike,
  them: ProfileLike,
  wants: Wants,
  tr: (en: string) => string,
  name?: string,
): string {
  const facts = reasonFacts(me, them, wants, tr);
  const who = (name ?? "").trim() || tr("This founder");
  if (facts.length === 0) {
    return tr("A weaker fit on paper — worth a look if the pitch resonates.");
  }
  if (facts.length === 1) {
    return fill(tr("{name} {reason}."), { name: who, reason: facts[0].third });
  }
  return fill(tr("{name} {reason}, and {reason2}."), {
    name: who,
    reason: facts[0].third,
    reason2: facts[1].third,
  });
}

/**
 * "a technical co-founder in FinTech" — what the viewer is looking for, as
 * prose. Roles named in the query win; otherwise the viewer's stored
 * looking_for, which is safe HERE because this phrase is FIRST person ("I'm
 * looking for …") — a statement about the viewer's own preference, not a claim
 * about what they typed.
 */
function wantsPhrase(
  wants: Wants,
  me: ProfileLike,
  tr: (en: string) => string,
): string {
  const roleKeys = wants.roles?.length ? wants.roles : (me.looking_for ?? []);
  const roles = roleKeys
    .map((r) => (ROLE_LABELS[r] ? roleWord(r, tr) : null))
    .filter((x): x is string => !!x);
  const industry = (wants.industries ?? [])[0];
  const base = roles.length
    ? fill(tr("a {role} co-founder"), { role: roles.slice(0, 2).join(" / ") })
    : tr("someone to build with");
  return industry
    ? fill(tr("{what} in {industry}"), { what: base, industry })
    : base;
}

/** Hard cap. The profile deep-link carries this note in a query string. */
export const NOTE_MAX = 280;

/**
 * The reason, rewritten as a first-person opener the viewer can send as-is.
 * Plain — no exclamation marks, no emoji. Capped at NOTE_MAX on a word
 * boundary so it survives the ?note= round trip intact.
 *
 * `reason` is the third-person sentence complementReason() produced for the
 * same pair. It is accepted so the caller cannot drift the note away from the
 * sentence the card is showing, and it is NOT interpolated — the note rebuilds
 * the same fact in the second person, because a note that quotes a sentence
 * about you back at you reads like a form letter.
 */
export function draftIntroNote(
  me: ProfileLike,
  them: ProfileLike,
  reason: string,
  tr: (en: string) => string,
  wants: Wants,
  firstName?: string,
): string {
  const who = (firstName ?? "").trim().split(" ")[0] || tr("there");
  const facts = reasonFacts(me, them, wants, tr);
  // The weak-fit `reason` is deliberately NOT spliced in: it is third-person
  // copy ABOUT them, and quoting "a weaker fit on paper" back at the person
  // you are writing to is not an opener. That case gets its own honest line.
  // The no-fact opener states nothing about the recipient and nothing about
  // the sender's own behaviour. "your pitch caught my eye" shipped here first
  // and was the wrong shape twice over: it fires precisely when the score
  // found nothing, and it asserts the sender read a pitch the browse card may
  // never have shown them.
  //
  // The opener ALREADY names the role (always) and the industry (whenever one
  // was named), so a `second` fragment on the same axis says one thing twice —
  // "I'm looking for a technical co-founder, and you're the technical
  // co-founder I'm looking for", which is the form letter this note exists to
  // avoid. Skip the axes the opener covers and take the next real fact; when
  // every fact is already covered, drop the opener rather than repeat it.
  const covered = new Set<FactAxis>();
  if ((wants.roles?.length ? wants.roles : (me.looking_for ?? [])).length > 0)
    covered.add("role");
  if ((wants.industries ?? [])[0]) covered.add("industry");
  const uncovered = facts.find((f) => !covered.has(f.axis));

  const raw =
    !uncovered && facts.length > 0
      ? fill(tr("Hi {name} — {why}. Up for a quick chat?"), {
          name: who,
          why: facts[0].second,
        })
      : fill(
          tr(
            "Hi {name} — I'm looking for {wants}, and {why}. Up for a quick chat?",
          ),
          {
            name: who,
            wants: wantsPhrase(wants, me, tr),
            why: uncovered
              ? uncovered.second
              : tr(
                  "on paper we're not an obvious fit, but I wanted to reach out anyway",
                ),
          },
        );
  const note = raw.replace(/\s+/g, " ").trim();
  if (note.length <= NOTE_MAX) return note;
  const cut = note.slice(0, NOTE_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).trim() + "…";
}
