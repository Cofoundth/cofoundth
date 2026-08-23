import type { Metadata } from "next";
import { Mail, MessageSquare, Scale } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Contact — Cofoundee",
  description: "How to reach the people building Cofoundee.",
};

// A contact PAGE rather than the bare mailto: the footer used to carry. Same
// address, but it can say who answers and how long it takes — and it gives the
// footer, the code of conduct and the privacy policy one place to point at.
//
// No contact FORM on purpose: a form needs spam handling, a delivery path and
// somewhere for the message to land, and with two people answering, mail is
// both more honest and more reliable than a box that might silently fail.
const EMAIL = "chayanonr@cofoundee.co";

const REASONS = [
  {
    Icon: MessageSquare,
    title: "Something's broken, or you have an idea",
    body: "Bugs, feedback, or a feature you wish existed. This is the one we most want to hear.",
  },
  {
    Icon: Scale,
    title: "Partnerships",
    body: "Law firms, accountants, investors, and communities who want to work with us as we build the next phase.",
  },
  {
    Icon: Mail,
    title: "Press and everything else",
    body: "Writing about Thai startups, or anything that doesn't fit the two above.",
  },
];

export default async function ContactPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  return (
    <>
      <section className="py-[104px] bg-cream border-b border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px]">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("Contact")}
            </p>
            <h1 className="text-d2 lg:text-d3 mb-6">
              {tr("Talk to us.")}
            </h1>
            <p className="text-lg text-ink-muted leading-relaxed mb-8">
              {tr(
                "Two of us read everything that comes in. Write in Thai or English — whichever is easier.",
              )}
            </p>
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-4 text-sm tracking-wide text-white transition-colors hover:bg-navy-dark"
            >
              <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              {EMAIL}
            </a>
          </div>
        </div>
      </section>

      <section className="py-[104px] bg-white">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px] mb-12">
            <h2 className="text-d2 lg:text-d3">
              {tr("What people usually write about.")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[22px] border border-line bg-white p-8"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream">
                  <Icon
                    className="h-6 w-6 text-navy"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-xl mb-2">{tr(title)}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {tr(body)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
