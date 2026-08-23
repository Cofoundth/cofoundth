import { Building2, Code2, Compass, Lightbulb } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

const personas = [
  {
    Icon: Code2,
    title: "You can build",
    body: "You build. You need someone to own business and growth.",
  },
  {
    Icon: Lightbulb,
    title: "You have the vision",
    body: "You have the idea and the market. You need someone to build it.",
  },
  {
    Icon: Compass,
    title: "You're exploring",
    body: "Not sure what to build yet. You want to be around founders who are.",
  },
  {
    Icon: Building2,
    title: "You're already a company",
    body: "Past the co-founder stage. Here for partners and distribution.",
  },
];

export function ForFoundersSection({ locale }: { locale: Locale }) {
  const tr = (en: string) => t(en, locale);

  return (
    <section className="py-[104px] bg-white border-y border-line">
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
        <div className="max-w-[640px] mb-14">
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
            {tr("Who it's for")}
          </div>
          <h2 className="text-d2 lg:text-d3">
            {tr("If you're building something in Thailand, you belong here.")}
          </h2>
        </div>

        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {personas.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[22px] border border-line p-8 bg-white"
            >
              <div className="w-14 h-14 rounded-2xl bg-cream flex items-center justify-center mb-5">
                <Icon
                  className="w-6 h-6 text-navy"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-serif text-xl mb-2">{tr(title)}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                {tr(body)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
