// Server-only i18n helpers. Anything that touches `next/headers` lives here
// so it doesn't get pulled into the client bundle (which would explode).

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, TH } from "./i18n";

// Resolution order:
//   1. the `locale` cookie — this device's most recent explicit toggle
//   2. the logged-in user's saved profiles.locale — so a language preference
//      follows the account onto a new device/browser
//   3. DEFAULT_LOCALE
// Wrapped in React cache() so the (cookie-miss only) profile lookup runs at
// most once per request even though getLocale()/tServer() are called many
// times during a single render.
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  if (LOCALES.includes(raw as Locale)) return raw as Locale;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("locale")
        .eq("id", user.id)
        .single();
      if (LOCALES.includes(data?.locale as Locale)) {
        return data!.locale as Locale;
      }
    }
  } catch {
    // ignore — fall back to default
  }
  return DEFAULT_LOCALE;
});

export async function tServer(en: string): Promise<string> {
  const locale = await getLocale();
  if (locale === "en") return en;
  return TH[en] ?? en;
}
