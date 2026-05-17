import Link from "next/link";
import { getLocale, t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const navLinks = [
  { href: "/insights", label: "Insights" },
  { href: "/legal-templates", label: "Legal" },
  { href: "/events", label: "Events" },
];

export async function MarketingNav() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  return (
    <nav className="bg-white border-b border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy flex items-center justify-center">
              <span className="text-white text-lg font-serif font-bold tracking-tight">
                C
              </span>
            </div>
            <div className="text-left">
              <div className="text-navy font-serif text-xl tracking-tight leading-none">
                Cofoundee
              </div>
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
