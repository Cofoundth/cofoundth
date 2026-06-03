import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getUser } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import { AppHeader } from "@/components/AppHeader";

// Logged-in visitors get the exact app navbar (so public content like
// /insights and /legal-templates feels in-app); logged-out visitors get the
// minimal landing nav focused on signup.
export async function MarketingNav() {
  const user = await getUser();
  if (user) {
    return <AppHeader />;
  }

  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  return (
    <nav className="bg-white border-b border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="md" />
            <div className="text-left">
              <Wordmark />
              <div className="text-[10px] text-ink-muted uppercase tracking-[0.2em] mt-1">
                {tr("Est. 2026 · Bangkok")}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm text-ink hover:text-navy tracking-wide"
            >
              {tr("Sign in")}
            </Link>
            <Link
              href="/signup"
              className="px-4 sm:px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors whitespace-nowrap"
            >
              {tr("Join Cofoundee")}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
