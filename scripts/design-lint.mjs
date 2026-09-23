#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Cofoundee - design-system linter.  ZERO DEPENDENCIES (node:fs / node:path).
//
//   node scripts/design-lint.mjs           human report, exit 1 if violations
//   node scripts/design-lint.mjs --json    machine-readable JSON on stdout
//   node scripts/design-lint.mjs --help    usage
//
// It must run on a clean checkout with NO npm install, so there is no ESLint
// plugin and no AST library here - just regex plus small, deliberately
// documented scanners. Where a heuristic stands in for a parser it says so.
//
// == WHY THIS FILE EXISTS ===================================================
// Two classes of bug have each shipped to production and were caught only by
// someone looking at the live site. Both are invisible in code review because
// the class names read as perfectly reasonable.
//
// RULE 1 - gold-on-light.
//   `gold` (#E9E2D4) used to be a brand gold. After the Aug 2026 restyle it is
//   an accent SURFACE token: backgrounds and borders only. As a FOREGROUND on
//   a light surface (cream #F3F0E9 / white) it renders at roughly 1.3:1 -
//   literally invisible. Shipped incidents: the admin "Verified" pill lost its
//   label and its checkmark; the onboarding step indicator drew completed
//   steps as empty boxes; eight sites across the meetups pages went blank
//   after a merge.
//   The token NAMES are legacy and must be read semantically:
//       text-gold       the SURFACE token used as a foreground  -> WRONG on light
//       text-gold-ink   #6A655D, the muted FOREGROUND           -> CORRECT
//       text-gold-soft  another surface tint                    -> not a foreground
//   On a dark surface (bg-navy #1B1A17) gold reads as a warm off-white and is
//   correct - those sites are detected and skipped, see isDarkContext(). That
//   surface can arrive as a CLASS or as a PROP: batch 3 moved the funding
//   rail's panel onto `<Card tone="navy">` and the rule went blind on the spot,
//   turning a legitimate gold eyebrow into a violation. Both forms count now.
//
// RULE 2 - bordered surface with no radius.
//   The product is rounded: cards/panels `rounded-xl`, chips/badges
//   `rounded-full`, landing marketing cards `rounded-[22px]`. A full box
//   border (`border border-line`, `border border-navy`) with no `rounded-*`
//   is a square card in a rounded product - it reads as a rendering bug.
//   Two things are NOT violations and are handled below:
//     - button / [role=button] / input / textarea / select - app/globals.css
//       @layer base already rounds these BY ELEMENT, so they carry no class.
//     - partial borders (border-t / -b / -l / -r / -x / -y) - rules and
//       dividers, not boxes.
//   Two things ARE violations that a naive scan misses, and both were live in
//   the tree when this note was written:
//     - <Link> from next/link. It is a PASS-THROUGH: it renders a bare <a>,
//       which @layer base does NOT round. MeetupForm shipped a square outline
//       "Cancel" <Link> in the same flex row as a pilled <button>.
//     - classes reached through a module-level constant. funding/[connectionId]
//       keeps its status-chip classes in `PILL_BASE` ("... px-2 py-0.5 border",
//       no radius) and renders them on a <span> through a helper, so nothing
//       square is literally written at the call site.
//
// == SUPPRESSION ============================================================
//   // design-ok: <reason>          or      {(*) design-ok: <reason> (*)}
// on the offending line, or within the 3 lines above it, silences BOTH rules
// for that line. The reason is MANDATORY - a bare `design-ok` is itself an
// error, otherwise the escape hatch rots into a wildcard. Suppressions are
// counted in the summary so they stay visible instead of becoming invisible
// debt, and a suppression that silences nothing is reported as stale.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

const EXIT_OK = 0;
const EXIT_VIOLATIONS = 1;
const EXIT_SCRIPT_FAILURE = 2;

const DEFAULT_ROOTS = ["app", "components"];
const SOURCE_EXT = new Set([".tsx", ".ts"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "out",
  "coverage",
]);

// How many lines ABOVE a violation a `design-ok` comment may sit and still
// cover it. 3 exists so the marker can go above a multi-line JSX open tag.
const SUPPRESSION_REACH = 3;

// ---------------------------------------------------------------------------
// Rule 1 - gold as a foreground
// ---------------------------------------------------------------------------
//
// The whole linter lives or dies on this regex. A naive /text-gold/ also
// matches `text-gold-ink`, which is the CORRECT muted-foreground token and by
// far the most common gold-ish class in the codebase (~40 sites). Flagging it
// would bury the real violations in noise and the linter would be switched off
// within a week.
//
//   (?<![\w-])                 not the tail of another token (`foo-text-gold`)
//   (text|fill|stroke|decoration)-gold
//   (?![\w-])                  <- the load-bearing part: rejects `-ink`/`-soft`
//                                 and any other `gold-*` token, because the
//                                 next character would be `-`.
//   (?:\/\d{1,3})?             Tailwind opacity suffix: `text-gold/40`
//
// Variants are intentionally matched (`hover:text-gold`, `group-hover:...`):
// `:` is not in [\w-], so the lookbehind passes.
const GOLD_FOREGROUND =
  /(?<![\w-])(text|fill|stroke|decoration)-gold(?![\w-])(?:\/\d{1,3})?/g;

// Dark surfaces on which gold-as-a-foreground is CORRECT (it reads as a warm
// off-white there). `fill-navy` covers the SVG brand mark.
const DARK_SURFACE =
  /(?<![\w-])(?:bg-(?:navy(?:-dark)?|ink|black)|fill-navy)(?:\/\d{1,3})?(?![\w-])/;

