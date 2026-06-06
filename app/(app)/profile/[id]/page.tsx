import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, Building2, ExternalLink, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ROLE_LABELS,
  INTENT_LABELS,
  STAGE_LABELS,
  COMMITMENT_LABELS,
  RUNWAY_LABELS,
  EXPERIENCE_LABELS,
} from "@/lib/matching";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { provinceLabel } from "@/lib/provinces";
import { isAdminUser } from "@/lib/admin";
import { SocialLinks } from "@/components/SocialIcons";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/slug";
import { Avatar } from "@/components/Avatar";
import { ExpressInterestForm } from "./ExpressInterestForm";
import { IncomingInterestBanner } from "./IncomingInterestBanner";
import { ReportForm } from "./ReportForm";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const field = isUuid(id) ? "id" : "slug";
  const { data } = await supabase
    .from("profiles")
    .select("full_name, company_name, type, i_am, pitch")
    .eq(field, id)
    .maybeSingle();
  if (!data) return { title: "Profile" };
  const name =
    data.type === "company" && data.company_name
      ? (data.company_name as string)
      : (data.full_name as string);
  return {
    title: name,
    description:
      (data.pitch as string | null)?.slice(0, 160) ??
      `${name} on Cofoundee`,
  };
}

const COLUMNS =
  "id, slug, full_name, age, location, photo_url, linkedin_url, instagram_url, facebook_url, x_url, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, project_url, project_images, why_this, background, work_experience, education, skills, verified, onboarded, suspended, type, company_name, capabilities, partnership_seeking, status_tags, created_at";

const STATUS_TAG_LABELS: Record<string, { en: string; tone: string }> = {
  open_to_partnerships: {
    en: "Open to partnerships",
    tone: "border-gold/60 text-gold bg-gold/5",
  },
  open_to_cofounder: {
    en: "Open to co-founder",
    tone: "border-gold/60 text-gold bg-gold/5",
  },
  hiring: {
    en: "Hiring",
    tone: "border-navy text-navy bg-cream",
  },
  raising: {
    en: "Raising",
    tone: "border-navy text-navy bg-cream",
  },
  looking_for_advisors: {
    en: "Looking for advisors",
    tone: "border-line text-ink-muted",
  },
};

