import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { listInsights } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { EmptyState, LinkButton } from "@/components/ui";

export const revalidate = 60;

// Layout borrowed from onfound's content grid (measured from their live DOM):
// a NARROW intro block (640px) sitting above a WIDE card grid (1120px), 88px
// section rhythm, ~328px cards with a 16px gutter, and each card stacked
// meta-row → title → excerpt → footer-row.
// The skin is the Onfound system: warm sand ground, Rethink Sans, rounded cards.
export default async function InsightsPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const insights = await listInsights(locale);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]">
      {/* Narrow intro over a wide grid — their editorial rhythm. */}
      <div className="max-w-[640px] mb-8">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
          {tr("Insights")}
        </div>
        <h1 className="text-d2 lg:text-d3 mb-4">
          {tr("Founder guides & perspectives")}
        </h1>
        <p className="text-lg text-ink leading-relaxed">
          {tr(
            "Practical writing on co-founder selection, team building, and building serious startups in Thailand.",
          )}
        </p>
      </div>

      {insights.length === 0 ? (
        // Nothing published yet — and a visitor cannot write one either, since
        // insights are admin-authored (/admin/insights). So there is no "be the
        // first" ask to make here; the CTA sends them to the liveliest thing we
        // actually have, which is the founder directory.
        <EmptyState
          icon={BookOpen}
          title={tr("No insights published yet")}
          description={tr(
            "Guides and perspectives on building in Thailand will land here. Until then, the most useful thing on Cofoundee is the people.",
          )}
          action={
            <LinkButton href="/founders" size="lg">
              {tr("Browse founders")}
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((i) => (
            <Link
              key={i.slug}
              href={`/insights/${i.slug}`}
              className="group flex flex-col bg-white border border-line p-6 hover:border-navy transition-colors rounded-xl"
            >
              {/* meta row */}
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] mb-4">
                <span className="text-gold-ink">{i.category}</span>
                <span className="text-ink-muted/70" aria-hidden="true">
                  ·
                </span>
                <span className="text-ink-muted normal-case tracking-normal text-xs">
                  {fmtDate(i.published_at)}
                </span>
              </div>

              {/* title */}
              <h2 className="text-xl leading-snug mb-3 group-hover:text-gold-ink transition-colors">
                {i.title}
              </h2>

              {/* excerpt — clamped so every card in a row squares off */}
              <p className="text-sm text-ink leading-relaxed line-clamp-3 mb-6">
                {i.excerpt}
              </p>

              {/* footer row, pinned to the card bottom */}
              <div className="mt-auto pt-5 flex items-center justify-between border-t border-line">
                <span className="text-xs text-ink-muted">
                  {i.reading_time} {tr("min read")}
                </span>
                <span className="text-sm text-navy inline-flex items-center gap-1.5 group-hover:text-gold-ink transition-colors">
                  {tr("Read insight")}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