// A dark surface can also arrive as a PROP, not a class. `<Card tone="navy">`
// renders `bg-navy text-white` (Card.tsx TONE_CLASSES) and `<EmptyState
// tone="navy">` delegates to it - the two are the only components in the repo
// that take a navy tone, and both mean the dark panel. Batch 3 moved the
// funding rail's panel onto the prop and Rule 1 went blind on the spot: a
// legitimate `text-gold` inside it became a violation, and two `design-ok`
// markers stood in until this landed.
//
// Matched on the ATTRIBUTE, deliberately loosely (any Capitalised tag), rather
// than on the tag name: a wrapper that forwards `tone` is the same surface by
// another name, and being wrong here costs a false NEGATIVE - the same safe
// direction the indentation walk already accepts. `tone="danger"` and Badge's
// `tone="gold"` are not matched; only the literal navy is.
const DARK_TONE_PROP = /\btone\s*=\s*["']navy["']/;

// ---------------------------------------------------------------------------
// Rule 2 - full box border with no radius
// ---------------------------------------------------------------------------
//
// A FULL box border is the width utility that applies to all four sides:
//   `border`            1px all round
//   `border-0|2|4|8`    other widths
//   `border-[3px]`      arbitrary width
// Deliberately NOT matched:
//   `border-line`, `border-navy`, `border-red-300`  -> colour only, no width
//   `border-t`, `border-b-2`, `border-x`            -> rules/dividers, not boxes
//   `hover:border`, `sm:border`                     -> variant-only; every
//       shipped incident was an unprefixed border, and matching variants adds
//       false positives (hover colour swaps) for no real coverage.
const FULL_BOX_BORDER = /^border(?:-(?:0|2|4|8|\[[^\]]*\]))?$/;
const BORDER_COLOUR = /^border-(?!0$|2$|4$|8$|\[)[a-z]/;
// Any radius anywhere in the className expression exempts it - see checkRule2.
const HAS_RADIUS = /(?<![\w-])rounded(?![\w-])|(?<![\w-])rounded-/;

// Elements app/globals.css @layer base already rounds BY ELEMENT. They need no
// radius class and must never be flagged.
//   button, [role="button"]                       -> 9999px (pill)
//   input:not([type=checkbox]):not([type=radio]),
//   textarea, select                              -> var(--radius-xl)
const SELF_ROUNDING_TAGS = new Set(["button", "input", "textarea", "select"]);
const UNROUNDED_INPUT_TYPE = /type\s*=\s*["'](?:checkbox|radio)["']/;
const ROLE_BUTTON = /role\s*=\s*["']button["']/;

// Capitalised tags are normally skipped (see checkRule2) because what they
// render cannot be known without following the import. That blanket skip had a
// real hole: `next/link` is a PASS-THROUGH. It renders a plain <a> and adds no
// styling of its own, and <a> is NOT one of the elements globals.css rounds by
// element - so `<Link className="px-6 py-3 border border-line">` is a square
// outline button. It shipped that way in admin/meetups/MeetupForm.tsx, sitting
// in the same flex row as a real <button>, which the base layer pills.
//
// Keyed by MODULE, not by name, and the local binding is read off the import
// statement - so a project-local component that happens to be called `Link` is
// still skipped, and `import NextLink from "next/link"` is still caught.
// next/image is listed for the same reason even though the repo does not use it
// yet: it renders a bare <img>, and the avatar/logo tiles it would replace
// (components/OrgCard.tsx:56, app/(app)/matches/page.tsx:298) are all rounded-xl.
const PASSTHROUGH_MODULES = new Map([
  ["next/link", "a"],
  ["next/image", "img"],
]);

/**
 * Map the local names of pass-through components to the DOM element they
 * render: `import Link from "next/link"` -> Link => "a".
 * Handles default, aliased-default and named-with-alias import forms.
 */
function passthroughComponentsOf(src) {
  const found = new Map();
  const IMPORT = /import\s+([^;]*?)\s+from\s+["']([^"']+)["']/g;
  let m;
  while ((m = IMPORT.exec(src))) {
    const dom = PASSTHROUGH_MODULES.get(m[2]);
    if (!dom) continue;
    // `Link`, `Link, { x }`, `{ default as Link }` - take every binding that is
    // not inside a named-import brace group unless it is aliased from default.
    const clause = m[1];
    const def = /^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
    if (def) found.set(def[1], dom);
    const aliased = /\{[^}]*\bdefault\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause);
    if (aliased) found.set(aliased[1], dom);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Module-level class constants
// ---------------------------------------------------------------------------
//
// A className expression that is just an identifier or a call
// (`className={pillCls(d.status)}`) has no literal chunks, so the scanner used
// to see nothing and stay silent. That is how
// app/(app)/funding/[connectionId]/page.tsx hid a square status badge: the
// classes live in a module-level `PILL_BASE` ("... px-2 py-0.5 border", no
// radius) that a helper interpolates and a <span> renders.
//
// So: build a table of MODULE-LEVEL `const`/`let`/`function` initialisers and
// expand any identifier a className expression mentions, transitively. Only
// column-0 declarations are collected, which deliberately keeps the table to
// module scope - a function-scoped `const cls` is already visible at its use
// site through the template literal that interpolates it.
//
// Expansion can only ever ADD text, and the two things we test for pull in
// opposite directions: finding a radius SUPPRESSES a report, finding a border
// only reports if the token `border` stands alone in a class-like string. So a
// coincidental identifier match makes the linter quieter, not noisier.
const MODULE_CONST =
  /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=/gm;
const MODULE_FUNCTION =
  /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
const IDENTIFIER = /(?<![\w$.])([A-Za-z_$][\w$]*)/g;
const MAX_EXPANSION_DEPTH = 4;

/** Walk from `from` to the end of the initialiser/body that starts there. */
function endOfInitialiser(src, from, bodyMode) {
  let depth = 0;
  let quote = null;
  for (let j = from; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === "\\") j++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) return j;
      depth--;
      if (bodyMode && depth === 0) return j + 1;
    } else if (!bodyMode && c === ";" && depth === 0) return j;
    else if (!bodyMode && c === "\n" && depth === 0 && /\S/.test(src[j + 1] ?? ""))
      return j;
  }
  return src.length;
}

// `mask` is the comment mask: a commented-out `const CARD = "border border-line"`
// must not enter the table, or deleted code could resurrect as a violation on a
// live identifier that happens to share its name.
function symbolTableOf(src, mask) {
  const table = new Map();
  MODULE_CONST.lastIndex = 0;
  let m;
  while ((m = MODULE_CONST.exec(src))) {
    if (mask[m.index]) continue;
    const start = m.index + m[0].length;
    table.set(m[1], src.slice(start, endOfInitialiser(src, start, false)));
  }
  MODULE_FUNCTION.lastIndex = 0;
  while ((m = MODULE_FUNCTION.exec(src))) {
    if (mask[m.index]) continue;
    const open = src.indexOf("{", m.index + m[0].length);
    if (open < 0) continue;
    table.set(m[1], src.slice(open, endOfInitialiser(src, open, true)));
  }
  return table;
}

/**
 * Every module-level symbol a className expression reaches, transitively, as
 * `{name, text}`. The className's own text is NOT included - the caller keeps
 * that separate so it can report in-place chunks at their true offsets and
 * borrowed ones at the call site.
 */
function reachableSymbols(text, table) {
  const out = [];
  const seen = new Set();
  const visit = (s, depth) => {
    if (depth > MAX_EXPANSION_DEPTH) return;
    IDENTIFIER.lastIndex = 0;
    let m;
    const names = [];
    while ((m = IDENTIFIER.exec(s))) names.push(m[1]);
    for (const name of names) {
      if (seen.has(name) || !table.has(name)) continue;
      seen.add(name);
      const body = table.get(name);
      out.push({ name, text: body });
      visit(body, depth + 1);
    }
  };
  visit(text, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function lineStartsOf(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return starts;
}

/** Binary-search an absolute offset back to a 1-based {line, column}. */
function positionOf(starts, idx) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= idx) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: idx - starts[lo] + 1 };
}

function indentOf(line) {
  // Tabs count as 2 so mixed indentation still orders correctly.
  let n = 0;
  for (const ch of line) {
    if (ch === " ") n += 1;
    else if (ch === "\t") n += 2;
    else break;
  }
  return n;
}

/**
 * Mark every byte of the file that sits inside a comment, so documentation is
 * never linted. This matters a lot here: components/Brand.tsx line 4 literally
 * writes "(fill-navy, fill-gold," in a header comment, and components/ui/
 * Card.tsx and Input.tsx document `border border-line` in prose. Flagging
 * documentation would be worse than useless.
 *
 * A line-based scanner, not a full tokenizer. It tracks:
 *   - block comments, which carry across lines
 *   - double-quoted strings, which cannot
 *   - template literals, which can
 * and it deliberately does NOT track single quotes, because JSX prose is full
 * of apostrophes ("don't") that would flip a naive quote state and swallow the
 * rest of the file. `//` inside a single-quoted URL is handled by the `://`
 * guard instead.
 *
 * The double-quote handling is the load-bearing part. An earlier version of
 * this function just compared `lastIndexOf("/*")` against `lastIndexOf("*​/")`,
 * and `accept="image/*"` (app/(app)/orgs/new/OrgImageFields.tsx:114 and 202,
 * components/AvatarUploader.tsx:140) opened a block comment that never closed
 * - so ~60 lines of real markup silently stopped being linted. A linter that
 * goes blind without saying so is worse than no linter, hence the real scan.
 */
function commentMaskOf(src, starts, lines) {
  const mask = new Uint8Array(src.length);
  let inBlock = false;
  let blockStart = 0;
  let inTemplate = false;

  const paint = (from, to) => {
    for (let k = from; k < to && k < mask.length; k++) mask[k] = 1;
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const base = starts[li] ?? src.length;
    let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (inBlock) {
        if (c === "*" && line[i + 1] === "/") {
          paint(blockStart, base + i + 2);
          inBlock = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }
      if (inTemplate) {
        if (c === "\\") i += 2;
        else if (c === "`") {
          inTemplate = false;
          i++;
        } else i++;
        continue;
      }
      if (c === '"') {
        // A JS string literal cannot span lines: an unterminated one stops here.
        let j = i + 1;
        while (j < line.length && line[j] !== '"') j += line[j] === "\\" ? 2 : 1;
        i = j < line.length ? j + 1 : line.length;
        continue;
      }
      if (c === "`") {
        inTemplate = true;
        i++;
        continue;
      }
      if (c === "/" && line[i + 1] === "/" && line[i - 1] !== ":") {
        paint(base + i, base + line.length);
        i = line.length;
        continue;
      }
      if (c === "/" && line[i + 1] === "*") {
        inBlock = true;
        blockStart = base + i;
        i += 2;
        continue;
      }
      i++;
    }
    if (inBlock) paint(blockStart, base + line.length + 1);
  }
  if (inBlock) paint(blockStart, src.length);
  return mask;
}

/**
 * From the `<` of an opening tag, walk forward to the `>` that closes it and
 * return the whole opening tag as text.
 *
 * `>` is ignored while inside a string/template literal and while inside a
 * `{ ... }` expression container, which is what makes
 * `<div onClick={() => f()} className={a > b ? x : y}>` resolve correctly.
 */
