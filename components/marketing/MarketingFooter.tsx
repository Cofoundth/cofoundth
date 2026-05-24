import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { Wordmark } from "@/components/Brand";

const columns = [
  {
    title: "Platform",
    items: [
      { label: "Sign in", href: "/login" },
      { label: "Create profile", href: "/signup" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Insights", href: "/insights" },
      { label: "Legal templates", href: "/legal-templates" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy (PDPA)", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Code of Conduct", href: "/code-of-conduct" },
    ],
  },
  {
    title: "Company",
    items: [{ label: "Contact", href: "mailto:chayanonr@cofoundee.co" }],
  },
];

export async function MarketingFooter() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="mb-4">
              <Wordmark variant="light" className="text-2xl" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {tr(
                "The platform for Thailand’s founders to find their co-founder.",
              )}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">
                {tr(col.title)}
              </div>
              <ul className="space-y-2.5">
                {col.items.map((item) => {
                  const isExternal = item.href.startsWith("mailto:");
                  return (
                    <li key={item.label}>
                      {isExternal ? (
                        <a
                          href={item.href}
                          className="text-sm text-slate-200 hover:text-white"
                        >
                          {tr(item.label)}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="text-sm text-slate-200 hover:text-white"
                        >
                          {tr(item.label)}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-400">
          <div>&copy; 2026 Cofoundee Co., Ltd. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">
              {tr("Privacy (PDPA)")}
            </Link>
            <Link href="/terms" className="hover:text-white">
              {tr("Terms")}
            </Link>
            <Link href="/code-of-conduct" className="hover:text-white">
              {tr("Code of Conduct")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
