import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Cofoundee",
};

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
      <Link
        href="/"
        className="text-sm text-ink-muted hover:text-navy mb-10 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
        Legal
      </div>
      <h1 className="text-4xl lg:text-5xl leading-tight mb-4">
        Terms of Service
      </h1>
      <p className="text-sm text-ink-muted pb-10 mb-10 border-b border-line">
        Last updated: May 2026 &middot; Effective immediately
      </p>

      <div className="space-y-8 text-ink leading-relaxed">
        <Section title="1. Acceptance">
          <p>
            By accessing or using Cofoundee (the &ldquo;Service&rdquo;, operated
            by Cofoundee Co., Ltd.), you agree to these Terms of Service. If
            you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. The Service">
          <p>
            Cofoundee is a platform that connects entrepreneurs with prospective
            co-founders based on complementary skills, intent, and industry.
            The Service facilitates introductions; it does not employ, manage,
            or vouch for any user.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must be at least 18 years old to use the Service. You must
            provide accurate information about yourself, your skills, and your
            ventures. Impersonation, fake profiles, and misrepresentation
            (including fake credentials or experience) are grounds for
            immediate termination.
          </p>
        </Section>

        <Section title="4. Your account">
          <p>You are responsible for:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          <p>You may not:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Harass, threaten, defraud, or solicit money from other users
              under false pretenses
            </li>
            <li>
              Use the Service to recruit for unrelated services, MLMs, or
              schemes
            </li>
            <li>Spam, scrape, or mass-message other users</li>
            <li>Post content that is illegal, hateful, sexually explicit, or violates IP rights</li>
            <li>Circumvent rate limits, abuse the Express Interest flow, or attempt to reverse-engineer matching</li>
            <li>Reuse the Service to power competing platforms</li>
          </ul>
          <p>
            Violations may result in immediate suspension and, where serious,
            permanent ban and disclosure to law enforcement.
          </p>
        </Section>

        <Section title="6. Content you provide">
          <p>
            You retain ownership of the content you post (profile, pitch,
            messages, forum posts). By posting, you grant Cofoundee a
            non-exclusive, worldwide license to display, store, and process
            that content as required to operate the Service.
          </p>
          <p>
            We may remove content that violates these Terms or our{" "}
            <Link
              href="/code-of-conduct"
              className="text-navy hover:text-gold"
            >
              Code of Conduct
            </Link>
            .
          </p>
        </Section>

        <Section title="7. Free service, no payment in Phase 1">
          <p>
            Phase 1 of the Service is provided free of charge. Paid features
            may be introduced in future phases with at least 30 days&rsquo;
            notice and a clear separation between free and paid functionality.
          </p>
        </Section>

        <Section title="8. Connections, deals, and outcomes">
          <p>
            <strong className="text-navy">Cofoundee is not a party to any deal between users.</strong>{" "}
            We do not vouch for, guarantee, or assume responsibility for any
            co-founder relationship, partnership, equity arrangement, or
            investment that may result from connections made through the
            Service. Conduct your own due diligence. Engage qualified legal
            counsel before signing co-founder agreements.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You may delete your account at any time from your profile settings.
            We may suspend or terminate accounts that violate these Terms, our
            Code of Conduct, or applicable law. On termination, your data is
            handled per the{" "}
            <Link href="/privacy" className="text-navy hover:text-gold">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            The Service is provided &ldquo;as is&rdquo; without warranties of
            any kind. We do not warrant that the Service will be uninterrupted,
            error-free, or that any matches will result in successful
            partnerships.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            To the maximum extent permitted by Thai law, Cofoundee&rsquo;s
            total liability arising from your use of the Service is limited to
            the amount you have paid us in the past 12 months (which, in Phase
            1, is zero).
          </p>
        </Section>

        <Section title="12. Governing law">
          <p>
            These Terms are governed by the laws of Thailand. Any disputes will
            be resolved in the courts of Bangkok.
          </p>
        </Section>

        <Section title="13. Changes to these Terms">
          <p>
            We may update these Terms from time to time. Material changes will
            be announced at least 14 days in advance via email and a banner on
            the Service. Continued use after the effective date constitutes
            acceptance.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            <a
              href="mailto:chayanonr@cofoundee.co"
              className="text-navy hover:text-gold"
            >
              chayanonr@cofoundee.co
            </a>
          </p>
        </Section>

        <div className="text-xs text-ink-muted pt-8 border-t border-line">
          This document is a starting point and will be reviewed by qualified
          Thai legal counsel before public launch.
        </div>
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