function readOpenTag(src, lt) {
  const name = /^[A-Za-z][\w.:-]*/.exec(src.slice(lt + 1, lt + 81));
  if (!name) return null;
  let depth = 0;
  let quote = null;
  for (let i = lt + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) {
      return { tagName: name[0], start: lt, end: i, text: src.slice(lt, i + 1) };
    }
  }
  return null;
}

/**
 * HEURISTIC: which element does this `className` belong to?
 *
 * No AST is allowed, so: scan BACKWARDS for the nearest `<` followed by a
 * letter. In well-formed JSX the only thing between an opening `<Tag` and its
 * `className` attribute is other attributes, so that tag is the owner -
 * EXCEPT when an earlier attribute embeds an element of its own
 * (`<Foo icon={<Bar />} className="...">`). That case is handled by parsing
 * each candidate forward: if its `>` lands BEFORE our className the tag has
 * already closed and cannot own us, so we keep walking back.
 */
function resolveOwningTag(src, classNameIdx) {
  let cursor = classNameIdx;
  for (let guard = 0; guard < 64; guard++) {
    const lt = src.lastIndexOf("<", cursor - 1);
    if (lt < 0) return null;
    cursor = lt;
    if (!/[A-Za-z]/.test(src[lt + 1] ?? "")) continue; // `</div>`, `a < b`
    const tag = readOpenTag(src, lt);
    if (tag && tag.end > classNameIdx) return tag;
  }
  return null;
}

/**
 * Read the value of a `className=` attribute, starting just after the `=`.
 * Returns the absolute span of the WHOLE expression, so the caller can test
 * all of it for a radius while only flagging the literal chunks inside.
 * Handles `className="..."`, template literals, `className={cn(...)}`, and
 * `className={cond ? "..." : "..."}`.
 */
function readClassNameValue(src, afterEq) {
  let i = afterEq;
  while (i < src.length && /\s/.test(src[i])) i++;
  const open = src[i];
  if (open === '"' || open === "'") {
    const end = src.indexOf(open, i + 1);
    if (end < 0) return null;
    return { start: i, end: end + 1, text: src.slice(i, end + 1) };
  }
  if (open !== "{") return null;
  let depth = 0;
  let quote = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === "\\") j++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      return { start: i, end: j + 1, text: src.slice(i, j + 1) };
    }
  }
  return null;
}

/**
 * Pull every literal class-name run out of a className expression, as chunks
 * with absolute offsets. Quoted strings yield their contents; template
 * literals yield their static segments AND the literals inside their
 * interpolation holes, because the holes are where this codebase keeps its
 * status/tone ternaries:
 *
 *   className={`px-2 py-0.5 border ${open ? "border-red-300" : "border-line"}`}
 *   className={`px-4 ${cond ? "bg-white" : "border border-line"}`}
 *
 * Skipping the holes would miss the second form entirely. Recursing into them
 * can in principle pick up a non-class string (`${t("some copy")}`), but such
 * a string would have to contain a bare `border` token to be reported, so in
 * practice it costs nothing.
 *
 * Chunks are what we FLAG. The surrounding expression as a whole is what we
 * check for a radius (see checkRule2). The asymmetry is deliberate and it does
 * have one known false positive: `cn(BASE, "border border-line")` where the
 * radius lives inside the identifier `BASE` is reported, because a literal
 * border is visible and no literal radius is. No site in this repo does that
 * (the ui/ primitives keep their border and radius together), and the
 * `design-ok:` escape hatch covers it if one ever appears.
 */
function literalChunks(text, base) {
  const chunks = [];

  // Skip from the `{` of an interpolation hole (or any brace group) to the
  // matching `}`, ignoring braces that sit inside string/template literals.
  const endOfBraceGroup = (s, open) => {
    let depth = 0;
    let quote = null;
    for (let k = open; k < s.length; k++) {
      const ch = s[k];
      if (quote) {
        if (ch === "\\") k++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return k;
    }
    return s.length;
  };

  const collect = (s, off) => {
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '"' || c === "'") {
        const start = i + 1;
        let j = start;
        while (j < s.length && s[j] !== c) j += s[j] === "\\" ? 2 : 1;
        chunks.push({ text: s.slice(start, j), offset: off + start });
        i = j + 1;
        continue;
      }
      if (c === "`") {
        let j = i + 1;
        let segStart = j;
        while (j < s.length && s[j] !== "`") {
          if (s[j] === "\\") {
            j += 2;
            continue;
          }
          if (s[j] === "$" && s[j + 1] === "{") {
            chunks.push({ text: s.slice(segStart, j), offset: off + segStart });
            const close = endOfBraceGroup(s, j + 1);
            collect(s.slice(j + 2, close), off + j + 2); // recurse into the hole
            j = close + 1;
            segStart = j;
            continue;
          }
          j++;
        }
        chunks.push({ text: s.slice(segStart, j), offset: off + segStart });
        i = j + 1;
        continue;
      }
      i++;
    }
  };

  collect(text, base);
  return chunks;
}

/**
 * HEURISTIC: is this gold foreground sitting on a dark surface?
 *
 * On bg-navy gold IS the right foreground, so those sites must not be flagged.
 * Without an AST there is no parent chain, so we approximate it with
 * INDENTATION, which every file in this codebase follows:
 *
 *   1. check the element's own opening tag (covers
 *      `<div className="bg-navy ... text-gold">`), then
 *   2. walk UP, and every time we reach a line indented no further than the
 *      shallowest line seen so far, treat it as an enclosing-scope line. If it
 *      opens a tag, parse that whole opening tag - attributes routinely live
 *      on their own, more deeply indented lines - and look for a dark surface.
 *
 * `<=` rather than `<` is required: a tag and a sibling's attributes can share
 * a column (see components/marketing/landing/QuoteBand.tsx, where the navy
 * `<section>`'s className sits at the same indent as the child `<div>`). The
 * cost is that a preceding SIBLING at the same depth is also inspected, so a
 * dark sibling could mask a real violation - a false NEGATIVE, which is the
 * safe direction for a rule whose false positives would hit every legitimate
 * navy panel in the app.
 */
function isDark(tagText) {
  return DARK_SURFACE.test(tagText) || DARK_TONE_PROP.test(tagText);
}

