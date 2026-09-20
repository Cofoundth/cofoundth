import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";

// The logged-out bar only. A signed-in visitor never reaches this: the
// marketing layout hands them the app shell (components/AppShell.tsx) instead.
export async function MarketingNav() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  return (
    <nav className="bg-white border-b border-line">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-2 h-16 sm:h-20">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandMark size="md" />
            <div className="hidden sm:block text-left min-w-0">
              <Wordmark />
              <div className="text-xs text-ink-muted uppercase tracking-[0.2em] mt-1">
                {tr("Est. 2026 · Bangkok")}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm text-ink hover:text-navy tracking-wide whitespace-nowrap"
            >
              {tr("Sign in")}
            </Link>
            <Link
              href="/signup"
              className="px-3 sm:px-5 py-2 sm:py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors whitespace-nowrap rounded-full"
            >
              {tr("Join Cofoundee")}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
