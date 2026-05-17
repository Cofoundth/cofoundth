import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INSIGHTS } from "@/lib/insights";

export default function InsightsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-20">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
          Insights
        </div>
        <h1 className="text-4xl lg:text-5xl leading-tight mb-4">
          Founder guides &amp; perspectives
        </h1>
        <p className="text-lg text-ink leading-relaxed">
          Practical writing on co-founder selection, team building, and
          building serious startups in Thailand.
        </p>
      </div>

      <div className="space-y-12">
        {INSIGHTS.map((i) => (
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
                  {new Date(i.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {i.readingTime} min read
                </div>
              </div>
              <div className="lg:col-span-9">
                <h2 className="font-serif text-3xl text-navy mb-3 leading-tight group-hover:text-gold transition-colors">
                  {i.title}
                </h2>
                <p className="text-ink leading-relaxed mb-4">{i.excerpt}</p>
                <div className="text-sm text-navy inline-flex items-center gap-1.5 group-hover:text-gold transition-colors">
                  Read insight <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
