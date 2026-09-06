#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Cofoundee — fixture check for the matchmaker's sentence builders.
//
//   node scripts/check-matching.mjs
//
// ZERO DEPENDENCIES. Node >= 22.18 strips the types out of lib/matching.ts on
// import, so this runs on a clean checkout with no build step and no test
// runner. The Thai dictionary is read straight off translations.json rather
// than through lib/i18n.ts, which imports JSON without an import attribute
// (fine under Next's bundler, a hard error in plain ESM).
//
// WHAT IT PROVES
//   1. complementReason() is DETERMINISTIC — same inputs, same sentence. There
//      is no model behind the matchmaker and this is the check that keeps it
//      honest.
//   2. Every template it can reach has a Thai value. A missing key is silent
//      in the product (t() falls back to English), so it is asserted here.
//   3. draftIntroNote() never exceeds NOTE_MAX — it rides in a query string.
//   4. The four cases the copy has to survive: a clean role+industry hit, a
//      role hit with opposite intent, an industry-only overlap, and a pair
//      with nothing strong (which must admit it).
//
// Exits 1 on any failure so it can be wired into CI later.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  complementScore,
  complementReason,
  draftIntroNote,
  understoodWants,
  MATCH_FLOOR,
  NOTE_MAX,
} from "../lib/matching.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TH = JSON.parse(
  fs.readFileSync(path.join(ROOT, "lib", "translations.json"), "utf8"),
);

const missing = new Set();
const en = (s) => s;
const th = (s) => {
  if (!(s in TH)) missing.add(s);
  return TH[s] ?? s;
};

const P = (over) => ({
  i_am: [],
  intent: [],
  looking_for: [],
  industry: [],
  stage: null,
  commitment: null,
  location: null,
  ...over,
});

// ── FIXTURES ──────────────────────────────────────────────────────────────
const me = P({
  looking_for: ["technical"],
  i_am: ["business"],
  intent: ["idea"],
  industry: ["FinTech"],
  stage: "building",
  commitment: "full_time",
  location: "bangkok",
});

const FIXTURES = [
  {
    label: "1. role + named industry, complementary intent",
    name: "Ratthamontree Burimas",
    wants: { roles: ["technical"], industries: ["FinTech"] },
    them: P({
      i_am: ["technical"],
      intent: ["open"],
      industry: ["FinTech"],
      stage: "building",
      commitment: "full_time",
      location: "bangkok",
    }),
  },
  {
    label: "2. role hit, duplicate intent (both have an idea)",
    name: "Napat",
    wants: { roles: ["technical"], industries: [] },
    them: P({
      i_am: ["technical", "product"],
      intent: ["idea"],
      industry: ["Logistics"],
      stage: "building",
      commitment: "part_time",
      location: "chiang-mai",
    }),
  },
  {
    label: "3. no role hit, shared industry only",
    name: "Ploy",
    wants: { roles: ["technical"], industries: [] },
    them: P({
      i_am: ["marketing"],
      intent: ["explore"],
      industry: ["FinTech"],
      stage: "exploring",
      commitment: "side_project",
      location: "phuket",
    }),
  },
  {
    label: "4. nothing strong — must say so",
    name: "Somchai",
    wants: { roles: ["finance"], industries: ["Healthcare"] },
    them: P({
      i_am: ["marketing"],
      intent: ["idea"],
      industry: ["Construction"],
      stage: "raising",
      commitment: "side_project",
      location: "khon-kaen",
    }),
  },
];

// ── RUN ───────────────────────────────────────────────────────────────────
let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log("  FAIL  " + msg);
};

for (const f of FIXTURES) {
  const viewer = { ...me, looking_for: f.wants.roles };
  const { score, breakdown } = complementScore(viewer, f.them);
  console.log("\n" + f.label);
  console.log(
    "  score " +
      score +
      "  (role " +
      breakdown.role.toFixed(2) +
      " intent " +
      breakdown.intent.toFixed(2) +
      " industry " +
      breakdown.industry.toFixed(2) +
      " stage " +
      breakdown.stage +
      " context " +
      breakdown.context.toFixed(2) +
      ")  " +
      (score >= MATCH_FLOOR ? "above" : "below") +
      " MATCH_FLOOR " +
      MATCH_FLOOR,
  );

  const reasonEn = complementReason(viewer, f.them, f.wants, en, f.name);
  const reasonTh = complementReason(viewer, f.them, f.wants, th, f.name);
  const noteEn = draftIntroNote(viewer, f.them, reasonEn, en, f.wants, f.name);
  const noteTh = draftIntroNote(viewer, f.them, reasonTh, th, f.wants, f.name);

  console.log("  EN reason  " + reasonEn);
  console.log("  TH reason  " + reasonTh);
  console.log("  EN note    " + noteEn + "   [" + noteEn.length + " chars]");
  console.log("  TH note    " + noteTh + "   [" + noteTh.length + " chars]");
  console.log(
    "  understood " +
      JSON.stringify(understoodWants(f.wants, en)) +
      " / " +
      JSON.stringify(understoodWants(f.wants, th)),
  );

  // Deterministic — the whole claim of the feature.
  if (complementReason(viewer, f.them, f.wants, en, f.name) !== reasonEn)
    fail("reason is not deterministic");
  // One sentence, and it must not leave a placeholder behind.
  if (/\{[a-z0-9_]+\}/i.test(reasonEn + reasonTh + noteEn + noteTh))
    fail("an unfilled {placeholder} survived");
  if (noteEn.length > NOTE_MAX || noteTh.length > NOTE_MAX)
    fail("note exceeds NOTE_MAX " + NOTE_MAX);
  // No exclamation marks, no emoji — house voice.
  if (/[!\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(noteEn + noteTh))
    fail("note contains an exclamation mark or emoji");
  if (!reasonEn.trim() || !reasonTh.trim()) fail("empty reason");
  if (reasonTh === reasonEn) fail("Thai reason is identical to the English");
}

// Fixture 4 is the honesty case: nothing strong, so it must NOT name a fact.
const honest = complementReason(
  { ...me, looking_for: FIXTURES[3].wants.roles },
  FIXTURES[3].them,
  FIXTURES[3].wants,
  en,
  FIXTURES[3].name,
);
if (!honest.startsWith("A weaker fit"))
  fail("fixture 4 should have produced the weak-fit line, got: " + honest);

console.log("");
if (missing.size) {
  console.log("MISSING Thai keys (" + missing.size + "):");
  for (const k of missing) console.log("  " + JSON.stringify(k));
  failures += missing.size;
}

console.log(failures === 0 ? "OK — all fixtures pass." : failures + " failure(s).");
process.exit(failures === 0 ? 0 : 1);
