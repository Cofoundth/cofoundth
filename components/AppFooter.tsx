import Link from "next/link";
import { tServer } from "@/lib/i18n-server";
import { InstagramIcon, LinkedInIcon } from "@/components/SocialIcons";

// Update these to the live handles when the accounts are created.
const INSTAGRAM_URL = "https://www.instagram.com/cofoundee.th";
const LINKEDIN_URL = "https://www.linkedin.com/company/cofoundee";

// The legal trio, same hrefs and same translation keys as the "Legal" column in
// components/marketing/MarketingFooter.tsx. They live here too because the app
// shell is now the ONLY footer a signed-in member ever sees — on app routes AND
// on marketing routes (app/(marketing)/layout.tsx hands them AppShell). Before
// this, signing in removed every path to the privacy policy, on a product that
// is PDPA-facing.
const LEGAL = [
  { label: "Privacy (PDPA)", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Code of Conduct", href: "/code-of-conduct" },
];

export async function AppFooter() {
  const legal = await Promise.all(
    LEGAL.map(async (item) => ({ ...item, label: await tServer(item.label) })),
  );

  return (
    <footer className="border-t border-line bg-cream">
      {/* Column on a phone, one row from sm up. The links wrap on their own
          (gap-y-2) rather than squeezing: the Thai labels are long
          ("ความเป็นส่วนตัว (PDPA)") and must not be compressed below 12px. */}
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-ink-muted order-3 sm:order-1">
          &copy; 2026 Cofoundee
        </span>
        <div className="order-1 sm:order-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {legal.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-ink-muted hover:text-navy transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="order-2 sm:order-3 flex items-center gap-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-ink-muted hover:text-navy transition-colors"
          >
            <InstagramIcon />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-ink-muted hover:text-navy transition-colors"
          >
            <LinkedInIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}
