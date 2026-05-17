import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Cofoundee",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
      <Link
        href="/"
        className="text-sm text-ink-muted hover:text-navy mb-10 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
        Legal &middot; PDPA compliant
      </div>
      <h1 className="text-4xl lg:text-5xl leading-tight mb-4">
        Privacy Policy
      </h1>
      <p className="text-sm text-ink-muted pb-10 mb-10 border-b border-line">
        Last updated: May 2026 &middot; Effective immediately
      </p>

      <div className="space-y-8 text-ink leading-relaxed">
        <Section title="Overview">
          <p>
            Cofoundee Co., Ltd. (&ldquo;we&rdquo;, &ldquo;our&rdquo;) operates
            cofoundee.co (the &ldquo;Service&rdquo;). This Privacy Policy
            describes what personal data we collect, how we use it, and the
            rights you have under Thailand&rsquo;s Personal Data Protection Act
            B.E. 2562 (&ldquo;PDPA&rdquo;).
          </p>
        </Section>

        <Section title="Data we collect">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-navy">Account data</strong> &mdash; full
              name, email address, password (hashed), photo, LinkedIn URL.
            </li>
            <li>
              <strong className="text-navy">Profile data</strong> &mdash; role,
              intent, skills, industries, stage, commitment level, financial
              runway, founder experience, pitch text, location.
            </li>
            <li>
              <strong className="text-navy">Activity data</strong> &mdash;
              interests expressed, matches formed, messages sent, profile views,
              forum posts, reports submitted.
            </li>
            <li>
              <strong className="text-navy">Technical data</strong> &mdash; IP
              address, browser type, device type, session timestamps. Used for
              security and abuse prevention.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc pl-5 space-y-2">
            <li>To run the matching service (filter, score, surface profiles)</li>
            <li>To send transactional emails (sign-in, match alerts, messages)</li>
            <li>To prevent abuse and respond to reports</li>
            <li>To improve the platform via aggregated, anonymized analytics</li>
          </ul>
          <p>
            We do not sell your data to third parties. We do not use it for
            advertising.
          </p>
        </Section>

        <Section title="Who can see your data">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-navy">Other authenticated users</strong>{" "}
              can see your profile (name, role, pitch, etc.) when they browse
              the directory. They cannot see your email unless you have a mutual
              match.
            </li>
            <li>
              <strong className="text-navy">Cofoundee staff</strong> can access
              data for support, abuse review, and infrastructure operations.
            </li>
            <li>
              <strong className="text-navy">Service providers</strong> we use
              (Supabase, Vercel, Resend, Google) process data under their own
              privacy policies. We choose vendors with PDPA-compatible
              practices.
            </li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>
            Active accounts: indefinitely while your account exists. Deleted
            accounts: removed within 30 days, except where retention is required
            for legal or regulatory reasons.
          </p>
        </Section>

        <Section title="Your rights under PDPA">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Request deletion of your data</li>
            <li>Object to certain types of processing</li>
            <li>Withdraw consent (where processing is consent-based)</li>
            <li>Data portability (export your data in a usable format)</li>
            <li>
              File a complaint with Thailand&rsquo;s Personal Data Protection
              Committee (PDPC)
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a
              href="mailto:chayanonr@cofoundee.co"
              className="text-navy hover:text-gold"
            >
              chayanonr@cofoundee.co
            </a>
            . We respond within 30 days.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use essential cookies for authentication, session management, and
            remembering your language preference. We don&rsquo;t use third-party
            tracking or advertising cookies.
          </p>
        </Section>

        <Section title="Data security">
          <p>
            All data is encrypted in transit (TLS 1.3) and at rest. Passwords
            are hashed with bcrypt. Production access is restricted to a small
            engineering team with audit logging. In the event of a data breach
            affecting your data, we will notify you and the PDPC within 72
            hours where required.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Cofoundee Co., Ltd.
            <br />
            Bangkok, Thailand
            <br />
            <a
              href="mailto:chayanonr@cofoundee.co"
              className="text-navy hover:text-gold"
            >
              chayanonr@cofoundee.co
            </a>
          </p>
        </Section>

        <div className="text-xs text-ink-muted pt-8 border-t border-line">
          This policy will be reviewed and refined by qualified legal counsel
          before public launch. Translations are provided for convenience; the
          Thai-language version will be authoritative once finalized.
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
