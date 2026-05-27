import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Quote,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/Avatar";

export const revalidate = 60; // refresh live numbers every minute

const pillars = [
  {
    icon: Users,
    label: "Community",
    title: "Where Thai founders meet",
    body: "Forum, content, and events for serious Thai startup builders. Ask questions, share what you're shipping, and meet the people who'll shape your journey.",
    status: "Live",
  },
  {
    icon: Building2,
    label: "B2B Network",
    title: "Companies finding companies",
    body: "Startups partner with startups — vendors, integrations, distribution, co-marketing. Browse company profiles, see capabilities, start the conversation.",
    status: "Live",
  },
  {
    icon: Scale,
    label: "Advisor Partners",
    title: "Legal + finance, on demand",
    body: "Partnered with vetted Thai law firms and accountants. Get advice on incorporation, contracts, fundraising structure — without paying for a full retainer.",
    status: "Coming soon",
  },
  {
    icon: TrendingUp,
    label: "Capital Bridge",
    title: "Warm intros to investors",
    body: "Not cold algorithmic matching. Once you're active in the community, we make warm introductions to angel networks and VCs that fit your stage.",
    status: "Coming soon",
  },
];

const processSteps = [
  {
    num: "I",
    title: "Join the community",
    body: "Free. Build your profile, see who's here, follow the conversations.",
  },
  {
    num: "II",
    title: "Contribute + connect",
    body: "Post, comment, attend events. Get known for what you build.",
  },
  {
    num: "III",
    title: "Find what you need",
    body: "B2B partners, co-founders, advisors, investors — unlocked by trust.",
  },
  {
    num: "IV",
    title: "Grow together",
    body: "The whole ecosystem compounds. Your network is the platform.",
  },
];

const ROLE_LABEL_EN: Record<string, string> = {
  technical: "Technical",
  business: "Business",
  product: "Product",
  marketing: "Marketing",
  finance: "Finance",
  domain_expert: "Domain Expert",
};

