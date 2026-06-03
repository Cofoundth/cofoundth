import { Instagram, Linkedin } from "lucide-react";

// Update these to the live handles when the accounts are created.
const INSTAGRAM_URL = "https://www.instagram.com/cofoundee.th";
const LINKEDIN_URL = "https://www.linkedin.com/company/cofoundee";

export function AppFooter() {
  return (
    <footer className="border-t border-line bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between gap-4">
        <span className="text-xs text-ink-muted">
          &copy; 2026 Cofoundee
        </span>
        <div className="flex items-center gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-ink-muted hover:text-navy transition-colors"
          >
            <Instagram className="w-5 h-5" strokeWidth={1.5} />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-ink-muted hover:text-navy transition-colors"
          >
            <Linkedin className="w-5 h-5" strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </footer>
  );
}
