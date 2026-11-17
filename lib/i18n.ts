// Cofoundee — i18n dictionary loader + pure t() helper. CLIENT-SAFE.
//
// Thai translations live in ./translations.json — edit copy THERE, not here.
// English is the source language: the dictionary KEY *is* the English string,
// so t() returns the key unchanged for "en" and looks up translations.json for "th".
//
// Anything that touches `next/headers` (cookies) lives in `i18n-server.ts`
// so this module doesn't drag server APIs into the client bundle.
//
// Thai voice — native, conversational, founder-to-founder (NOT translation-Thai):
//   - Write like you're chatting with a fellow Thai founder — sincere, warm, peer.
//   - Match the MEANING of the English, not its words. Rewrite freely.
//   - Use natural particles: แหละ, นะ, เลย, กัน, เดี๋ยว, ค่อยๆ, ก็.
//   - Short, punchy phrases; drop subjects (you/we/it) when natural.
//   - Avoid translation-Thai: no "ที่ที่...", no tacked-on "อย่างจริงใจ", no
//     over-literal words ("cold" ≠ "เย็นชา").
//   - Keep English loanwords founders use: founder, co-founder, startup, pitch,
//     profile, post, comment, partner, B2B, VC, angel, MVP, Markdown.
//   - Brand bylines, dates, location marks stay English.

import translations from "./translations.json";

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";
export const LOCALE_COOKIE = "locale";

export const TH: Record<string, string> = translations;

export function t(en: string, locale: Locale): string {
  if (locale === "en") return en;
  // An OWN key only. A plain `TH[en]` reads the prototype chain, so
  // t("__proto__") returned Object.prototype and t("constructor") a function,
  // and rendering either threw — member-written values (a profile's help
  // topics, its activities) go through here, so one crafted value broke that
  // profile for every Thai-locale reader. hasOwnProperty.call rather than
  // Object.hasOwn: this runs for every string on every page, and hasOwn is
  // missing before iOS Safari 15.4.
  return Object.prototype.hasOwnProperty.call(TH, en) ? TH[en] : en;
}
