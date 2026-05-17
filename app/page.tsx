export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="font-serif text-xl text-navy tracking-tight">
            CoFound<span className="text-gold">.</span>th
          </div>
          <nav className="hidden sm:flex items-center gap-8 text-sm text-ink">
            <a href="#how" className="hover:text-navy">
              How it works
            </a>
            <a href="#founders" className="hover:text-navy">
              For founders
            </a>
            <a href="#insights" className="hover:text-navy">
              Insights
            </a>
          </nav>
        </div>
      </header>

      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
            Phase I &middot; Co-Founder Matching
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl text-navy leading-tight mb-6">
            Find the co-founder you actually need.
          </h1>
          <p className="text-lg text-ink mb-10 max-w-xl mx-auto leading-relaxed">
            The platform for Thai founders to find their co-founder based on
            complementary skills, intent, and industry — not random swipes.
          </p>

          <div className="flex items-center justify-center gap-px">
            <span className="block w-12 h-px bg-gold" />
            <span className="block w-2 h-2 border border-gold rotate-45 mx-3" />
            <span className="block w-12 h-px bg-gold" />
          </div>

          <p className="text-sm text-ink-muted mt-10">
            Coming soon. Built by founders, for founders.
          </p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-ink-muted flex justify-between">
          <span>CoFound.th &copy; 2026</span>
          <span>Bangkok, Thailand</span>
        </div>
      </footer>
    </main>
  );
}