function isDarkContext(src, lines, starts, idx) {
  const own = resolveOwningTag(src, idx);
  if (own && isDark(own.text)) return true;

  const { line } = positionOf(starts, idx);
  let minIndent = indentOf(lines[line - 1] ?? "");
  for (let i = line - 2; i >= 0; i--) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const ind = indentOf(raw);
    if (ind > minIndent) continue;
    minIndent = ind;
    if (!/^<[A-Za-z]/.test(raw.trimStart())) continue; // `</div>`, `>`, `/>`, code
    const tag = readOpenTag(src, starts[i] + ind);
    if (tag && isDark(tag.text)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Suppressions
// ---------------------------------------------------------------------------

// `// design-ok: reason` and the JSX block-comment form. The marker must
// directly follow a comment opener, so the string "design-ok" appearing in
// ordinary code or copy is never mistaken for one.
const SUPPRESSION = /(?:\/\/|\/\*)\s*design-ok\b[ \t]*:?[ \t]*(.*)$/;

function collectSuppressions(lines) {
  const found = [];
  lines.forEach((raw, i) => {
    const m = SUPPRESSION.exec(raw);
    if (!m) return;
    const reason = m[1].replace(/\*\/\s*\}?\s*$/, "").trim();
    found.push({
      line: i + 1,
      reason,
      valid: reason.length > 0,
      covers: [i + 1, i + 1 + SUPPRESSION_REACH],
      used: 0,
    });
  });
  return found;
}

// ---------------------------------------------------------------------------
// The two rules
// ---------------------------------------------------------------------------

function checkRule1(src, lines, starts, mask, push) {
  GOLD_FOREGROUND.lastIndex = 0;
  let m;
  while ((m = GOLD_FOREGROUND.exec(src))) {
    const idx = m.index;
    if (mask[idx]) continue; // prose, not markup
    const { line, column } = positionOf(starts, idx);
    if (isDarkContext(src, lines, starts, idx)) continue;
    push({
      rule: "gold-on-light",
      line,
      column,
      class: m[0],
      snippet: (lines[line - 1] ?? "").trim(),
      message:
        `\`${m[0]}\` puts the accent SURFACE token on a light background ` +
        `(~1.3:1 - invisible). Use \`${m[1]}-gold-ink\` for muted foreground ` +
        `text, or \`bg-gold\` if a surface was intended.`,
    });
  }
}

// RULE 3 — the app's section-heading register.
//
// Section headings inside the app are 18px/700 with NORMAL letter-spacing,
// measured off app.onfound.com. Both overrides are load-bearing: globals.css
// @layer base sets every h1-h6 to `font-weight: 600` and `letter-spacing:
// -0.02em`, so a bare `text-lg` h2 silently renders 600/-0.02em — it LOOKS
// converted in the source and is wrong on screen. That is the exact failure
// this rule exists to catch, because nothing else would.
//
// Only h2. h1 is display type and belongs on the golden ladder; h3 and below
// are component-internal.
function checkRule3(src, lines, starts, mask, push, relPath) {
  // App routes ONLY. The 18px section register is an app concept: their app
  // labels sections with 18px/700, their MARKETING uses small uppercase
  // eyebrows (measured 11.8px/700), which is what ours already do. On a
  // marketing page a `text-lg` h2 is a CARD TITLE, not a section heading —
  // this rule flagged one on /founders the moment it was added, which is
  // exactly the false positive that would have made it untrustworthy.
  if (!/^app[\/]\(app\)[\/]/.test(relPath || "")) return;
  const H2 = /<h2\b[^>]*className=\s*(?:"([^"]*)"|\{`([^`]*)`\})/g;
  H2.lastIndex = 0;
  let m;
  while ((m = H2.exec(src))) {
    const idx = m.index;
    if (mask[idx]) continue;
    const cls = m[1] ?? m[2] ?? "";
    if (!/\btext-lg\b/.test(cls)) continue; // not the section register
    const missing = [];
    if (!/\bfont-bold\b/.test(cls)) missing.push("font-bold");
    if (!/\btracking-normal\b/.test(cls)) missing.push("tracking-normal");
    if (!missing.length) continue;
    const { line, column } = positionOf(starts, idx);
    push({
      rule: "heading-register",
      line,
      column,
      class: missing.join(" "),
      element: "<h2>",
      snippet: (lines[line - 1] ?? "").trim(),
      message:
        `18px section heading is missing \`${missing.join("` and `")}\`. ` +
        `@layer base already sets h1-h6 to weight 600 / -0.02em, so without ` +
        `these it renders 600/-0.02em instead of the measured 700/normal.`,
    });
  }
}

// RULE 4 - a display-ladder heading that overrides its own line-height.
//
// text-d1..d5 are 26/33/42/53/68px and EACH SHIPS ITS OWN PAIRED line-height,
// tightening as the size grows: 1.30 / 1.25 / 1.15 / 1.10 / 1.05. Adding a
// leading-* utility replaces that paired value, and the direction of the error
// depends on the step, which is why it survives review:
//
//     text-d3 (1.15) + leading-tight (1.25)  ->  10% LOOSER than designed
//     text-d2 (1.25) + leading-tight (1.25)  ->  no-op, so it looks harmless
//     text-d5 (1.05) + leading-tight (1.25)  ->  19% looser
//
// The responsive form is the worst case: `text-d2 lg:text-d3 leading-tight` is
// correct on a phone and wrong at lg, so nobody notices on the device they
// tested. 41 sites across 32 files were live when this rule was written; 19 of
// them were a visible regression rather than a no-op.
//
// leading-none is the opposite failure and matters more in Thai than in Latin.
// The paired values leave room for a tone mark above the ascender and a vowel
// mark below the baseline; 1.0 does not, so Thai headings collide.
//
// ONLY heading elements are checked. A <div> or <blockquote> at a display size
// is a stat number or a pull-quote, where an explicit leading is a real
// decision - the pull-quote in QuoteBand is deliberately leading-relaxed.
const LADDER_HEADING =
  /<(h[1-6])\b[^>]*className=\s*(?:"([^"]*)"|\{`([^`]*)`\})/g;

const LADDER_LH = { d1: 1.3, d2: 1.25, d3: 1.15, d4: 1.1, d5: 1.05 };
const LEADING_VALUE = {
  "leading-none": 1.0,
  "leading-tight": 1.25,
  "leading-snug": 1.375,
  "leading-normal": 1.5,
  "leading-relaxed": 1.625,
  "leading-loose": 2.0,
};

function checkRule4(src, lines, starts, mask, push) {
  LADDER_HEADING.lastIndex = 0;
  let m;
  while ((m = LADDER_HEADING.exec(src))) {
    const idx = m.index;
    if (mask[idx]) continue;
    const cls = m[2] ?? m[3] ?? "";
    const steps = [...cls.matchAll(/\btext-(d[1-5])\b/g)].map((x) => x[1]);
    if (!steps.length) continue;
    const lead = Object.keys(LEADING_VALUE).find((k) =>
      new RegExp("\\b" + k + "\\b").test(cls),
    );
    if (!lead) continue;

    // Describe the actual effect per step so the message is arguable, not dogma.
    const effects = steps.map((st) => {
      const delta = LEADING_VALUE[lead] - LADDER_LH[st];
      if (Math.abs(delta) < 0.001) return `text-${st} unchanged`;
      const dir = delta > 0 ? "LOOSER" : "tighter";
      return `text-${st} ${(Math.abs(delta) / LADDER_LH[st] * 100).toFixed(0)}% ${dir}`;
    });
    const { line, column } = positionOf(starts, idx);
    push({
      rule: "ladder-line-height",
      line,
      column,
      class: lead,
      element: `<${m[1]}>`,
      snippet: (lines[line - 1] ?? "").trim(),
      message:
        `\`${lead}\` overrides the paired line-height of ` +
        `${steps.map((x) => "text-" + x).join(" / ")} (${effects.join(", ")}). ` +
        `Each ladder step ships its own. Delete the leading-* class. ` +
        `Headings at non-ladder sizes (text-xl, text-lg) keep theirs.`,
    });
  }
}

// RULE 5 - a page container on a width the system does not define.
//
// The system has exactly two page widths: max-w-[1120px] for a section
// container (grid or main+aside) and max-w-[640px] for a narrow column (forms,
// editors, settings, onboarding). Tailwind's max-w-2xl/3xl/4xl/5xl presets are
// none of the system's numbers, and reading one back means the page predates
// the rule - 15 of them were live when this was written, across 2xl/3xl/4xl/5xl.
//
// Scoped to the OUTERMOST container of a route file, which is why this only
// looks at page.tsx and only at the first max-w it finds. Inner blocks, modals
// and skeletons are components, not page containers, and are none of its
// business.
//
// Reading/article and chat routes are exempt by the design rules themselves
// ("Reading/article pages keep a narrow column"; "Chat/conversation views are
// full-height"), so they are listed here rather than being flagged forever.
const PAGE_WIDTH_EXEMPT = [
  /\(app\)[\/]community[\/]\[id\][\/]page\.tsx$/,
  /\(app\)[\/]meetups[\/]\[slug\][\/]page\.tsx$/,
  /\(app\)[\/]orgs[\/]\[slug\][\/]chat[\/]page\.tsx$/,
  /\(app\)[\/]funding[\/]\[connectionId\][\/]page\.tsx$/,
  /\(marketing\)[\/](privacy|terms|code-of-conduct)[\/]page\.tsx$/,
  /\(marketing\)[\/]insights[\/]\[slug\][\/]page\.tsx$/,
  /\(marketing\)[\/]founders[\/]\[slug\][\/]page\.tsx$/,
  /\(marketing\)[\/]p[\/]\[id\][\/]page\.tsx$/,
];

const OFF_SYSTEM_WIDTH = /\bmax-w-(?:2xl|3xl|4xl|5xl|6xl|7xl)\b/;

function checkRule5(src, lines, starts, mask, push, relPath) {
  const rel = (relPath || "").replace(/\\/g, "/");
  if (!/[\/]page\.tsx$/.test(rel)) return;
  if (PAGE_WIDTH_EXEMPT.some((re) => re.test(rel))) return;

  // The first max-w on a mx-auto container is the page container.
  const CONTAINER = /className=\s*"([^"]*\bmx-auto\b[^"]*)"/g;
  CONTAINER.lastIndex = 0;
  let m;
  while ((m = CONTAINER.exec(src))) {
    const idx = m.index;
    if (mask[idx]) continue;
    const cls = m[1];
    const bad = cls.match(OFF_SYSTEM_WIDTH);
    if (!bad) continue;
    const { line, column } = positionOf(starts, idx);
    push({
      rule: "page-container-width",
      line,
      column,
      class: bad[0],
      element: "page container",
      snippet: (lines[line - 1] ?? "").trim(),
      message:
        `\`${bad[0]}\` is not one of the system's two page widths. ` +
        `Single column (form, editor, settings, onboarding) -> max-w-[640px]; ` +
        `grid or main+aside -> max-w-[1120px] with the intro block 640 inside it.`,
    });
    return; // outermost container only
  }
}

