import Link from "next/link";
import { ArrowRight, Check, Compass, Lightbulb, Quote, Wrench } from "lucide-react";

const founderTypes = [
  {
    icon: Lightbulb,
    label: "I have an idea",
    title: "Idea-Haver",
    body: "You have a clear vision and need someone with complementary skills to execute it with you.",
    example:
      "“Building a FinTech for Thai SMEs. Need a technical co-founder.”",
  },
  {
    icon: Wrench,
    label: "I have skills",
    title: "Skill-Bringer",
    body: "You can build, sell, or design — but want to join someone else’s vision rather than start your own.",
    example:
      "“Senior engineer. Open to joining a strong commercial founder in HealthTech.”",
  },
  {
    icon: Compass,
    label: "Let’s figure it out",
    title: "Explorer",
    body: "You’re open to brainstorming and finding the right opportunity together with a partner.",
    example:
      "“Marketing background. Looking to explore consumer tech ideas with co-founders.”",
  },
];

const processSteps = [
  {
    num: "I",
    title: "Create profile",
    body: "Declare what you are, what you bring, and what you need.",
  },
  {
    num: "II",
    title: "Browse directory",
    body: "Filter by role, industry, and intent. Read full pitches.",
  },
  {
    num: "III",
    title: "Express interest",
    body: "Send a thoughtful note. No spam, no swipes.",
  },
  {
    num: "IV",
    title: "Mutual unlock",
    body: "When both express interest, messaging opens.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-cream border-b border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-32">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="text-xs uppercase tracking-[0.25em] text-ink-muted mb-8">
                <span className="inline-block w-12 h-px bg-ink-muted align-middle mr-3" />
                Find the missing piece
              </div>
              <h1 className="text-5xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
                The right co-founder is the difference.
              </h1>
              <p className="text-lg text-ink leading-relaxed max-w-2xl mb-10">
                CoFound.th matches Thai entrepreneurs based on complementary
                skills, intent, and industry — not random swipes. Built for
                serious founders looking for the right partner to build with.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
                >
                  Create your profile <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/browse"
                  className="px-8 py-4 border border-line hover:border-navy text-navy text-sm tracking-wide transition-colors inline-flex items-center justify-center"
                >
                  Browse founders
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" /> Free to join
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" /> Verified profiles
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" /> Mutual interest
                  required
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="bg-white border border-line p-8">
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-5">
                    Example match
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-cream border-l-2 border-gold">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">👩‍💼</div>
                        <div>
                          <div className="font-serif text-lg text-navy">
                            Praewa C.
                          </div>
                          <div className="text-xs text-ink-muted">
                            Business &middot; FinTech
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-ink">
                        💡 Has an idea &middot; Needs: Technical Co-founder
                      </div>
                    </div>
                    <div className="text-center py-2">
                      <div className="text-xs uppercase tracking-[0.2em] text-gold">
                        ◆ Complementary ◆
                      </div>
                    </div>
                    <div className="p-4 bg-cream border-l-2 border-navy">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">👨‍🔬</div>
                        <div>
                          <div className="font-serif text-lg text-navy">
                            Mint T.
                          </div>
                          <div className="text-xs text-ink-muted">
                            Technical &middot; ML/AI
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-ink">
                        🔧 Open to ideas &middot; Looking for: Business
                        Co-founder
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="absolute -bottom-3 -right-3 w-full h-full border border-gold"
                  style={{ zIndex: -1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three founder types */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
              How it works
            </div>
            <h2 className="text-4xl lg:text-5xl leading-tight">
              Three kinds of founders. One platform that matches them.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {founderTypes.map((p) => (
              <div
                key={p.title}
                className="bg-cream border border-line p-8 lg:p-10"
              >
                <p.icon className="w-6 h-6 text-gold mb-4" strokeWidth={1.5} />
                <div className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
                  {p.label}
                </div>
                <h3 className="text-2xl mb-4">{p.title}</h3>
                <p className="text-ink leading-relaxed mb-5">{p.body}</p>
                <div className="pt-5 border-t border-line italic text-sm text-ink-muted">
                  {p.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 bg-cream border-y border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
              The process
            </div>
            <h2 className="text-4xl lg:text-5xl leading-tight">
              Considered. Mutual. Serious.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {processSteps.map((step) => (
              <div key={step.num}>
                <div className="font-serif text-5xl text-gold mb-4 leading-none">
                  {step.num}
                </div>
                <h3 className="text-xl mb-3">{step.title}</h3>
                <p className="text-ink leading-relaxed text-sm">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-navy text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center">
          <Quote className="w-12 h-12 text-gold mx-auto mb-8" strokeWidth={1} />
          <blockquote className="font-serif text-3xl lg:text-4xl leading-relaxed mb-10 italic text-white">
            I had the idea, the customers, and the runway. What I didn&rsquo;t
            have was a technical co-founder I could trust. CoFound.th matched me
            with someone whose skills, values, and ambition perfectly
            complemented mine. Six months later, we&rsquo;re building together.
          </blockquote>
          <div className="text-sm tracking-wide">
            <div className="font-semibold text-white">Somchai Tanaka</div>
            <div className="text-slate-300 mt-1">
              Co-founder, FlexPay Thailand
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white border-t border-line">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-4xl lg:text-5xl mb-6 leading-tight">
            Your missing piece is on the platform.
          </h2>
          <p className="text-lg text-ink mb-10 max-w-2xl mx-auto">
            Join Thailand&rsquo;s most serious community of founders looking to
            build together. Free during our launch phase.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            Create your profile — Free
          </Link>
        </div>
      </section>
    </>
  );
}
