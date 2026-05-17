import Link from "next/link";

const navLinks = [
  { href: "/insights", label: "Insights" },
  { href: "/legal-templates", label: "Legal" },
  { href: "/events", label: "Events" },
];

export function MarketingNav() {
  return (
    <nav className="bg-white border-b border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy flex items-center justify-center">
              <span className="text-white text-lg font-serif font-bold tracking-tight">
                C
              </span>
            </div>
            <div className="text-left">
              <div className="text-navy font-serif text-xl tracking-tight leading-none">
                CoFound.th
              </div>
              <div className="text-[10px] text-ink-muted uppercase tracking-[0.2em] mt-1">
                Est. 2026 &middot; Bangkok
              </div>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-ink hover:text-navy tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-ink hover:text-navy tracking-wide"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
            >
              Join CoFound.th
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
