// Cofoundee — the shape of a legal document. CLIENT-SAFE (pure data types).
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// /privacy, /terms and /code-of-conduct used to be ~190 lines of hardcoded
// ENGLISH JSX each, on a product whose default locale is Thai. Every copy edit
// was a React edit, and a translator could not touch one without touching a
// page component. The documents now live here as data and the pages are thin.
//
// ── INLINE MARKUP: TWO FORMS, AND ONLY TWO ─────────────────────────────────
// Any `text` / `desc` / list item below may carry:
//
//     [label](/internal)  [label](mailto:…)   -> a link
//     **bold**                                -> emphasis
//
// They exist because the JSX carried NINE links (terms -> /code-of-conduct,
// terms -> /privacy, code-of-conduct -> both, four mailto:) and TWO inline
// bolds (terms §8 opens with the load-bearing disclaimer of the whole
// document; the code of conduct names the **Report profile** button). Moving
// the documents into flat strings would have dropped all eleven — a page that
// promises "email us to exercise your rights" with no mailto: is a defect, not
// a style nit.
//
// The renderer (components/legal/LegalDocument.tsx) parses exactly these two
// forms and nothing else. It is NOT markdown: no headings, no nested markup,
// no images. Anything else passes through as literal text, so a stray `*` in
// legal copy cannot silently restructure a clause.
//
// ── SECTION IDS ARE URL ANCHORS, SO THEY ARE TYPED ─────────────────────────
// Each section id is a fragment someone may have bookmarked or linked to from
// outside the product, and the SAME anchor has to resolve in both locales —
// /privacy#data-security must land on the same section whether the reader is
// on EN or TH. `defineLegalContent` therefore takes the id list ONCE, as a
// const tuple, and types both locales' section arrays against it: rename an id
// in one locale, or reorder one locale's sections, and `tsc` fails. Keep ids
// ascii, lowercase and hyphenated.

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: readonly string[] }
  /**
   * A term/definition list. Used where the English bolded a lead-in term
   * ("**Account data** — full name, …"), which is a definition list wearing a
   * bullet's clothes. The renderer sets the term on its own line: Thai has no
   * capitalisation to mark where a term ends, and the em dash the English used
   * as a separator is not a Thai punctuation mark.
   */
  | { type: "dl"; items: readonly { term: string; desc: string }[] };

export type LegalSection<Id extends string = string> = {
  readonly id: Id;
  readonly heading: string;
  readonly blocks: readonly LegalBlock[];
};

/** One document in one locale. */
export type LegalDocument = {
  readonly title: string;
  /** The editorial label above the title ("Legal", "Community"). */
  readonly eyebrow: string;
  /** The date line under the title. */
  readonly updated: string;
  readonly sections: readonly LegalSection[];
  /**
   * The counsel disclaimer under the last section. Privacy and Terms carry
   * one; the Code of Conduct deliberately does not — do not "complete the
   * set", a disclaimer present in one document but not its siblings is an
   * asymmetry someone has to explain.
   */
  readonly footnote?: string;
};

/** Both locales of one document. */
export type LegalContent = {
  readonly en: LegalDocument;
  readonly th: LegalDocument;
};

/**
 * The per-locale shape, with `sections` pinned to the shared id tuple — same
 * ids, same order, both locales, checked at compile time.
 */
type LocaleDocument<Ids extends readonly string[]> = {
  readonly title: string;
  readonly eyebrow: string;
  readonly updated: string;
  readonly sections: { readonly [K in keyof Ids]: LegalSection<Ids[K] & string> };
  readonly footnote?: string;
};

export function defineLegalContent<const Ids extends readonly string[]>(doc: {
  /** Section ids, in order. The single source of truth for both locales. */
  readonly ids: Ids;
  readonly en: LocaleDocument<Ids>;
  readonly th: LocaleDocument<Ids>;
}): LegalContent {
  return { en: doc.en, th: doc.th };
}