export default async function LandingPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);
  const isTH = locale === "th";

  // Live platform data — service-role to read past RLS
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [
    { data: featured },
    { count: totalFounders },
    { count: foundersThisWeek },
    { count: postsThisWeek },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, photo_url, i_am, intent, slug, location, pitch")
      .eq("onboarded", true)
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarded", true),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarded", true)
      .gte("created_at", sevenDaysAgo),
    admin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-cream border-b border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="text-xs uppercase tracking-[0.25em] text-ink-muted mb-6 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  {tr("Thailand's startup community")}
                </span>
                <span className="text-line">·</span>
                <span className="normal-case tracking-normal text-ink-muted text-xs">
                  {totalFounders ?? 0} {tr("founders")}
                </span>
                {(foundersThisWeek ?? 0) > 0 && (
                  <>
                    <span className="text-line">·</span>
                    <span className="normal-case tracking-normal text-gold text-xs">
                      +{foundersThisWeek}{" "}
                      {isTH ? "ใหม่สัปดาห์นี้" : "joined this week"}
                    </span>
                  </>
                )}
                {(postsThisWeek ?? 0) > 0 && (
                  <>
                    <span className="text-line">·</span>
                    <span className="normal-case tracking-normal text-ink-muted text-xs">
                      {postsThisWeek}{" "}
                      {isTH ? "โพสต์ใหม่ 7 วัน" : "new posts in 7d"}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-5xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
                {tr("Where Thai startups build together.")}
              </h1>
              <p className="text-lg text-ink leading-relaxed max-w-2xl mb-10">
                {tr(
                  "Cofoundee is the bridge for Thailand's startup ecosystem — a community where founders meet, companies find partners, and investors and advisors come to you when the time is right.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
                >
                  {tr("Join the community")}{" "}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/browse"
                  className="px-8 py-4 border border-line hover:border-navy text-navy text-sm tracking-wide transition-colors inline-flex items-center justify-center"
                >
                  {tr("Browse founders")}
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" /> {tr("Free forever")}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" />{" "}
                  {tr("Verified profiles")}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" />{" "}
                  {tr("Built for Thailand")}
                </div>
              </div>
            </div>

            {/* Right column — REAL founders */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="bg-white border border-line p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-gold">
                      {isTH ? "ในชุมชนตอนนี้" : "In the community now"}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {totalFounders ?? 0} {isTH ? "คน" : "total"}
                    </div>
                  </div>
                  {!featured?.length ? (
                    <div className="py-8 text-center text-sm text-ink-muted">
                      {isTH
                        ? "เป็นคนแรกที่เข้าร่วม"
                        : "Be the first to join."}
                    </div>
                  ) : (
                    <div className="divide-y divide-line">
                      {featured.slice(0, 5).map((f) => (
                        <Link
                          key={f.id as string}
                          href={`/browse`}
                          className="flex items-start gap-3 py-3 group"
                        >
                          <Avatar
                            name={f.full_name as string}
                            url={f.photo_url as string | null}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-navy font-medium truncate group-hover:text-gold transition-colors">
                              {f.full_name as string}
                            </div>
                            <div className="text-xs text-ink-muted truncate">
                              {f.i_am
                                ? ROLE_LABEL_EN[f.i_am as string] ??
                                  (f.i_am as string)
                                : "—"}
                              {f.location ? ` · ${f.location}` : ""}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/browse"
                    className="mt-4 pt-3 border-t border-line text-xs text-navy hover:text-gold inline-flex items-center gap-1 transition-colors"
                  >
                    {isTH ? "ดู founder ทั้งหมด" : "Browse all founders"}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
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

      {/* Four pillars */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
              {tr("What we do")}
            </div>
            <h2 className="text-4xl lg:text-5xl leading-tight">
              {tr("Everything a Thai startup needs — in one place.")}
            </h2>
            <p className="mt-6 text-lg text-ink leading-relaxed">
              {tr(
                "Built in the order that actually works: community first, then partnerships and capital come on top.",
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="bg-cream border border-line p-8 lg:p-10 relative"
              >
                <p.icon className="w-6 h-6 text-gold mb-4" strokeWidth={1.5} />
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gold">
                    {tr(p.label)}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                      p.status === "Live"
                        ? "border-gold text-gold"
                        : "border-line text-ink-muted"
                    }`}
                  >
                    {tr(p.status)}
                  </span>
                </div>
                <h3 className="text-2xl mb-4">{tr(p.title)}</h3>
                <p className="text-ink leading-relaxed">{tr(p.body)}</p>
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
              {tr("How it works")}
            </div>
            <h2 className="text-4xl lg:text-5xl leading-tight">
              {tr("Trust first. Everything else follows.")}
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {processSteps.map((step) => (
              <div key={step.num}>
                <div className="font-serif text-5xl text-gold mb-4 leading-none">
                  {step.num}
                </div>
                <h3 className="text-xl mb-3">{tr(step.title)}</h3>
                <p className="text-ink leading-relaxed text-sm">
                  {tr(step.body)}
                </p>
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
            {tr(
              "I joined for the community, stayed for the conversations, and ended up finding our first enterprise customer through someone I met in the forum. That's the kind of compounding you don't get from cold outreach.",
            )}
          </blockquote>
          <div className="text-sm tracking-wide">
            <div className="font-semibold text-white">Somchai Tanaka</div>
            <div className="text-slate-300 mt-1">
              {tr("Co-founder, FlexPay Thailand")}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white border-t border-line">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-4xl lg:text-5xl mb-6 leading-tight">
            {tr("The Thai startup ecosystem — built together.")}
          </h2>
          <p className="text-lg text-ink mb-10 max-w-2xl mx-auto">
            {tr(
              "Join the community of serious Thai founders. Free, forever — because trust takes years and we're playing the long game.",
            )}
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            {tr("Join the community — Free")}
          </Link>
        </div>
      </section>
    </>
  );
}
