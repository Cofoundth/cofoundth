import { Download, FileText } from "lucide-react";
import { tServer } from "@/lib/i18n-server";

type Template = {
  title: string;
  description: string;
  category: string;
};

const TEMPLATES: Template[] = [
  {
    category: "Founding",
    title: "Co-founder agreement (Thai)",
    description:
      "Equity split, vesting, decision rights, IP assignment, exit clauses. Drafted for Thai jurisdiction.",
  },
  {
    category: "Founding",
    title: "Co-founder agreement (English)",
    description:
      "Same as above, English-language version for international co-founders.",
  },
  {
    category: "Hiring",
    title: "Employee offer letter",
    description:
      "Includes salary, equity grant terms, confidentiality, and non-compete language.",
  },
  {
    category: "Hiring",
    title: "Consultant / contractor agreement",
    description:
      "Scope of work, payment terms, IP assignment, confidentiality.",
  },
  {
    category: "Operations",
    title: "Non-disclosure agreement (mutual)",
    description: "Standard mutual NDA for early-stage conversations.",
  },
  {
    category: "Operations",
    title: "Privacy policy template (PDPA-compliant)",
    description:
      "Privacy policy template for Thai startups, compliant with PDPA.",
  },
  {
    category: "Fundraising",
    title: "SAFE (Singapore-style)",
    description: "Standard SAFE template adapted for SEA jurisdictions.",
  },
  {
    category: "Fundraising",
    title: "Convertible note term sheet",
    description:
      "Standard convertible note terms — interest, maturity, discount, cap.",
  },
];

const CATEGORIES = ["Founding", "Hiring", "Operations", "Fundraising"];

export default async function LegalTemplatesPage() {
  const [
    resources,
    heading,
    intro,
    importantLabel,
    disclaimer,
    comingSoon,
    downloadLabel,
  ] = await Promise.all([
    tServer("Resources"),
    tServer("Legal templates"),
    tServer(
      "Templates founders most often need at the start. Reviewed by Thai lawyers. Free for the community.",
    ),
    tServer("Important:"),
    tServer(
      "these are starting points, not legal advice. For real deals — fundraises, significant equity splits, exits — engage a lawyer.",
    ),
    tServer("Coming soon"),
    tServer("Download (coming soon)"),
  ]);

  const sections = await Promise.all(
    CATEGORIES.map(async (cat) => ({
      key: cat,
      label: await tServer(cat),
      items: await Promise.all(
        TEMPLATES.filter((t) => t.category === cat).map(async (t) => ({
          key: t.title,
          title: await tServer(t.title),
          description: await tServer(t.description),
        })),
      ),
    })),
  );

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-20">
      <div className="mb-16 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
          {resources}
        </div>
        <h1 className="text-4xl lg:text-5xl leading-tight mb-4">{heading}</h1>
        <p className="text-lg text-ink leading-relaxed">{intro}</p>
        <div className="mt-6 px-4 py-3 border border-gold/40 bg-cream text-sm text-ink leading-relaxed">
          <strong className="text-navy">{importantLabel}</strong> {disclaimer}
        </div>
      </div>

      <div className="space-y-12">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-2xl mb-6 pb-3 border-b border-line">
              {section.label}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {section.items.map((t) => (
                <div
                  key={t.key}
                  className="bg-white border border-line p-6 flex items-start gap-4"
                >
                  <FileText
                    className="w-5 h-5 text-gold shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <div className="flex-1">
                    <h3 className="font-serif text-lg text-navy mb-1.5">
                      {t.title}
                    </h3>
                    <p className="text-sm text-ink leading-relaxed mb-3">
                      {t.description}
                    </p>
                    <button
                      type="button"
                      disabled
                      className="text-sm text-ink-muted inline-flex items-center gap-1.5 cursor-not-allowed"
                      title={comingSoon}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {downloadLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
