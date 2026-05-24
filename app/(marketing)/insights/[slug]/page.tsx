import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getInsightBySlug,
  listAllSlugsForStaticParams,
} from "@/lib/insights";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listAllSlugsForStaticParams();
  return slugs.map((slug) => ({ slug }));
}

export default async function InsightPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const insight = await getInsightBySlug(slug, locale);
  if (!insight) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
      <Link
        href="/insights"
        className="text-sm text-ink-muted hover:text-navy mb-10 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> {tr("All insights")}
      </Link>

      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
        {insight.category}
      </div>
      <h1 className="text-4xl lg:text-5xl leading-tight mb-6">
        {insight.title}
      </h1>
      <div className="text-sm text-ink-muted pb-10 mb-10 border-b border-line">
        {insight.published_at
          ? new Date(insight.published_at).toLocaleDateString(
              locale === "th" ? "th-TH" : "en-GB",
              { day: "numeric", month: "long", year: "numeric" },
            )
          : ""}
        {" · "}
        {insight.reading_time} {tr("min read")}
      </div>

      <div className="space-y-5 text-lg text-ink leading-relaxed">
        {insight.body.split("\n\n").map((para, i) => (
          <Paragraph key={i} text={para} />
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-line">
        <Link
          href="/signup"
          className="inline-block px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
        >
          {tr("Join Cofoundee · Free")}
        </Link>
      </div>
    </article>
  );
}

function Paragraph({ text }: { text: string }) {
  // Bullet list (lines starting with "- ")
  if (text.split("\n").every((l) => l.trim().startsWith("- "))) {
    const items = text.split("\n").map((l) => l.replace(/^\s*-\s+/, ""));
    return (
      <ul className="list-disc pl-6 space-y-2">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  return <p>{renderInline(text)}</p>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-navy">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
