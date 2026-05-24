// Server-only i18n helpers. Anything that touches `next/headers` lives here
// so it doesn't get pulled into the client bundle (which would explode).

import { cookies } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, TH } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}

export async function tServer(en: string): Promise<string> {
  const locale = await getLocale();
  if (locale === "en") return en;
  return TH[en] ?? en;
}
