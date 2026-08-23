import { t, type Locale } from "@/lib/i18n";

// The first four pairs are carried over verbatim from the old single-column
// <dl> on app/(marketing)/page.tsx so their existing Thai translations keep
// resolving. The last two are new — both describe shipped behaviour only.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Is it really free?",
    a: "Yes. We'll earn from partners later, never from charging founders to meet.",
  },
  {
    q: "Do I need a co-founder or an idea already?",
    a: "No. Plenty of people arrive just exploring — connections come from being around.",
  },
  {
    q: "Who is Cofoundee for?",
    a: "Thai startup founders — technical, business, solo, or just starting to explore what to build.",
  },
  {
    q: "Thai or English?",
    a: "Both. The whole platform works in either.",
  },
  {
    q: "How does co-founder matching work?",
    a: "You express interest; messaging unlocks only when it's mutual. No cold DMs, no swiping.",
  },
  {
    q: "What's the company side for?",
    a: "Your profile can be a company. List what you offer and what you want, then send a partnership request.",
  },
];

export function FaqSection({ locale }: { locale: Locale }) {
  const tr = (en: string) => t(en, locale);

  return (
    <section className="py-[104px] bg-white border-t border-line">
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
        <div className="max-w-[640px] mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
            {tr("Questions")}
          </div>
          <h2 className="text-d2 lg:text-d3">
            {tr("What founders usually ask.")}
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {FAQS.map((f) => (
            <div
              key={f.q}
              className="rounded-[22px] border border-line p-7"
            >
              <h3 className="font-serif text-lg text-navy mb-2">{tr(f.q)}</h3>
              <p className="text-ink-muted leading-relaxed">{tr(f.a)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
