import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInsightBySlug } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

// Rendered per request, deliberately.
//
// The page picks its language from the reader's locale cookie, so one URL has
// two bodies and can never be a single static page. Next cannot prerender it at
// all: reading a cookie inside a static render throws DYNAMIC_SERVER_USAGE.
//
// With `generateStaticParams` + `revalidate` this returned 500 for every article
// published AFTER a deploy — the slug was not in the build's params, so the
// on-demand render was a static one, and it threw. It looked fine in testing
// only because rebuilding baked the new slug in. Do not re-add ISR here.

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const insight = await getInsightBySlug(slug, locale);
  if (!insight) return { title: "Insight not found" };

  return {
    title: insight.title,
    description: insight.excerpt,
    openGraph: {
      type: "article",
      title: insight.title,
      description: insight.excerpt,
      publishedTime: insight.published_at ?? undefined,
      url: `/insights/${insight.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: insight.title,
      description: insight.excerpt,
    },
    alternates: { canonical: `/insights/${insight.slug}` },
  };
}

export default async function InsightPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const insight = await getInsightBySlug(slug, locale);
  if (!insight) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-[88px]">
      <Link
        href="/insights"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> {tr("All insights")}
      </Link>

      <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
        {insight.category}
      </div>
      <h1 className="text-d2 lg:text-d3 mb-4">
        {insight.title}
      </h1>
      <div className="text-sm text-ink-muted pb-8 mb-8 border-b border-line">
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
          className="inline-block px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors rounded-full"
        >
          {tr("Join Cofoundee · Free")}
        </Link>
      </div>
    </article>
  );
}

function Paragraph({ text }: { text: string }) {
  const lines = text.split("\n");

  // Section heading. The editor tells authors "Markdown supported", so a "## "
  // line has to become a heading — otherwise it ships as literal hashes. Sizes
  // come off the display ladder; weight, colour and tracking are already set on
  // h1-h6 in @layer base, so they are deliberately not repeated here.
  const heading = lines[0].match(/^(#{2,3})\s+(.+)$/);
  if (heading) {
    // A heading authored without the blank line under it still renders right.
    const rest = lines.slice(1).join("\n").trim();
    const body = rest ? <p>{renderInline(rest)}</p> : null;
    return heading[1].length === 2 ? (
      <>
        <h2 className="text-d1 pt-3">{renderInline(heading[2])}</h2>
        {body}
      </>
    ) : (
      <>
        <h3 className="text-xl pt-1">{renderInline(heading[2])}</h3>
        {body}
      </>
    );
  }

  // Bullet list (lines starting with "- ")
  if (lines.every((l) => l.trim().startsWith("- "))) {
    const items = lines.map((l) => l.replace(/^\s*-\s+/, ""));
    return (
      <ul className="list-disc pl-6 space-y-2">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  // Numbered list (lines starting with "1. ", "2. ", ...)
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    const items = lines.map((l) => l.replace(/^\s*\d+\.\s+/, ""));
    return (
      <ol className="list-decimal pl-6 space-y-2">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ol>
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