function checkRule2(src, lines, starts, mask, push) {
  const passthrough = passthroughComponentsOf(src);
  const symbols = symbolTableOf(src, mask);

  const anchor = /\bclassName\s*=/g;
  let m;
  while ((m = anchor.exec(src))) {
    const idx = m.index;
    if (mask[idx]) continue; // prose, not markup

    const value = readClassNameValue(src, anchor.lastIndex);
    if (!value) continue;
    anchor.lastIndex = value.end;

    const tag = resolveOwningTag(src, idx);
    // A Capitalised name (<Card>, <Button>, <LinkButton>, <Combobox>) is a React
    // component. Which DOM element it renders cannot be known without following
    // the import, so it is SKIPPED - and that is safe for the primitives in this
    // repo, because they carry their own radius (Card ships `rounded-xl`,
    // Button/LinkButton ship `rounded-full` in BASE) or forward className onto
    // an <input> (Combobox). The exception is a documented PASS-THROUGH such as
    // next/link, which renders a bare <a> and adds nothing - lint it as the
    // element it really is. Same skip for a className with no resolvable tag at
    // all: a bare class constant, an object literal.
    if (!tag) continue;
    let tagName = tag.tagName;
    let renderedAs = "";
    if (!/^[a-z]/.test(tagName)) {
      const dom = passthrough.get(tagName);
      if (!dom) continue;
      renderedAs = `, which renders a plain <${dom}> (not rounded by @layer base),`;
      tagName = dom;
    }

    // app/globals.css @layer base rounds these by element - no class needed.
    if (SELF_ROUNDING_TAGS.has(tagName)) {
      const isSquareInput =
        tagName === "input" && UNROUNDED_INPUT_TYPE.test(tag.text);
      if (!isSquareInput) continue;
    }
    if (ROLE_BUTTON.test(tag.text)) continue;

    // Classes reachable through module-level identifiers, e.g.
    // `className={pillCls(status)}` -> pillCls -> PILL_BASE.
    const borrowed = reachableSymbols(value.text, symbols);

    // A radius ANYWHERE in the expression exempts it: the rounded class often
    // lives in a different branch or slot than the border, e.g. MessageThread's
    // `max-w-[75%] px-4 py-3 rounded-2xl ${mine ? ... : "... border border-line"}`.
    // The borrowed bodies count too - the radius may live in the shared const.
    if (HAS_RADIUS.test(value.text)) continue;
    if (borrowed.some((s) => HAS_RADIUS.test(s.text))) continue;

    // `chunkAt` is the absolute offset of the chunk when it is written in place
    // (so the caret can land on the `border` token itself); for a borrowed
    // constant it is null and the report anchors on the className expression.
    const report = (chunk, chunkAt, via) => {
      const tokens = chunk.split(/\s+/).filter(Boolean);
      const box = tokens.find((t) => FULL_BOX_BORDER.test(t));
      if (!box) return;
      const colours = tokens.filter((t) => BORDER_COLOUR.test(t));
      const offending = [box, ...colours].join(" ");
      const at =
        chunkAt === null ? value.start : chunkAt + Math.max(0, chunk.indexOf(box));
      const { line, column } = positionOf(starts, at);
      push({
        rule: "unrounded-surface",
        line,
        column,
        class: offending,
        element: `<${tag.tagName}>`,
        snippet: (lines[line - 1] ?? "").trim(),
        message:
          `\`${offending}\` draws a full box on <${tag.tagName}>${renderedAs} ` +
          `with no \`rounded-*\`${via ? ` (via \`${via}\`)` : ""}. Cards/panels ` +
          `are \`rounded-xl\`, chips/badges \`rounded-full\`, landing cards ` +
          `\`rounded-[22px]\`.`,
      });
    };

    for (const chunk of literalChunks(value.text, value.start)) {
      report(chunk.text, chunk.offset, "");
    }
    // Borrowed classes are reported at the RENDER site, not at the constant:
    // the constant may be perfectly fine on the <button> next door, and the
    // square element is the thing a reviewer has to look at.
    const seenVia = new Set();
    for (const sym of borrowed) {
      for (const chunk of literalChunks(sym.text, 0)) {
        const tokens = chunk.text.split(/\s+/).filter(Boolean);
        if (!tokens.some((t) => FULL_BOX_BORDER.test(t))) continue;
        if (seenVia.has(sym.name)) continue;
        seenVia.add(sym.name);
        report(chunk.text, null, sym.name);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// RULE 6 - a hand-written copy of a recipe a primitive already owns
// ---------------------------------------------------------------------------
//
// The primitives sweep (batches 0-4) rests on one finding: the app's
// inconsistency never came from LACKING a library, it came from BYPASSING the
// primitives that already existed. The pre-sweep counts are the whole
// argument - 70 hand-written card recipes against 14 <Card>, and 63
// hand-rolled primary buttons against 52 uses of the primitive. Nothing in the
// repo stopped copy number 71 from being written, so the sweep buys one clean
// tree and nothing else unless a rule holds the line.
//
// This is the only rule in this file that is about AUTHORSHIP rather than
// about pixels: every site it reports renders correctly today. That is exactly
// why it needs a linter - a reviewer has no reason to object to a class string
// that looks right, and by the time drift is visible it is 70 sites deep.
//
// == HOW THE RECIPES ARE OBTAINED =========================================
// They are READ OUT OF THE PRIMITIVES at startup (primitiveRecipes below), not
// written down here. A rule that hardcodes `bg-navy hover:bg-navy-dark` starts
// lying the day someone edits VARIANT_CLASSES, and it would lie silently. If a
// primitive is renamed or restructured the derivation THROWS and the whole run
// exits 2 with the reason - loud, never quiet.
//
// The signature of a button variant is its COLOUR IDENTITY: every token in the
// variant string except
//   - `border`        a WIDTH, not a colour (`secondary` and `outline` share it)
//   - `bg-transparent` an inert reset. Batch 3 already recorded this: it lists
//                      "bg-transparent on an already transparent element" among
//                      the differences it accepted as having no visual effect.
// VARIANT_CLASSES holds colours only - sizes live in SIZE_CLASSES - so nothing
// else in those strings needs filtering. Deriving it this way lands on exactly
// the pairs a reviewer would name: primary = the navy fill AND its hover,
// secondary = the hairline AND its hover, each plus its text colour.
//
// The card signature is `cardClasses()`'s own radius plus TONE_CLASSES.white.
//
// == WHAT IT MUST NOT FIRE ON =============================================
//   components/ui/**      the recipes are DEFINED there. Card.tsx, Button.tsx
//                         and Dialog.tsx (`card: "bg-white rounded-3xl
//                         shadow-xs"`) all write them out in full, correctly.
//   marketing BUTTONS     app/(marketing)/** and components/marketing/**. Six
//                         hand-rolled navy CTAs live there today - five under
//                         app/(marketing) (contact, founders/[slug],
//                         insights/[slug], p/[id] x2) and MarketingNav - and
//                         marketing was never in the sweep's file set. They are
//                         a future batch, not lint debt, and failing the build
//                         on six sites nobody agreed to migrate is how a linter
//                         gets switched off. DELIBERATE, and reversed by
//                         deleting `scope` from the two button recipes when
//                         that batch lands. Marketing is NOT exempt from the
//                         CARD recipe: 24px + shadow-xs is a treatment
//                         marketing deliberately does not use (its cards are
//                         `rounded-[22px]` + `border-line`, no shadow), so an
//                         app card appearing there is drift either way. It
//                         currently matches nothing on a marketing page.
//   marketing CARDS       not by a path rule but by the signature: they carry
//                         no `rounded-3xl` and no `shadow-xs`, so they cannot
//                         match. The split between the two surfaces is
//                         deliberate on Onfound's side and ours - do not unify.
//   legacy rounded-xl     out of the sweep's scope throughout; the card
//                         signature requires `rounded-3xl`, so a 14px card is
//                         invisible to this rule by construction.
//   <Card className=...>  a Capitalised tag is skipped wholesale (same rule as
//   <Button className=…>  checkRule2), so overriding a primitive - the
//                         DOCUMENTED pattern for off-scale padding, per
//                         Button.tsx's `px-5 py-2.5` note - never reports.
//   bordered sub-panels   MeetupJoinControls' `PANEL` is `rounded-3xl border
//                         border-line bg-white p-5`: deliberately NOT a Card
//                         (it needs a boundary that survives a white ground).
//                         No `shadow-xs`, so no match - the recipe it copies is
//                         not one a primitive owns.
//
// == THE ONE CARVE-OUT THAT IS A JUDGEMENT CALL ===========================
// A button recipe also has to carry a padding from the canonical SIZE scale
// (every SIZE_CLASSES entry is `px-*`-based, asserted at load). Without it the
// rule reports icon-only buttons - MeetupChat's send button is `grid h-11 w-11
// place-items-center rounded-full bg-navy text-white hover:bg-navy-dark`, a
// complete primary face on a FIXED BOX. Icon-only buttons are out of the
// sweep's scope throughout (batches 1, 3 and 4 each say so) and they are not
// copies of the primitive: they use none of its four sizes. KNOWN LIMIT, stated
// rather than hidden: a navy button padded with `p-3` instead of `px-3 py-3`
// slips through. Widening to `p-*` would instead report navy CARD-shaped tiles,
// which is the worse error.

// Where the recipes are read from. Paths, not imports: this file is ESM with
// zero dependencies and cannot parse TSX.
const PRIMITIVE_CARD = "components/ui/Card.tsx";
const PRIMITIVE_BUTTON = "components/ui/Button.tsx";

const RULE6_UI_PATH = /^components[\/]ui[\/]/;
const RULE6_MARKETING_PATH =
  /^(?:app[\/]\(marketing\)|components[\/]marketing)[\/]/;

/** A token that names no colour and so carries no identity. See the header. */
const RECIPE_NOISE = new Set(["bg-transparent"]);

/** `const NAME ...= { key: "value", ... }` -> Map(key -> value). */
function recordLiteralOf(src, mask, name, where) {
  const decl = new RegExp(`(?:const|let|var)\\s+${name}\\b[^=]*=\\s*\\{`);
  const m = decl.exec(src);
  if (!m || mask[m.index]) {
    throw new Error(`${where}: cannot find \`${name}\``);
  }
  const open = m.index + m[0].length - 1;
  const body = src.slice(open, endOfInitialiser(src, open, true));
  const out = new Map();
  const ENTRY = /(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*"([^"]*)"/g;
  let e;
  while ((e = ENTRY.exec(body))) out.set(e[1] ?? e[2], e[3]);
  if (!out.size) throw new Error(`${where}: \`${name}\` has no string entries`);
  return out;
}

function tokensOf(s) {
  return s.split(/\s+/).filter(Boolean);
}

/** A variant string reduced to the tokens that give it its face. */
function colourIdentityOf(variant) {
  return tokensOf(variant).filter(
    (t) => !RECIPE_NOISE.has(t) && !FULL_BOX_BORDER.test(t),
  );
}

let RECIPES = null;

/**
 * Read the recipes out of the primitives. Throws - loudly, with the file and
 * the symbol - rather than degrading into a rule that silently matches
 * nothing. Called once from main() before the walk.
 */
function primitiveRecipes() {
  if (RECIPES) return RECIPES;

  const read = (rel) => {
    const abs = path.resolve(process.cwd(), rel);
    let src;
    try {
      src = fs.readFileSync(abs, "utf8");
    } catch {
      throw new Error(`${rel}: unreadable (run from the repo root)`);
    }
    const lines = src.split(/\r?\n/);
    // Comment-masked, because both primitives DOCUMENT their own recipes in
    // prose above the code - Card.tsx's header writes `bg-white + shadow-xs`
    // and Button.tsx's writes `bg-navy hover:bg-navy-dark` - and parsing the
    // documentation instead of the code would be a very quiet way to be wrong.
    return { src, mask: commentMaskOf(src, lineStartsOf(src), lines) };
  };

  const card = read(PRIMITIVE_CARD);
  const radius = /export function cardClasses[\s\S]*?return cn\(\s*"([^"]*)"/.exec(
    card.src,
  );
  if (!radius) {
    throw new Error(`${PRIMITIVE_CARD}: cannot read cardClasses()'s base`);
  }
  const tones = recordLiteralOf(card.src, card.mask, "TONE_CLASSES", PRIMITIVE_CARD);
  if (!tones.has("white")) {
    throw new Error(`${PRIMITIVE_CARD}: TONE_CLASSES has no \`white\``);
  }

  const button = read(PRIMITIVE_BUTTON);
  const variants = recordLiteralOf(
    button.src,
    button.mask,
    "VARIANT_CLASSES",
    PRIMITIVE_BUTTON,
  );
  const sizes = recordLiteralOf(
    button.src,
    button.mask,
    "SIZE_CLASSES",
    PRIMITIVE_BUTTON,
  );
  for (const key of ["primary", "secondary"]) {
    if (!variants.has(key)) {
      throw new Error(`${PRIMITIVE_BUTTON}: VARIANT_CLASSES has no \`${key}\``);
    }
  }
  // The size carve-out is only honest while the scale really is px-based.
  const SIZE_PAD = /^px-/;
  for (const [key, value] of sizes) {
    if (!tokensOf(value).some((t) => SIZE_PAD.test(t))) {
      throw new Error(
        `${PRIMITIVE_BUTTON}: SIZE_CLASSES.${key} has no px-* padding - ` +
          "rule 6's icon-only carve-out assumed every size is px-based",
      );
    }
  }

  const isButtonish = (tagName) => tagName === "button" || tagName === "a";
  const notMarketing = (rel) => !RULE6_MARKETING_PATH.test(rel);

  RECIPES = [
    {
      key: "app-card",
      what: "the app content card",
      // `cardClasses()`'s own radius + the default tone.
      tokens: [...tokensOf(radius[1]), ...colourIdentityOf(tones.get("white"))],
      onElement: () => true,
      fix:
        "use `<Card>` - or `cardClasses()` when the surface must be a <Link>, " +
        "which Card deliberately does not render",
    },
    {
      key: "primary button",
      what: "the primary button face",
      tokens: colourIdentityOf(variants.get("primary")),
      onElement: isButtonish,
      needsSize: SIZE_PAD,
      scope: notMarketing,
      fix: 'use `<Button variant="primary">`, or `<LinkButton>` for a navigation',
    },
    {
      key: "secondary button",
      what: "the secondary button face",
      tokens: colourIdentityOf(variants.get("secondary")),
      onElement: isButtonish,
      needsSize: SIZE_PAD,
      scope: notMarketing,
      fix: 'use `<Button variant="secondary">` / `<LinkButton variant="secondary">`',
    },
  ];
  return RECIPES;
}

function checkRule6(src, lines, starts, mask, push, relPath) {
  const rel = (relPath || "").replace(/\\/g, "/");
  if (RULE6_UI_PATH.test(rel)) return; // the recipes are DEFINED here
  const recipes = primitiveRecipes();

  const passthrough = passthroughComponentsOf(src);
  const symbols = symbolTableOf(src, mask);

  const anchor = /\bclassName\s*=/g;
  let m;
  while ((m = anchor.exec(src))) {
    const idx = m.index;
    if (mask[idx]) continue; // prose, not markup

    const value = readClassNameValue(src, anchor.lastIndex);
    if (!value) continue;
    anchor.lastIndex = value.end;

    const tag = resolveOwningTag(src, idx);
    if (!tag) continue;
    let tagName = tag.tagName;
    let renderedAs = "";
    if (!/^[a-z]/.test(tagName)) {
      // A Capitalised tag is a component. <Card>/<Button>/<LinkButton> ARE the
      // primitives, and passing them a className override is the documented
      // pattern - never drift. Anything else cannot be resolved without
      // following the import. Both are skipped, exactly as in checkRule2; the
      // exception is the same one, next/link, which renders a bare <a>.
      const dom = passthrough.get(tagName);
      if (!dom) continue;
      renderedAs = ` (a <${tagName}>, which renders a plain <${dom}>)`;
      tagName = dom;
    }

    // The token universe of this className: the literals written in place plus
    // the bodies of every module-level constant it reaches. Rule 2 follows the
    // same path for the opposite reason (there, to find a radius hidden in a
    // shared const). The direction of the error is worth stating: expansion
    // UNIONS text, so in principle two mutually-exclusive ternary branches
    // could assemble a recipe neither one renders. Nothing in the tree does -
    // the nearest miss is HostMeetupWizard's PICK/PICK_ON/PICK_OFF trio, whose
    // union holds `border-line` and `hover:border-navy` but not `text-navy`,
    // one token short of the secondary face - and `design-ok:` covers it if a
    // real collision ever appears.
    const at = new Map();
    const tokens = new Set();
    const add = (chunk, offset) => {
      let scan = 0;
      for (const t of tokensOf(chunk)) {
        tokens.add(t);
        if (offset === null || at.has(t)) continue;
        const k = chunk.indexOf(t, scan);
        if (k < 0) continue;
        scan = k + t.length;
        at.set(t, offset + k);
      }
    };
    for (const c of literalChunks(value.text, value.start)) add(c.text, c.offset);
    const borrowed = reachableSymbols(value.text, symbols);
    for (const sym of borrowed) {
      for (const c of literalChunks(sym.text, 0)) add(c.text, null);
    }
    if (!tokens.size) continue;

    for (const recipe of recipes) {
      if (recipe.scope && !recipe.scope(rel)) continue;
      if (!recipe.onElement(tagName)) continue;
      if (!recipe.tokens.every((t) => tokens.has(t))) continue;
      if (
        recipe.needsSize &&
        ![...tokens].some((t) => recipe.needsSize.test(t))
      ) {
        continue;
      }
      const via = borrowed
        .filter((s) => recipe.tokens.some((t) => tokensOf(s.text).includes(t)))
        .map((s) => s.name);
      // Anchor on the first recipe token written in place, so the caret lands
      // on the class itself; a recipe assembled entirely inside a constant
      // anchors on the className expression instead.
      const hit = recipe.tokens.map((t) => at.get(t)).filter((x) => x != null);
      const pos = positionOf(starts, hit.length ? Math.min(...hit) : value.start);
      push({
        rule: "hand-rolled-primitive",
        line: pos.line,
        column: pos.column,
        class: recipe.tokens.join(" "),
        element: `<${tag.tagName}>`,
        snippet: (lines[pos.line - 1] ?? "").trim(),
        message:
          `<${tag.tagName}>${renderedAs} hand-writes ${recipe.what} ` +
          `(\`${recipe.tokens.join(" ")}\`` +
          `${via.length ? `, partly via \`${via.join("`, `")}\`` : ""}). ` +
          `That recipe belongs to a primitive: ${recipe.fix}. ` +
          `70 hand-written cards against 14 <Card>, and 63 hand-rolled navy ` +
          `buttons against 52 primitive uses, is what the sweep just undid.`,
      });
      // One report per element. A string CAN satisfy two recipes at once (a
      // card surface that also wears the secondary face), but the fix is the
      // same conversation either way and two carets on one line reads as a
      // linter shouting.
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function walk(root, out, errors) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (err) {
    errors.push({ path: root, message: err.message });
    return;
  }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out, errors);
    } else if (e.isFile()) {
      if (e.name.endsWith(".d.ts")) continue;
      if (SOURCE_EXT.has(path.extname(e.name))) out.push(full);
    }
  }
}

function lintFile(absPath, relPath, errors) {
  let src;
  try {
    src = fs.readFileSync(absPath, "utf8");
  } catch (err) {
    errors.push({ path: relPath, message: err.message });
    return null;
  }
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

  const lines = src.split(/\r?\n/);
  const starts = lineStartsOf(src);
  const suppressions = collectSuppressions(lines);
  const raw = [];

  // A malformed or exotic file must never crash the whole run.
  try {
    const mask = commentMaskOf(src, starts, lines);
    checkRule1(src, lines, starts, mask, (v) => raw.push(v));
    checkRule2(src, lines, starts, mask, (v) => raw.push(v));
    checkRule3(src, lines, starts, mask, (v) => raw.push(v), relPath);
    checkRule4(src, lines, starts, mask, (v) => raw.push(v));
    checkRule5(src, lines, starts, mask, (v) => raw.push(v), relPath);
    checkRule6(src, lines, starts, mask, (v) => raw.push(v), relPath);
  } catch (err) {
    errors.push({ path: relPath, message: `scan failed: ${err.message}` });
    return null;
  }

  const violations = [];
  let suppressed = 0;
  for (const v of raw) {
    // Credit the NEAREST covering marker. Suppression windows overlap (each
    // reaches 3 lines down), and crediting the first one found would leave a
    // genuinely-used marker looking stale.
    const hit = suppressions
      .filter((s) => s.valid && v.line >= s.covers[0] && v.line <= s.covers[1])
      .sort((a, b) => v.line - a.line - (v.line - b.line))[0];
    if (hit) {
      hit.used++;
      suppressed++;
      continue;
    }
    violations.push({ file: relPath, ...v });
  }

  // A reasonless `design-ok` is itself an error - the escape hatch only stays
  // trustworthy while every use of it explains itself.
  const invalid = suppressions
    .filter((s) => !s.valid)
    .map((s) => ({ file: relPath, line: s.line }));

  // A suppression that silences nothing is how a file drifts back: the code it
  // guarded got fixed or deleted, and the marker now blanket-exempts 4 lines.
  const unused = suppressions
    .filter((s) => s.valid && s.used === 0)
    .map((s) => ({ file: relPath, line: s.line, reason: s.reason }));

  return { violations, suppressed, invalid, unused };
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

const RULE_DOCS = {
  "gold-on-light": [
    "gold-on-light - `gold` (#E9E2D4) is an accent SURFACE token, not a foreground.",
    "  On cream/white it renders at ~1.3:1 and is invisible. It has shipped three",
    "  times: the admin Verified pill, the onboarding step indicator, and eight",
    "  sites on the meetups pages.",
    "  FIX   muted text -> text-gold-ink (#6A655D)    a surface -> bg-gold / border-gold",
    "  NOTE  gold as a foreground on bg-navy is CORRECT and is not reported -",
    "        whether the dark surface arrives as a class (`bg-navy`) or as a prop",
    "        (`<Card tone=\"navy\">`). A tone computed at runtime still cannot be",
    "        seen, and is the one place a `design-ok:` marker is still needed.",
  ],
  "unrounded-surface": [
    "unrounded-surface - a full box border with no radius is a square card in a",
    "  rounded product. APP cards rounded-3xl (24px) borderless + shadow-xs,",
    "  marketing cards rounded-[22px] bordered, chips/badges rounded-full,",
    "  landing marketing cards rounded-[22px].",
    "  NOT reported: button / [role=button] / input / textarea / select (rounded",
    "  by element in app/globals.css @layer base), partial borders (border-t and",
    "  friends), and Capitalised components (the ui/ primitives carry a radius) -",
    "  except next/link, which renders a bare <a> the base layer does not round.",
    "  Classes reached through a module-level constant are followed and reported",
    "  at the element that renders them.",
  ],
  "ladder-line-height": [
    "ladder-line-height - text-d1..d5 each ship their OWN paired line-height",
    "  (1.30 / 1.25 / 1.15 / 1.10 / 1.05, tightening as the size grows). A",
    "  leading-* utility replaces it, and the error flips direction per step:",
    "  text-d3 + leading-tight is 10% LOOSER, text-d2 + leading-tight is a no-op.",
    "  `text-d2 lg:text-d3 leading-tight` is therefore right on a phone and wrong",
    "  at lg, which is how 19 real regressions survived review.",
    "  FIX   delete the leading-* class. Headings at non-ladder sizes keep theirs.",
    "  NOTE  only h1-h6 are checked - a <div> or <blockquote> at display size is a",
    "        stat number or a pull-quote, where explicit leading is a decision.",
  ],
  "page-container-width": [
    "page-container-width - the system defines exactly two page widths:",
    "  max-w-[1120px] for a section container (grid or main+aside) and",
    "  max-w-[640px] for a narrow column (forms, editors, settings, onboarding).",
    "  Tailwind's 2xl/3xl/4xl/5xl presets are none of the system's numbers.",
    "  FIX   pick the one that matches the page shape. 640 puts a full-width field",
    "        at 560px and a two-column row at 272px each.",
    "  NOTE  only the OUTERMOST container of a page.tsx is checked. Reading/article",
    "        and chat routes are exempt by the design rules and are skipped.",
  ],
  "hand-rolled-primitive": [
    "hand-rolled-primitive - a class string that REBUILDS a recipe a primitive",
    "  already owns. The app's inconsistency never came from lacking a library, it",
    "  came from bypassing the primitives that existed: 70 hand-written card",
    "  recipes against 14 <Card>, and 63 hand-rolled primary buttons against 52",
    "  uses of the primitive. Batches 0-4 migrated all of them; nothing else stops",
    "  copy number 71. This is the one rule here about AUTHORSHIP, not pixels -",
    "  every site it reports renders correctly today, which is exactly why review",
    "  never catches it.",
    "  FIX   card -> <Card> (cardClasses() when the surface must be a <Link>);",
    "        navy CTA -> <Button variant=\"primary\"> / <LinkButton>;",
    "        hairline outline -> <Button variant=\"secondary\">.",
    "  NOTE  the recipes are READ OUT OF Card.tsx and Button.tsx at startup, never",
    "        written down here - a hardcoded copy would start lying the day",
    "        VARIANT_CLASSES changed, and would lie silently. If a primitive is",
    "        renamed the derivation throws and the run exits 2.",
    "  NOTE  NOT reported: components/ui/** (the recipes are DEFINED there);",
    "        Capitalised tags, so passing <Card>/<Button> a className override -",
    "        the documented pattern for off-scale padding - is never drift;",
    "        marketing cards (rounded-[22px] + border-line, no shadow: a",
    "        deliberately different surface, do not unify) and legacy rounded-xl",
    "        cards, both invisible by signature rather than by exemption;",
    "        icon-only buttons, which carry no px-* from the size scale.",
    "  SCOPE the two BUTTON recipes skip app/(marketing)/** and",
    "        components/marketing/**. Six hand-rolled navy CTAs live there and",
    "        marketing was never in the sweep's file set - they are a future batch,",
    "        not lint debt. Deliberate: delete `scope` from those two recipes when",
    "        that batch lands. The CARD recipe is NOT scoped - 24px + shadow-xs is",
    "        a treatment marketing does not use, so it would be drift there too.",
  ],
};

function humanReport(result, opts) {
  const c = process.stdout.isTTY
    ? { dim: "\x1b[2m", red: "\x1b[31m", yel: "\x1b[33m", b: "\x1b[1m", r: "\x1b[0m" }
    : { dim: "", red: "", yel: "", b: "", r: "" };
  const out = [];
  out.push(`${c.b}design-lint${c.r} ${c.dim}- Cofoundee design system${c.r}`);
  out.push("");

  const byFile = new Map();
  for (const v of result.violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
  }
  for (const [file, vs] of byFile) {
    out.push(`${c.b}${file}${c.r}`);
    vs.sort((a, b) => a.line - b.line || a.column - b.column);
    for (const v of vs) {
      out.push(
        `  ${c.red}${String(v.line).padStart(4)}:${String(v.column).padEnd(3)}${c.r}` +
          ` ${v.rule.padEnd(17)} ${c.b}${v.class}${c.r}`,
      );
      out.push(`       ${c.dim}${v.message}${c.r}`);
      out.push(`       ${c.dim}${v.snippet.slice(0, 150)}${c.r}`);
    }
    out.push("");
  }

  for (const s of result.invalidSuppressions) {
    out.push(
      `${c.red}${s.file}:${s.line}${c.r}  bad-suppression  ` +
        "`design-ok` with no reason. Write `// design-ok: <why this is fine>`.",
    );
  }
  if (result.invalidSuppressions.length) out.push("");

  for (const s of result.unusedSuppressions) {
    out.push(
      `${opts.strictUnused ? c.red : c.yel}stale${c.r} ${s.file}:${s.line}  ` +
        `\`design-ok: ${s.reason}\` suppresses nothing - delete it.`,
    );
  }
  if (result.unusedSuppressions.length) out.push("");

  // Print the WHY for whichever rules actually fired; print both when clean, so
  // that the person who runs this for the first time still learns the rules.
  const fired = new Set(result.violations.map((v) => v.rule));
  out.push(`${c.b}WHY THESE RULES EXIST${c.r}`);
  for (const key of Object.keys(RULE_DOCS)) {
    if (fired.size && !fired.has(key)) continue;
    out.push(...RULE_DOCS[key].map((l) => `  ${l}`));
    out.push("");
  }
  out.push(
    `  ${c.dim}Legitimate exception? Put \`// design-ok: <reason>\` on the line,`,
    `  or up to ${SUPPRESSION_REACH} lines above it. The reason is required.${c.r}`,
    "",
  );

  for (const e of result.errors) {
    out.push(`${c.red}error${c.r} ${e.path}: ${e.message}`);
  }
  if (result.errors.length) out.push("");

  const s = result.summary;
  out.push(
    `${s.violations} violation${s.violations === 1 ? "" : "s"} - ` +
      `${s.suppressed} suppressed - ` +
      `${s.unusedSuppressions} stale suppression${s.unusedSuppressions === 1 ? "" : "s"} - ` +
      `${s.invalidSuppressions} reasonless - ` +
      `${s.filesScanned} files scanned`,
  );
  return out.join("\n");
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      [
        "design-lint - Cofoundee design system checks (zero dependencies)",
        "",
        "  node scripts/design-lint.mjs [roots...] [options]",
        "",
        "  --json                   machine-readable JSON on stdout",
        "  --unused-suppressions    fail (exit 1) on stale `design-ok` comments;",
        "                           they are always REPORTED either way",
        "  --help                   this text",
        "",
        `  roots default to: ${DEFAULT_ROOTS.join(", ")}`,
        "",
        "  exit 0 clean - 1 violations - 2 the linter itself failed",
        "",
      ].join("\n"),
    );
    return EXIT_OK;
  }

  const json = args.includes("--json");
  const strictUnused = args.includes("--unused-suppressions");
  const roots = args.filter((a) => !a.startsWith("-"));
  const useRoots = roots.length ? roots : DEFAULT_ROOTS;

  const cwd = process.cwd();
  const errors = [];
  const files = [];
  for (const r of useRoots) {
    const abs = path.resolve(cwd, r);
    if (!fs.existsSync(abs)) {
      process.stderr.write(
        `design-lint: no such path: ${r}\n` +
          "  run it from the repo root, or pass explicit roots.\n",
      );
      return EXIT_SCRIPT_FAILURE;
    }
    if (fs.statSync(abs).isDirectory()) walk(abs, files, errors);
    else files.push(abs);
  }
  files.sort();

  // Rule 6 reads its recipes out of the primitives. Do it ONCE, here, so a
  // renamed primitive or a restructured VARIANT_CLASSES stops the run with the
  // reason instead of turning into a rule that quietly matches nothing.
  try {
    primitiveRecipes();
  } catch (err) {
    process.stderr.write(
      `design-lint: cannot derive rule 6's recipes from the primitives.\n` +
        `  ${err.message}\n` +
        "  This rule reads them from the source on purpose - see RULE 6.\n",
    );
    return EXIT_SCRIPT_FAILURE;
  }

  const violations = [];
  const invalidSuppressions = [];
  const unusedSuppressions = [];
  let suppressed = 0;

  for (const abs of files) {
    const rel = toPosix(path.relative(cwd, abs));
    const r = lintFile(abs, rel, errors);
    if (!r) continue;
    violations.push(...r.violations);
    invalidSuppressions.push(...r.invalid);
    unusedSuppressions.push(...r.unused);
    suppressed += r.suppressed;
  }

  const summary = {
    filesScanned: files.length,
    violations: violations.length,
    suppressed,
    unusedSuppressions: unusedSuppressions.length,
    invalidSuppressions: invalidSuppressions.length,
    byRule: violations.reduce((acc, v) => {
      acc[v.rule] = (acc[v.rule] ?? 0) + 1;
      return acc;
    }, {}),
  };

  // A reasonless suppression is always a failure. A stale one only fails under
  // --unused-suppressions, but is always printed so it cannot rot quietly.
  const failed =
    violations.length > 0 ||
    invalidSuppressions.length > 0 ||
    (strictUnused && unusedSuppressions.length > 0);

  const result = {
    ok: !failed,
    summary,
    violations,
    invalidSuppressions,
    unusedSuppressions,
    errors,
  };

  if (json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(humanReport(result, { strictUnused }) + "\n");

  if (errors.length) return EXIT_SCRIPT_FAILURE;
  return failed ? EXIT_VIOLATIONS : EXIT_OK;
}

try {
  process.exitCode = main(process.argv);
} catch (err) {
  process.stderr.write(`design-lint: fatal: ${err?.stack ?? err}\n`);
  process.exitCode = EXIT_SCRIPT_FAILURE;
}
