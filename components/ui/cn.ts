// Cofoundee — className joiner + Tailwind conflict resolver. CLIENT-SAFE.
//
// ── WHY THIS IS NOT A PLAIN JOINER ANY MORE ────────────────────────────────
// It used to be `parts.filter(Boolean).join(" ")`, and its own comment warned
// that it "does NOT de-duplicate conflicting utilities". That warning was the
// bug: when a caller override and a primitive's base string both set the same
// property, BOTH land on the element at equal specificity, and the winner is
// whichever Tailwind emitted LATER in the stylesheet — not whichever the
// caller wrote last. Measured in the built CSS: `.px-3`(40611) < `.px-4`(40657)
// < `.px-5` < `.px-6`, and `.bg-cream`(36950) < `.bg-gold-soft`(37415) <
// `.bg-navy`(37855) < `.bg-white`(38494). So overriding a padding DOWNWARD, or
// a background to anything alphabetically before `bg-white`, silently lost —
// and the call site read as perfectly correct.
//
// `tailwind-merge` removes the whole class of bug: the last conflicting
// utility in the argument list wins, which is what everyone already assumed.
//
// ── THE CUSTOM SCALE IS LOAD-BEARING ───────────────────────────────────────
// tailwind-merge resolves `text-*` into EITHER font-size or text-colour, using
// its own default font-size scale. Our display and numeral ladders
// (`text-d1..d5`, `text-num1..num3`) are not on that scale, so out of the box
// it classified them as COLOURS and dropped them next to a real colour:
//
//     twMerge("text-d2 text-navy")                    -> "text-navy"        ✗
//     twMerge("font-serif text-num1 text-navy")       -> "font-serif text-navy" ✗
//
// i.e. every ladder heading would have silently collapsed to 16px. Teaching
// the merger the two custom scales fixes it (verified: both cases now keep
// both classes). ANY new `--text-*` token added to globals.css @theme MUST be
// added here too, or it will be eaten the same way.
//
// ── NEVER PUT A `leading-*` BEFORE A `text-<size>` IN ONE cn() CHAIN ────────
// Tailwind v4's `text-<size>` also sets a line-height (`text-sm/6`), so
// tailwind-merge has font-size OVERRIDE the `leading` group. A `leading-*`
// written earlier in the argument list is therefore DELETED, not merged:
//
//     cn("leading-relaxed max-w-md", "text-sm")  -> "max-w-md text-sm"     ✗
//     cn("max-w-md", "text-sm", "leading-relaxed")
//                                -> "max-w-md text-sm leading-relaxed"    ✓
//
// This already bit EmptyState's `dense` description (1.625 -> 1.43 on Thai
// body copy, 13 sites, invisible in review). A primitive whose BASE string
// carries a `leading-*` loses it the moment a caller passes any `text-<size>`
// override — so put the line-height LAST, and expect this in the call-site
// migration batches, where `text-sm`/`text-xs` overrides are routine.

import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // Mirrors the --text-* tokens in app/globals.css @theme.
      text: ["d1", "d2", "d3", "d4", "d5", "num1", "num2", "num3"],
    },
  },
});

export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return twMerge(parts);
}
