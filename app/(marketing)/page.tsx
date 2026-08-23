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
import { ROLE_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { listPublicFounders } from "@/lib/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/Avatar";
import { msAgoISO, DAY_MS } from "@/lib/time";

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
    body: "Startups partner with startups — vendors, integrations, distribution, co-marketing. Send a partnership request, get a response, unlock messaging. No mutual-interest gate.",
    status: "Coming soon",
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
    body: "When the community grows, everyone in it grows too. That's the whole idea.",
  },
];

export default async function LandingPage() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  // Live platform data — service-role to read past RLS
  const admin = createAdminClient();
  const sevenDaysAgo = msAgoISO(7 * DAY_MS);
  const thirtyDaysAgo = msAgoISO(30 * DAY_MS);
  const [
    featured,
    { data: recentMilestones },
    { count: totalFounders },
    { count: foundersThisWeek },
    { count: postsThisWeek },
  ] = await Promise.all([
    // Logged-out surface → goes through the public allowlist, which also keeps
    // investors (whose presence is confidential) out of this list.
    listPublicFounders(6),
    admin
      .from("forum_posts")
      .select("id, author_id, content, kind, image_url, link_url, created_at")
      .eq("hidden", false)
      .in("kind", ["milestone", "show_and_tell"])
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(3),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("profile_complete", true)
      .eq("suspended", false),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("profile_complete", true)
      .eq("suspended", false)
      .gte("created_at", sevenDaysAgo),
    admin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);

  // Hydrate milestone authors
  const milestoneAuthorIds = Array.from(
    new Set((recentMilestones ?? []).map((m) => m.author_id as string)),
  );
  const { data: milestoneAuthors } = milestoneAuthorIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", milestoneAuthorIds)
    : { data: [] };
  const milestoneAuthorMap = new Map(
    (milestoneAuthors ?? []).map((a) => [a.id as string, a]),
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-cream border-b border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="text-xs uppercase tracking-[0.25em] text-ink-muted mb-6 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse motion-reduce:animate-none" />
                  {tr("Thailand's startup community")}
                </span>
                {(totalFounders ?? 0) >= 25 && (
                  <>
                    <span className="text-ink-muted/70">·</span>
                    <span className="normal-case tracking-normal text-ink-muted text-xs">
                      {totalFounders} {tr("founders")}
                    </span>
                  </>
                )}
                {(foundersThisWeek ?? 0) > 0 && (
                  <>
                    <span className="text-ink-muted/70">·</span>
                    <span className="normal-case tracking-normal text-gold-ink text-xs">
                      +{foundersThisWeek}{" "}
                      {tr("joined this week")}
                    </span>
                  </>
                )}
                {(postsThisWeek ?? 0) > 0 && (
                  <>
                    <span className="text-ink-muted/70">·</span>
                    <span className="normal-case tracking-normal text-ink-muted text-xs">
                      {postsThisWeek}{" "}
                      {tr("new posts in 7d")}
                    </span>
                  </>
                )}
              </div>
              {/* Wordmark stays visible, but the h1 carries the pitch. */}
              <div className="font-serif text-navy text-d2 lg:text-d3 leading-none tracking-tight mb-5">
                Cofoundee<span className="text-gold-ink">.</span>
              </div>
              <h1 className="text-d3 lg:text-d5 leading-[1.08] tracking-tight mb-6">
                {tr("The bridge for Thailand's startup ecosystem")}
              </h1>
              <p className="text-lg text-ink leading-relaxed max-w-2xl mb-10">
                {tr(
                  "Community, partners, capital, and legal — in one place. Meet the founders building in Thailand, then find the B2B partners, advisors, investors, and co-founders you need.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2 rounded-full"
                >
                  {tr("Join the community")}{" "}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {/* /browse is still auth-gated; /founders is the public
                    preview, so cold visitors get to look before signing up. */}
                <Link
                  href="/founders"
                  className="px-8 py-4 border border-line hover:border-navy text-navy text-sm tracking-wide transition-colors inline-flex items-center justify-center rounded-xl"
                >
                  {tr("Browse founders")}
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold-ink" /> {tr("Free to join")}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold-ink" />{" "}
                  {tr("Built for Thailand")}
                </div>
              </div>
            </div>

            {/* Right column — REAL founders */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="bg-white border border-line p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-gold-ink">
                      {tr("In the community now")}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {totalFounders ?? 0} {tr("total")}
                    </div>
                  </div>
                  {!featured.length ? (
                    <div className="py-8 text-center text-sm text-ink-muted">
                      {tr("Be the first to join.")}
                    </div>
                  ) : (
                    <div className="divide-y divide-line">
                      {/* Rows link into the public preview at /founders/{slug}
                          — no login wall, and only allowlisted fields there. */}
                      {featured.slice(0, 5).map((f) => (
                        <Link
                          key={f.slug}
                          href={`/founders/${f.slug}`}
                          className="group flex items-start gap-3 py-3"
                        >
                          <Avatar
                            name={f.fullName}
                            url={f.photoUrl}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-navy font-medium truncate group-hover:text-gold-ink transition-colors">
                              {f.fullName}
                            </div>
                            <div className="text-xs text-ink-muted truncate">
                              {f.roles.length > 0
                                ? f.roles
                                    .map((r) =>
                                      ROLE_LABELS[r] ? tr(ROLE_LABELS[r]) : r,
                                    )
                                    .join(" · ")
                                : "—"}
                              {f.location
                                ? ` · ${provinceLabel(f.location, locale)}`
                                : ""}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/founders"
                    className="mt-4 pt-3 border-t border-line text-xs text-navy hover:text-gold-ink inline-flex items-center gap-1 transition-colors"
                  >
                    {tr("Browse all founders")}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div
                  className="absolute -bottom-3 -right-3 w-full h-full border border-line rounded-xl"
                  style={{ zIndex: -1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent wins from the community — only render if there are any */}
      {(recentMilestones?.length ?? 0) > 0 && (
        <section className="py-[88px] bg-white border-b border-line">
          <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3 inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse motion-reduce:animate-none" />
                  {tr("Recent wins")}
                </div>
                <h2 className="text-d1 lg:text-d2 leading-tight">
                  {tr("What founders in the community just shipped.")}
                </h2>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(recentMilestones ?? []).map((m) => {
                const author = milestoneAuthorMap.get(m.author_id as string);
                const authorName =
                  (author?.full_name as string) ?? tr("A founder");
                const isMilestone = m.kind === "milestone";
                return (
                  <div
                    key={m.id as string}
                    className={`border p-5 ${
                      isMilestone
                        ? "bg-gold-soft border-line"
                        : "bg-cream border-line"
                    }`}
                  >
                    <p className="text-sm text-ink leading-relaxed mb-3 whitespace-pre-wrap">
                      {m.content as string}
                    </p>
                    {m.image_url ? (
                      <div className="aspect-[3/2] w-full overflow-hidden border border-line bg-cream mb-3 rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.image_url as string}
                          alt={`${tr("Photo shared by")} ${authorName}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    {m.link_url ? (
                      <a
                        href={m.link_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-navy hover:text-gold-ink underline underline-offset-4 decoration-line break-all mb-3"
                      >
                        {(() => {
                          try {
                            return new URL(
                              m.link_url as string,
                            ).hostname.replace(/^www\./, "");
                          } catch {
                            return m.link_url as string;
                          }
                        })()}
                      </a>
                    ) : null}
                    <div className="text-xs text-ink-muted">{authorName}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Four pillars — hidden for now */}
      {false && (
      <section className="py-[88px] bg-white">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px] mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("Where we're headed")}
            </div>
            <h2 className="text-d2 lg:text-d3 leading-tight">
              {tr("Where we want this to go — built one honest step at a time.")}
            </h2>
            <p className="mt-6 text-lg text-ink leading-relaxed">
              {tr(
                "Community comes first, because trust has to. Partnerships, advisors, and investor intros grow on top of it — and we'll build each one only when it's truly ready.",
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="bg-cream border border-line p-8 lg:p-10 relative rounded-xl"
              >
                <p.icon className="w-6 h-6 text-gold-ink mb-4" strokeWidth={1.5} />
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gold-ink">
                    {tr(p.label)}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                      p.status === "Live"
                        ? "border-line text-gold-ink"
                        : p.status === "Beta"
                          ? "border-line text-gold-ink/80"
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
      )}

      {/* Who it's for — hidden for now */}
      {false && (
      <section className="py-[88px] bg-white border-t border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px] mb-16">
            <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("Who it's for")}
            </div>
            <h2 className="text-d2 lg:text-d3 leading-tight">
              {tr("If you're building something in Thailand, you belong here.")}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white border border-line p-8 rounded-xl">
              <div className="font-serif text-d3 text-gold-ink mb-4 leading-none">
                I
              </div>
              <h3 className="text-xl mb-3">
                {tr("You can build")}
              </h3>
              <p className="text-ink leading-relaxed text-sm">
                {tr(
                  "A technical founder looking for someone to own the business, sales, or growth alongside you.",
                )}
              </p>
            </div>
            <div className="bg-white border border-line p-8 rounded-xl">
              <div className="font-serif text-d3 text-gold-ink mb-4 leading-none">
                II
              </div>
              <h3 className="text-xl mb-3">
                {tr("You have the vision")}
              </h3>
              <p className="text-ink leading-relaxed text-sm">
                {tr(
                  "You've got the idea and the market — you need a partner to actually build the product.",
                )}
              </p>
            </div>
            <div className="bg-white border border-line p-8 rounded-xl">
              <div className="font-serif text-d3 text-gold-ink mb-4 leading-none">
                III
              </div>
              <h3 className="text-xl mb-3">
                {tr("You're exploring")}
              </h3>
              <p className="text-ink leading-relaxed text-sm">
                {tr(
                  "Not sure what to build yet — but you want to be around other founders and find the right thing together.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Process — hidden for now */}
      {false && (
      <section className="py-[88px] bg-cream border-y border-line">
        <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
          <div className="max-w-[640px] mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
              {tr("How it works")}
            </div>
            <h2 className="text-d2 lg:text-d3 leading-tight">
              {tr("Trust first. Everything else follows.")}
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {processSteps.map((step) => (
              <div key={step.num}>
                <div className="font-serif text-d4 text-gold-ink mb-4 leading-none">
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
      )}

      {/* A note from the founder — authentic, not a fabricated testimonial */}
      <section className="py-[88px] bg-navy text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Quote
            className="w-10 h-10 text-gold mb-8"
            strokeWidth={1}
          />
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-8">
            {tr("A note from the founder")}
          </div>
          <div className="font-serif text-d1 lg:text-d2 leading-relaxed space-y-6">
            <p>
              {tr(
                "Building a startup is easier than ever — AI, less capital, two or three people can start. The hard part now is finding the right people to build it with.",
              )}
            </p>
            <p>
              {tr(
                "My own circle all has similar skills, so we lack the same things. The person who fills your gaps usually isn't in it.",
              )}
            </p>
            <p>
              {tr(
                "So I wanted a place where people who want to build something can find each other. That's where Cofoundee came from.",
              )}
            </p>
          </div>
          <div className="mt-8 text-sm tracking-wide text-slate-300">
            — Chayanon, {tr("founder of Cofoundee")}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-[88px] bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
            {tr("Questions")}
          </div>
          <h2 className="text-d2 lg:text-d3 leading-tight mb-12">
            {tr("What founders usually ask.")}
          </h2>
          <dl className="border-t border-line">
            {[
              {
                q: "Is it really free?",
                a: "Yes — free for founders, and it stays that way in this phase. We'll earn from partners and services later, never from charging founders to meet each other.",
              },
              {
                q: "Do I need a co-founder or an idea already?",
                a: "No. Come for the community first. Plenty of people arrive just exploring — the connections come from being around, not from having everything figured out.",
              },
              {
                q: "Who is Cofoundee for?",
                a: "Thai startup founders — technical, business, solo, or just starting to explore what to build.",
              },
              {
                q: "Thai or English?",
                a: "Both — use whichever you're comfortable with. The whole platform works in Thai and English.",
              },
            ].map((f) => (
              <div
                key={f.q}
                className="border-b border-line py-6"
              >
                <dt className="font-serif text-xl text-navy mb-2">
                  {tr(f.q)}
                </dt>
                <dd className="text-ink leading-relaxed">
                  {tr(f.a)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[88px] bg-cream border-t border-line">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-d2 lg:text-d3 mb-6 leading-tight">
            {tr("It's still early — which is the best reason to join now.")}
          </h2>
          <p className="text-lg text-ink mb-10 max-w-2xl mx-auto">
            {tr(
              "We're just getting started, and the people who join now shape what this becomes. Come be one of them — free to join.",
            )}
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            {tr("Join us — it's free")}
          </Link>
        </div>
      </section>
    </>
  );
}
