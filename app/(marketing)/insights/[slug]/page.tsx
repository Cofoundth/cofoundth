import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { INSIGHTS, getInsightBySlug } from "@/lib/insights";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return INSIGHTS.map((i) => ({ slug: i.slug }));
}

export default async function InsightPage({ params }: Props) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);
  if (!insight) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
      <Link
        href="/insights"
        className="text-sm text-ink-muted hover:text-navy mb-10 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> All insights
      </Link>

      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
        {insight.category}
      </div>
      <h1 className="text-4xl lg:text-5xl leading-tight mb-6">
        {insight.title}
      </h1>
      <div className="text-sm text-ink-muted pb-10 mb-10 border-b border-line">
        {new Date(insight.publishedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        {" · "}
        {insight.readingTime} min read
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
          Join Cofoundee &middot; Free
        </Link>
      </div>
    </article>
  );
}

function Paragraph({ text }: { text: string }) {
  // Very small markdown shim: bold via **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-navy">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
