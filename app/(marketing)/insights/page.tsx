import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listInsights } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const revalidate = 60;

export default async function InsightsPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const insights = await listInsights(locale);

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-20">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
          {tr("Insights")}
        </div>
        <h1 className="text-4xl lg:text-5xl leading-tight mb-4">
          {tr("Founder guides & perspectives")}
        </h1>
        <p className="text-lg text-ink leading-relaxed">
          {tr(
            "Practical writing on co-founder selection, team building, and building serious startups in Thailand.",
          )}
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center text-ink-muted">
          {tr("No insights yet — check back soon.")}
        </div>
      ) : (
        <div className="space-y-12">
          {insights.map((i) => (
            <Link
              key={i.slug}
              href={`/insights/${i.slug}`}
              className="block group pb-12 border-b border-line last:border-0"
            >
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-gold mb-2">
                    {i.category}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {i.published_at
                      ? new Date(i.published_at).toLocaleDateString(
                          locale === "th" ? "th-TH" : "en-GB",
                          { day: "numeric", month: "short", year: "numeric" },
                        )
                      : ""}
                    {" · "}
                    {i.reading_time} {tr("min read")}
                  </div>
                </div>
                <div className="lg:col-span-9">
                  <h2 className="text-3xl text-navy mb-3 leading-tight group-hover:text-gold transition-colors">
                    {i.title}
                  </h2>
                  <p className="text-ink leading-relaxed mb-4">{i.excerpt}</p>
                  <div className="text-sm text-navy inline-flex items-center gap-1.5 group-hover:text-gold transition-colors">
                    {tr("Read insight")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
