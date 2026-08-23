import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { QuoteBand } from "@/components/marketing/landing/QuoteBand";
import { LandingCta } from "@/components/marketing/landing/LandingCta";
import { countPublicFounders } from "@/lib/public-profile";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About — Cofoundee",
  description:
    "Why Cofoundee exists, who is building it, and what we are honestly trying to do for Thai founders.",
};

// Mirrors Onfound's /about shape — eyebrow "OUR STORY" → a one-line thesis →
// the founder speaking in the first person → team → CTA.
//
// Everything here is drawn from material that already exists: the founder's
// note carries the SAME English strings the landing band uses, so its Thai
// still resolves and the two pages cannot drift apart. Nothing about the team
// or the timeline is invented — where we have not built something yet, this
// page says so rather than describing it in the present tense.
const TEAM = [
  {
    name: "Ratthamontree Burimas",
    role: "Co-founder · CEO",
    focus: "Community and content",
  },
  {
    name: "Chayanon Rodjanawon",
    role: "Co-founder · CTO",
    focus: "Product and engineering",
  },
];

export default async function AboutPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  // The public allowlist, not a raw profiles count — see countPublicFounders.
  const totalFounders = await countPublicFounders();

  return (
    <>
      <section className="py-[104px] bg-cream border-b border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px]">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("Our story")}
            </p>
            <h1 className="text-d2 lg:text-d3 mb-6">
              {tr("We're building the room we wanted to walk into.")}
            </h1>
            <p className="text-lg text-ink-muted leading-relaxed">
              {tr(
                "Cofoundee is a community for Thai founders first. Everything else — partners, advisors, capital — is meant to grow on top of that, in that order.",
              )}
            </p>
          </div>
        </div>
      </section>

      <QuoteBand locale={locale} />

      <section className="py-[104px] bg-white border-b border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px] mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("Who's building it")}
            </p>
            <h2 className="text-d2 lg:text-d3">{tr("Two of us, so far.")}</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="rounded-[22px] border border-line bg-white p-8"
              >
                <h3 className="text-xl mb-1">{m.name}</h3>
                <p className="text-sm text-gold-ink mb-3">{tr(m.role)}</p>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {tr(m.focus)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[104px] bg-white border-b border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px] mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("Where we are")}
            </p>
            <h2 className="text-d2 lg:text-d3 mb-6">
              {tr("Early, and honest about it.")}
            </h2>
            <p className="text-lg text-ink-muted leading-relaxed">
              {tr(
                "The community and the company side are live. Advisors and investor intros are not built yet — we'd rather say that than describe them as if they were.",
              )}
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[22px] border border-line p-6">
              <dt className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-2">
                {tr("Founders here")}
              </dt>
              <dd className="text-d1">{totalFounders}</dd>
            </div>
            <div className="rounded-[22px] border border-line p-6">
              <dt className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-2">
                {tr("Price")}
              </dt>
              <dd className="text-d1">{tr("Free")}</dd>
            </div>
            <div className="rounded-[22px] border border-line p-6">
              <dt className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-2">
                {tr("Languages")}
              </dt>
              <dd className="text-d1">{tr("Thai · English")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <LandingCta locale={locale} founderCount={totalFounders} />
    </>
  );
}
