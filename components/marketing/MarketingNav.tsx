import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";

const navLinks = [
  { href: "/browse", label: "Community" },
  { href: "/insights", label: "Insights" },
  { href: "/events", label: "Events" },
  { href: "/legal-templates", label: "Legal" },
];

export async function MarketingNav() {
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

          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-ink hover:text-navy tracking-wide"
              >
                {tr(link.label)}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm text-ink hover:text-navy tracking-wide"
            >
              {tr("Sign in")}
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
            >
              {tr("Join Cofoundee")}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
