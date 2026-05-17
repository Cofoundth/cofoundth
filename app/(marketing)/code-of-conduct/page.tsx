import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Code of Conduct — Cofoundee",
};

export default function CodeOfConductPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
      <Link
        href="/"
        className="text-sm text-ink-muted hover:text-navy mb-10 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
        Community
      </div>
      <h1 className="text-4xl lg:text-5xl leading-tight mb-4">
        Code of Conduct
      </h1>
      <p className="text-sm text-ink-muted pb-10 mb-10 border-b border-line">
        Last updated: May 2026
      </p>

      <div className="space-y-8 text-ink leading-relaxed">
        <Section title="Our mission">
          <p>
            Cofoundee exists to help serious founders find serious co-founders.
            Choosing a co-founder is one of the highest-stakes decisions an
            entrepreneur makes &mdash; closer to choosing a business marriage
            than picking a service provider. This Code of Conduct exists to
            protect that.
          </p>
        </Section>

        <Section title="What we expect">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-navy">Honesty.</strong> Present yourself
              accurately. Real skills, real experience, real intent. No padded
              resumes, no fabricated traction.
            </li>
            <li>
              <strong className="text-navy">Respect.</strong> Treat every
              founder with professionalism, regardless of whether you&rsquo;re
              interested in working with them. Decline gracefully when needed.
            </li>
            <li>
              <strong className="text-navy">Intent.</strong> Use the Service
              for its purpose: finding a co-founder. Not for hiring, not for
              networking-only, not for selling.
            </li>
            <li>
              <strong className="text-navy">Confidentiality.</strong> What is
              shared in private messages &mdash; ideas, traction numbers,
              personal context &mdash; stays private. Don&rsquo;t screenshot
              and share without consent.
            </li>
            <li>
              <strong className="text-navy">Inclusion.</strong> Thai founders
              come from all walks. Welcome diversity of background, identity,
              experience level, and industry.
            </li>
          </ul>
        </Section>

        <Section title="What we don't tolerate">
          <ul className="list-disc pl-5 space-y-2">
            <li>Harassment, intimidation, hate speech, or discrimination of any kind</li>
            <li>Sexual content, advances, or solicitation</li>
            <li>Misrepresentation: fake credentials, fake traction, identity fraud</li>
            <li>Spamming, mass-messaging, or bulk-soliciting</li>
            <li>Using the platform to pitch unrelated investments, MLMs, or schemes</li>
            <li>Doxxing, threats, or sharing personal information without consent</li>
            <li>Bypassing the matching flow to off-platform funnels (e.g., LINE OA spam)</li>
            <li>Recruiting employees, freelancers, or service providers under the guise of co-founder matching</li>
          </ul>
        </Section>

        <Section title="Reporting">
          <p>
            If a user violates this Code of Conduct, use the{" "}
            <strong className="text-navy">Report profile</strong> button on
            their profile. Reports are reviewed by Cofoundee staff. Include as
            much detail as possible &mdash; screenshots, message references,
            specific behavior.
          </p>
          <p>
            For urgent issues (threats, ongoing harassment), email{" "}
            <a
              href="mailto:chayanonr@cofoundee.co"
              className="text-navy hover:text-gold"
            >
              chayanonr@cofoundee.co
            </a>{" "}
            directly. We respond within 24 hours.
          </p>
        </Section>

        <Section title="Enforcement">
          <p>
            We take all reports seriously. Depending on severity, actions
            include:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Private warning + behavior correction request</li>
            <li>Temporary suspension (24 hours to 30 days)</li>
            <li>Permanent ban with all data deleted</li>
            <li>
              In cases of fraud, threats, or criminal behavior: disclosure to
              law enforcement
            </li>
          </ul>
          <p>
            We do not publicly name individual users in enforcement actions.
            Patterns across multiple reports may lead to escalation.
          </p>
        </Section>

        <Section title="Reputation matters">
          <p>
            Thailand&rsquo;s startup ecosystem is small. How you treat people on
            Cofoundee will follow you outside it. Behave accordingly &mdash;
            not because we say so, but because reputation compounds.
          </p>
        </Section>

        <Section title="Acknowledgement">
          <p>
            By using Cofoundee, you agree to abide by this Code of Conduct.
            Read alongside the{" "}
            <Link href="/terms" className="text-navy hover:text-gold">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-navy hover:text-gold">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl mb-3">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}