export default async function ProfileDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireUser();

  // Route accepts either a slug (canonical) or a legacy UUID share-link.
  // If a UUID is passed and the profile has a slug, 301 to the slug URL —
  // keeps old links working but consolidates SEO on the slug.
  const lookupField = isUuid(id) ? "id" : "slug";
  const { data: profile } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq(lookupField, id)
    .maybeSingle();

  if (!profile) notFound();

  const locale = await getLocale();

  if (lookupField === "id" && profile.slug) {
    redirect(`/profile/${profile.slug}`);
  }

  const isOwnProfile = user?.id === profile.id;

  // Suspended profiles are hidden from everyone but the owner and admins.
  if (
    profile.suspended &&
    !isOwnProfile &&
    !(await isAdminUser(supabase, user))
  ) {
    notFound();
  }

  // Track view — at most one row per (viewer, viewed, UTC day) thanks to the
  // `profile_views_unique_per_day` index (see migration 0010). The duplicate
  // insert is silently ignored, so repeat visits within the same day don't
  // bloat the table.
  if (!isOwnProfile && user) {
    // View tracking runs during Server Component *render*, where the
    // cookie-scoped client can't supply a PostgREST-valid token — auth.uid()
    // comes back NULL, so the RLS INSERT (auth.uid() = viewer_id) is rejected
    // with 42501. (Same ES256/RSC-auth limitation that forced the avatar
    // upload through service-role.) The viewer is already authenticated via
    // getUser(), so writing through the admin client is safe.
    const admin = createAdminClient();
    const { error: pvErr } = await admin
      .from("profile_views")
      .upsert(
        { viewer_id: user.id, viewed_id: profile.id },
        { onConflict: "viewer_id,viewed_id,viewed_day", ignoreDuplicates: true },
      );
    if (pvErr) console.error("[profile_views.upsert]", JSON.stringify(pvErr));
  }

  // Recent milestones / shipped posts from this profile — surfaces life
  // and credibility on the profile page itself.
  const { data: recentMilestones } = await supabase
    .from("forum_posts")
    .select("id, content, kind, link_url, created_at")
    .eq("author_id", profile.id)
    .in("kind", ["milestone", "show_and_tell"])
    .order("created_at", { ascending: false })
    .limit(4);

  // Relationship state with this founder, for the sidebar CTA:
  //   matched  → already connected, show "Message them"
  //   incoming → they expressed interest in me → show "Accept & connect"
  //   outgoing → I expressed interest, waiting → show "Interest sent"
  //   none     → show "Express interest"
  let relationship: "none" | "outgoing" | "incoming" | "matched" = "none";
  let matchId: string | null = null;
  if (!isOwnProfile && user) {
    const a = user.id < profile.id ? user.id : profile.id;
    const b = user.id < profile.id ? profile.id : user.id;
    const [{ data: match }, { data: interestRows }] = await Promise.all([
      supabase
        .from("matches")
        .select("id")
        .eq("profile_a_id", a)
        .eq("profile_b_id", b)
        .maybeSingle(),
      supabase
        .from("interests")
        .select("from_profile_id")
        .or(
          `and(from_profile_id.eq.${user.id},to_profile_id.eq.${profile.id}),and(from_profile_id.eq.${profile.id},to_profile_id.eq.${user.id})`,
        ),
    ]);
    if (match) {
      relationship = "matched";
      matchId = match.id as string;
    } else if (
      (interestRows ?? []).some((r) => r.from_profile_id === profile.id)
    ) {
      relationship = "incoming";
    } else if (
      (interestRows ?? []).some((r) => r.from_profile_id === user.id)
    ) {
      relationship = "outgoing";
    }
  }

  const isCompany = profile.type === "company";
  const otherName =
    isCompany && profile.company_name
      ? (profile.company_name as string)
      : (profile.full_name as string);

  // ---- Presentation-ready labels (sync via t(…, locale)) ----------------
  const rolesLabel = ((profile.i_am as string[] | null) ?? [])
    .map((r) => t(ROLE_LABELS[r] ?? r, locale))
    .filter(Boolean)
    .join(" · ");
  const intentLabel = ((profile.intent as string[] | null) ?? [])
    .map((x) => t(INTENT_LABELS[x] ?? x, locale))
    .filter(Boolean)
    .join(" · ");
  const lookingForLabels = ((profile.looking_for as string[] | null) ?? [])
    .map((r) => t(ROLE_LABELS[r] ?? r, locale))
    .filter(Boolean);
  const skills = (profile.skills as string[] | null) ?? [];
  const statusTags = (profile.status_tags as string[] | null) ?? [];
  const capabilities = (profile.capabilities as string[] | null) ?? [];
  const partnershipSeeking =
    (profile.partnership_seeking as string[] | null) ?? [];
  const projectUrl = (profile.project_url as string | null) ?? null;
  const projectImages = (profile.project_images as string[] | null) ?? [];
  const seeking = isCompany ? partnershipSeeking : lookingForLabels;
  const hasAbout = Boolean(
    profile.background ||
      profile.work_experience ||
      profile.education ||
      skills.length,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
      {relationship === "incoming" && !isOwnProfile && (
        <IncomingInterestBanner toId={profile.id} otherName={otherName} />
      )}

      {/* ---- Hero ---- */}
      <header className="bg-cream border border-line p-6 sm:p-8 lg:p-10 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
          <Avatar name={profile.full_name} url={profile.photo_url} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl sm:text-4xl text-navy leading-tight flex items-center gap-2.5 flex-wrap">
              {otherName}
              {profile.verified && (
                <BadgeCheck
                  className="w-6 h-6 text-gold shrink-0"
                  strokeWidth={1.5}
                  aria-label="Verified founder"
                />
              )}
              {isCompany && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.15em] border border-gold/60 text-gold font-sans">
                  <Building2 className="w-3 h-3" strokeWidth={2} />
                  {t("Company", locale)}
                </span>
              )}
              {profile.age && !isCompany && (
                <span className="text-ink-muted text-xl font-sans">
                  , {profile.age}
                </span>
              )}
            </h1>

            {isCompany && (
              <div className="text-sm text-ink-muted mt-1">
                {t("Represented by", locale)}{" "}
                <span className="text-navy font-medium">
                  {profile.full_name}
                </span>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
              {rolesLabel && (
                <span className="text-navy font-medium">{rolesLabel}</span>
              )}
              {intentLabel && <span className="text-gold">· {intentLabel}</span>}
              {profile.location && (
                <span className="inline-flex items-center gap-1 text-ink-muted">
                  <MapPin className="w-3.5 h-3.5" />{" "}
                  {provinceLabel(profile.location as string, locale)}
                </span>
              )}
            </div>

            {statusTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {statusTags.map((tag) => {
                  const meta = STATUS_TAG_LABELS[tag];
                  if (!meta) return null;
                  return (
                    <span
                      key={tag}
                      className={`text-[10px] uppercase tracking-[0.15em] px-2 py-1 border ${meta.tone}`}
                    >
                      {t(meta.en, locale)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
        {/* ---- Main column ---- */}
        <div className="lg:col-span-8 space-y-6">
          {/* What I'm building */}
          {(profile.pitch ||
            capabilities.length > 0 ||
            projectImages.length > 0 ||
            projectUrl) && (
            <section className="bg-white border border-line p-6 sm:p-8 lg:p-10">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
                {t("About me", locale)}
              </div>
              {profile.pitch && (
                <div className="border-l-2 border-gold pl-5">
                  <p className="font-serif text-xl sm:text-2xl text-navy leading-relaxed">
                    {profile.pitch}
                  </p>
                </div>
              )}
              {profile.why_this && (
                <p className="mt-6 text-ink leading-relaxed">
                  {profile.why_this}
                </p>
              )}
              {projectImages.length > 0 && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {projectImages.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-line overflow-hidden hover:border-navy transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-32 object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
              {projectUrl && (
                <a
                  href={projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm text-navy hover:text-gold underline underline-offset-4 decoration-gold/30 break-all"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  {(() => {
                    try {
                      return new URL(projectUrl).hostname.replace(/^www\./, "");
                    } catch {
                      return projectUrl;
                    }
                  })()}
                </a>
              )}
              {capabilities.length > 0 && (
                <div className="mt-6 pt-5 border-t border-line text-sm text-ink">
                  <span className="text-ink-muted">
                    {t("Capabilities:", locale)}{" "}
                  </span>
                  {capabilities.join(", ")}
                </div>
              )}
            </section>
          )}

          {/* Who I am */}
          {hasAbout && (
            <section className="bg-white border border-line p-6 sm:p-8 lg:p-10">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-5">
                {t("Background & experience", locale)}
              </div>
              <div className="space-y-5">
                {profile.background && (
                  <AboutBlock label={t("Background", locale)}>
                    {profile.background as string}
                  </AboutBlock>
                )}
                {profile.work_experience && (
                  <AboutBlock label={t("Work experience", locale)}>
                    {profile.work_experience as string}
                  </AboutBlock>
                )}
                {profile.education && (
                  <AboutBlock label={t("Education", locale)}>
                    {profile.education as string}
                  </AboutBlock>
                )}
                {skills.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-2.5">
                      {t("Skills & expertise", locale)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 border border-line text-sm text-ink"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Recent milestones */}
          {(recentMilestones?.length ?? 0) > 0 && (
            <section className="bg-white border border-line p-6 sm:p-8 lg:p-10">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-5">
                {t("Recent milestones & launches", locale)}
              </div>
              <div className="space-y-4">
                {(recentMilestones ?? []).map((m) => {
                  const isMilestone = m.kind === "milestone";
                  return (
                    <div
                      key={m.id as string}
                      className={`p-4 border-l-2 ${
                        isMilestone
                          ? "border-gold bg-gold/5"
                          : "border-navy bg-cream"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-[0.2em] mb-1.5">
                        <span className={isMilestone ? "text-gold" : "text-navy"}>
                          {t(isMilestone ? "Milestone" : "Shipped", locale)}
                        </span>
                        <span className="text-ink-muted ml-2">
                          {new Date(m.created_at as string).toLocaleDateString(
                            locale === "th" ? "th-TH" : "en-GB",
                            { day: "numeric", month: "short" },
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                        {m.content as string}
                      </p>
                      {m.link_url && (
                        <a
                          href={m.link_url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-xs text-navy hover:text-gold underline underline-offset-4 decoration-gold/30 break-all inline-block"
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
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 self-start">
          {/* What I'm looking for — the headline ask */}
          {seeking.length > 0 && (
            <div className="bg-navy p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-2.5">
                {t("Looking for", locale)}
              </div>
              <div className="font-serif text-lg text-white leading-snug">
                {seeking.join(" · ")}
              </div>
              {intentLabel && !isCompany && (
                <div className="text-sm text-white/60 mt-2">{intentLabel}</div>
              )}
            </div>
          )}

          {!isOwnProfile && (
            <>
              {relationship !== "incoming" && (
                <ExpressInterestForm
                  toId={profile.id}
                  relationship={relationship}
                  matchId={matchId}
                  otherName={otherName}
                />
              )}
              <div className="bg-white border border-line p-4">
                <ReportForm targetId={profile.id} />
              </div>
            </>
          )}

          {isOwnProfile && (
            <div className="bg-cream border border-gold/40 p-6 text-center">
              <p className="text-sm text-ink mb-3">
                {t(
                  profile.onboarded
                    ? "This is your own profile."
                    : "Finish setting up your profile.",
                  locale,
                )}
              </p>
              <Link
                href={profile.onboarded ? "/settings" : "/onboarding"}
                className="inline-block px-4 py-2 border border-navy text-navy hover:bg-navy hover:text-white text-sm tracking-wide transition-colors"
              >
                {t(
                  profile.onboarded ? "Edit profile" : "Complete profile",
                  locale,
                )}
              </Link>
            </div>
          )}

          {/* Founder facts */}
          <div className="bg-white border border-line p-6 space-y-4 text-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-2">
              {t("Founder facts", locale)}
            </div>
            <Fact
              label={t("Stage", locale)}
              value={
                profile.stage &&
                t(STAGE_LABELS[profile.stage] ?? profile.stage, locale)
              }
            />
            <Fact
              label={t("Commitment", locale)}
              value={
                profile.commitment &&
                t(
                  COMMITMENT_LABELS[profile.commitment] ?? profile.commitment,
                  locale,
                )
              }
            />
            <Fact
              label={t("Runway", locale)}
              value={
                profile.runway &&
                t(RUNWAY_LABELS[profile.runway] ?? profile.runway, locale)
              }
            />
            <Fact
              label={t("Experience", locale)}
              value={
                profile.experience &&
                t(
                  EXPERIENCE_LABELS[profile.experience] ?? profile.experience,
                  locale,
                )
              }
            />
            <Fact
              label={t("Industries", locale)}
              value={(profile.industry ?? []).join(", ") || null}
            />
          </div>

          {(profile.linkedin_url ||
            profile.x_url ||
            profile.instagram_url ||
            profile.facebook_url) && (
            <div className="bg-white border border-line p-6">
              <SocialLinks
                linkedin={profile.linkedin_url as string | null}
                x={profile.x_url as string | null}
                instagram={profile.instagram_url as string | null}
                facebook={profile.facebook_url as string | null}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function AboutBlock({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-1.5">
        {label}
      </div>
      <p className="text-ink leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}
