import { t, type Locale } from "@/lib/i18n";

// The first four pairs are carried over verbatim from the old single-column
// <dl> on app/(marketing)/page.tsx so their existing Thai translations keep
// resolving. The last two are new — both describe shipped behaviour only.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Is it really free?",
    a: "Yes — free for founders, and it stays that way in this phase. We'll earn from partners and services later, never from charging founders to meet each other.",
  },
  {
    q: "Do I need a co-founder or an idea already?",
    a: "No. Come for the community first. Plenty of people arrive just exploring — the connections come from being around, not from having everything figured out.",
  },
  {
    q: "Who is Cofoundee for?",
    a: "Thai startup founders — technical, business, solo, or just starting to explore what to build.",
  },
  {
    q: "Thai or English?",
    a: "Both — use whichever you're comfortable with. The whole platform works in Thai and English.",
  },
  {
    q: "How does co-founder matching work?",
    a: "You browse the founder directory and express interest in the people you'd want to build with. Messaging only unlocks when the interest is mutual — no cold DMs, no swiping, no one gets pitched by a stranger.",
  },
  {
    q: "What's the company side for?",
    a: "Your profile can be a company instead of a person. You list what your company can do and what you want from a partner, then send a partnership request — vendors, integrations, distribution, co-marketing. They reply, messaging opens. That side has no mutual-interest gate.",
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
