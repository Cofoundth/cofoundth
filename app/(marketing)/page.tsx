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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [
    { data: featured },
    { data: recentMilestones },
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
      .from("status_updates")
      .select("id, author_id, content, kind, created_at")
      .in("kind", ["milestone", "show_and_tell"])
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(3),
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
                  {(totalFounders ?? 0) >= 25
                    ? `${totalFounders} ${tr("founders")}`
                    : tr("Founding members")}
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
                              {((f.i_am as string[] | null) ?? []).length > 0
                                ? ((f.i_am as string[] | null) ?? [])
                                    .map((r) => ROLE_LABEL_EN[r] ?? r)
                                    .join(" · ")
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

      {/* Recent wins from the community — only render if there are any */}
      {(recentMilestones?.length ?? 0) > 0 && (
        <section className="py-16 bg-white border-b border-line">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3 inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  {isTH ? "ความสำเร็จล่าสุดในชุมชน" : "Recent wins"}
                </div>
                <h2 className="text-2xl lg:text-3xl leading-tight">
                  {isTH
                    ? "ผลงานล่าสุดจาก founder ในชุมชน"
                    : "What founders in the community just shipped."}
                </h2>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {(recentMilestones ?? []).map((m) => {
                const author = milestoneAuthorMap.get(m.author_id as string);
                const isMilestone = m.kind === "milestone";
                return (
                  <div
                    key={m.id as string}
                    className={`border p-5 ${
                      isMilestone
                        ? "bg-gold/5 border-gold/40"
                        : "bg-cream border-line"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-2 inline-flex items-center gap-1.5">
                      {isMilestone
                        ? isTH
                          ? "ความสำเร็จ"
                          : "Milestone"
                        : isTH
                          ? "เพิ่งปล่อย"
                          : "Shipped"}
                    </div>
                    <p className="text-sm text-ink leading-relaxed mb-3 line-clamp-3">
                      {m.content as string}
                    </p>
                    <div className="text-xs text-ink-muted">
                      {(author?.full_name as string) ?? "A founder"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
                        : p.status === "Beta"
                          ? "border-gold/60 text-gold/80"
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

      {/* Who it's for */}
      <section className="py-24 bg-white border-t border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-16">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
              {isTH ? "เหมาะกับใคร" : "Who it's for"}
            </div>
            <h2 className="text-4xl lg:text-5xl leading-tight">
              {isTH
                ? "ถ้าคุณกำลังสร้างอะไรสักอย่างในไทย ที่นี่มีที่สำหรับคุณ"
                : "If you're building something in Thailand, you belong here."}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white border border-line p-8">
              <div className="font-serif text-4xl text-gold mb-4 leading-none">
                I
              </div>
              <h3 className="text-xl mb-3">
                {isTH ? "คุณสร้างได้" : "You can build"}
              </h3>
              <p className="text-ink leading-relaxed text-sm">
                {isTH
                  ? "Technical founder ที่อยากเจอคนมาดูแลธุรกิจ การขาย หรือการเติบโต เพื่อไปด้วยกัน"
                  : "A technical founder looking for someone to own the business, sales, or growth alongside you."}
              </p>
            </div>
            <div className="bg-white border border-line p-8">
              <div className="font-serif text-4xl text-gold mb-4 leading-none">
                II
              </div>
              <h3 className="text-xl mb-3">
                {isTH ? "คุณมีวิสัยทัศน์" : "You have the vision"}
              </h3>
              <p className="text-ink leading-relaxed text-sm">
                {isTH
                  ? "มีไอเดียและเข้าใจตลาด แต่ต้องการพาร์ตเนอร์ที่ลงมือสร้างผลิตภัณฑ์จริง"
                  : "You've got the idea and the market — you need a partner to actually build the product."}
              </p>
            </div>
            <div className="bg-white border border-line p-8">
              <div className="font-serif text-4xl text-gold mb-4 leading-none">
                III
              </div>
              <h3 className="text-xl mb-3">
                {isTH ? "คุณกำลังมองหา" : "You're exploring"}
              </h3>
              <p className="text-ink leading-relaxed text-sm">
                {isTH
                  ? "ยังไม่แน่ใจว่าจะทำอะไร แต่อยากอยู่ท่ามกลาง founder คนอื่น แล้วหาทางที่ใช่ไปด้วยกัน"
                  : "Not sure what to build yet — but you want to be around other founders and find the right thing together."}
              </p>
            </div>
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

      {/* A note from the founder — authentic, not a fabricated testimonial */}
      <section className="py-24 lg:py-28 bg-navy text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Quote
            className="w-10 h-10 text-gold mb-8"
            strokeWidth={1}
          />
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-8">
            {isTH ? "จากผู้ก่อตั้ง" : "A note from the founder"}
          </div>
          <div className="font-serif text-2xl lg:text-3xl leading-relaxed space-y-6">
            {isTH ? (
              <>
                <p>
                  ผมสร้าง Cofoundee เพราะการหาคนที่ใช่คือเรื่องที่ยากที่สุดของการทำสตาร์ทอัพในไทย
                  และมันไม่ได้เกิดจากการดูโปรไฟล์หรือปัดซ้ายปัดขวา
                  แต่เกิดจากความไว้ใจที่ค่อยๆ ก่อตัวในชุมชนจริงๆ
                </p>
                <p>
                  เราเลยเริ่มจากตรงนั้น ไม่ใช่อัลกอริทึมจับคู่
                  แต่เป็นที่ที่ founder ไทยมาเจอกัน แชร์สิ่งที่กำลังทำ แล้วค่อยๆ
                  รู้จักกัน จนพาร์ตเนอร์ การแนะนำ และ co-founder
                  เกิดขึ้นเองตามธรรมชาติ
                </p>
                <p>
                  ยังเป็นช่วงเริ่มต้น ถ้าคุณเป็น founder ที่เหนื่อยกับการเดินคนเดียว
                  ที่นี่สร้างมาเพื่อคุณ
                </p>
              </>
            ) : (
              <>
                <p>
                  I&apos;m building Cofoundee because finding the right people is
                  the hardest part of starting up in Thailand — and it
                  doesn&apos;t happen through cold profiles or a swipe. It happens
                  through trust, built slowly, in a real community.
                </p>
                <p>
                  So that&apos;s where we start. Not a matching algorithm — a
                  place where Thai founders show up, share what they&apos;re
                  building, and get to know each other. The partnerships, the
                  intros, and yes, the co-founders follow naturally.
                </p>
                <p>
                  It&apos;s early. If you&apos;re a founder tired of doing this
                  alone, this is built for you.
                </p>
              </>
            )}
          </div>
          <div className="mt-8 text-sm tracking-wide text-slate-300">
            — Chayanon, {isTH ? "ผู้ก่อตั้ง Cofoundee" : "founder of Cofoundee"}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-6">
            {isTH ? "คำถามที่พบบ่อย" : "Questions"}
          </div>
          <h2 className="text-4xl lg:text-5xl leading-tight mb-12">
            {isTH ? "เรื่องที่ founder มักถาม" : "What founders usually ask."}
          </h2>
          <dl className="border-t border-line">
            {[
              {
                q_en: "Is it really free?",
                q_th: "ฟรีจริงไหม?",
                a_en: "Yes — free for founders, and it stays that way in this phase. We'll earn from partners and services later, never from charging founders to meet each other.",
                a_th: "ฟรีสำหรับ founder จริงๆ และจะเป็นแบบนี้ตลอดช่วงนี้ รายได้ในอนาคตมาจากพาร์ตเนอร์และบริการ ไม่ใช่การเก็บเงิน founder เพื่อให้ได้มาเจอกัน",
              },
              {
                q_en: "Do I need a co-founder or an idea already?",
                q_th: "ต้องมี co-founder หรือไอเดียก่อนไหม?",
                a_en: "No. Come for the community first. Plenty of people arrive just exploring — the connections come from being around, not from having everything figured out.",
                a_th: "ไม่ต้อง มาเป็นส่วนหนึ่งของชุมชนก่อน หลายคนเริ่มจากแค่เข้ามาดูๆ คอนเนกชันเกิดจากการได้อยู่ในชุมชน ไม่ใช่จากการมีทุกอย่างพร้อม",
              },
              {
                q_en: "Who is Cofoundee for?",
                q_th: "Cofoundee เหมาะกับใคร?",
                a_en: "Thai startup founders — technical, business, solo, or just starting to explore what to build.",
                a_th: "founder สตาร์ทอัพไทย ทั้งสาย technical สายธุรกิจ คนที่ทำอยู่คนเดียว หรือเพิ่งเริ่มมองหาว่าจะทำอะไรดี",
              },
              {
                q_en: "Thai or English?",
                q_th: "ใช้ภาษาไทยหรืออังกฤษ?",
                a_en: "Both — use whichever you're comfortable with. The whole platform works in Thai and English.",
                a_th: "ได้ทั้งสองภาษา ใช้ภาษาที่คุณถนัดได้เลย ทั้งแพลตฟอร์มรองรับทั้งไทยและอังกฤษ",
              },
              {
                q_en: "How is this different from LinkedIn or co-founder matching apps?",
                q_th: "ต่างจาก LinkedIn หรือแอปหา co-founder ยังไง?",
                a_en: "Those start with a transaction. We start with a community. Trust comes first — matching, intros, and partnerships grow on top of it, not the other way around.",
                a_th: "พวกนั้นเริ่มจากการจับคู่ แต่เราเริ่มจากชุมชน ความไว้ใจมาก่อน แล้วการแมตช์ การแนะนำ และพาร์ตเนอร์จึงค่อยตามมา ไม่ใช่กลับกัน",
              },
            ].map((f) => (
              <div
                key={f.q_en}
                className="border-b border-line py-6"
              >
                <dt className="font-serif text-xl text-navy mb-2">
                  {isTH ? f.q_th : f.q_en}
                </dt>
                <dd className="text-ink leading-relaxed">
                  {isTH ? f.a_th : f.a_en}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-cream border-t border-line">
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
