const columns = [
  {
    title: "Platform",
    items: [
      { label: "Sign in", href: "/login" },
      { label: "Create profile", href: "/signup" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Insights", href: "/insights" },
      { label: "Legal templates", href: "/legal-templates" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Contact", href: "mailto:hello@cofoundee.co" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="font-serif text-2xl mb-4 text-white">
              Cofoundee
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              The platform for Thailand&rsquo;s founders to find their
              co-founder.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-slate-200 hover:text-white"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-400">
          <div>&copy; 2026 Cofoundee Co., Ltd. All rights reserved.</div>
          <div className="flex gap-6">
            <span>Privacy (PDPA)</span>
            <span>Terms</span>
            <span>Code of Conduct</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
