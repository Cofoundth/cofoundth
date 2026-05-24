"use client";

// Client-side locale context. The locale comes from the cookie read once
// at the root server layout and is injected via <LocaleProvider>. Client
// components consume it via useLocale() / useT().

import { createContext, useContext, useMemo } from "react";
import { type Locale, DEFAULT_LOCALE, t } from "./i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// Convenience: returns a memoized `tr(en)` function bound to the current
// locale. Use inside client components instead of importing `t` directly.
export function useT() {
  const locale = useLocale();
  return useMemo(() => (en: string) => t(en, locale), [locale]);
}
