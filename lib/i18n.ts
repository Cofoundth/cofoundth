// Cofoundee — i18n dictionary loader + pure t() helper. CLIENT-SAFE.
//
// Thai translations live in ./th.json — edit copy THERE, not here.
// English is the source language: the dictionary KEY *is* the English string,
// so t() returns the key unchanged for "en" and looks up th.json for "th".
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

import thMessages from "./th.json";

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const TH: Record<string, string> = thMessages;

export function t(en: string, locale: Locale): string {
  if (locale === "en") return en;
  return TH[en] ?? en;
}
