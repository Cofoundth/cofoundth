import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, Building2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  complementScore,
  ROLE_LABELS,
  INTENT_LABELS,
  STAGE_LABELS,
  COMMITMENT_LABELS,
  RUNWAY_LABELS,
  EXPERIENCE_LABELS,
} from "@/lib/matching";
import { tServer } from "@/lib/i18n-server";
import { isUuid } from "@/lib/slug";
import { Avatar } from "@/components/Avatar";
import { ExpressInterestForm } from "./ExpressInterestForm";
import { ReportForm } from "./ReportForm";

type Props = {
  params: Promise<{ id: string }>;
};

const COLUMNS =
  "id, slug, full_name, age, location, photo_url, linkedin_url, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, why_this, skills, verified, onboarded, type, company_name, capabilities";

export default async function ProfileDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (lookupField === "id" && profile.slug) {
    redirect(`/profile/${profile.slug}`);
  }

  const isOwnProfile = user?.id === profile.id;

  // Track view — at most one row per (viewer, viewed, UTC day) thanks to the
  // `profile_views_unique_per_day` index (see migration 0010). The duplicate
  // insert is silently ignored, so repeat visits within the same day don't
  // bloat the table.
  if (!isOwnProfile && user) {
    await supabase
      .from("profile_views")
      .upsert(
        { viewer_id: user.id, viewed_id: profile.id },
        { onConflict: "viewer_id,viewed_id,viewed_day", ignoreDuplicates: true },
      );
  }

  // Fetch own profile for complement score + existing interest
  const { data: me } = isOwnProfile
    ? { data: null }
    : await supabase
        .from("profiles")
        .select(
          "i_am, intent, looking_for, industry, stage, commitment, location",
        )
        .eq("id", user!.id)
        .single();

  const score =
    me && profile.i_am && me.i_am
      ? complementScore(
          {
            i_am: me.i_am,
            intent: me.intent,
            looking_for: me.looking_for ?? [],
            industry: me.industry ?? [],
            stage: me.stage,
            commitment: me.commitment,
            location: me.location,
          },
          {
            i_am: profile.i_am,
            intent: profile.intent,
            looking_for: profile.looking_for ?? [],
            industry: profile.industry ?? [],
            stage: profile.stage,
            commitment: profile.commitment,
            location: profile.location,
          },
        )
      : null;

  const { data: existingInterest } = isOwnProfile
    ? { data: null }
    : await supabase
        .from("interests")
        .select("id")
        .eq("from_profile_id", user!.id)
        .eq("to_profile_id", profile.id)
        .maybeSingle();

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/browse"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> {await tServer("Back to directory")}
      </Link>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Main column */}
        <div className="lg:col-span-8">
          {/* Header */}
          <header className="bg-white border border-line p-8 lg:p-10 mb-6">
            <div className="flex items-start gap-6 mb-6">
              <Avatar
                name={profile.full_name}
                url={profile.photo_url}
                size="xl"
              />
              <div className="flex-1">
                <h1 className="text-3xl mb-2 inline-flex items-center gap-2 flex-wrap">
                  {profile.type === "company" && profile.company_name
                    ? profile.company_name
                    : profile.full_name}
                  {profile.verified && (
                    <BadgeCheck
                      className="w-6 h-6 text-gold shrink-0"
                      strokeWidth={1.5}
                      aria-label="Verified founder"
                    />
                  )}
                  {profile.type === "company" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.15em] border border-gold/60 text-gold font-sans">
                      <Building2 className="w-3 h-3" strokeWidth={2} />
                      Company
                    </span>
                  )}
                  {profile.age && profile.type !== "company" && (
                    <span className="text-ink-muted text-xl font-sans">
                      , {profile.age}
                    </span>
                  )}
                </h1>
                {profile.type === "company" && (
                  <div className="text-sm text-ink-muted mb-2">
                    {await tServer("Represented by")}{" "}
                    <span className="text-navy font-medium">
                      {profile.full_name}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted mb-2">
                  {profile.i_am && (
                    <span className="text-navy font-medium">
                      {ROLE_LABELS[profile.i_am]}
                    </span>
                  )}
                  {profile.intent && (
                    <span className="text-gold">
                      &middot; {INTENT_LABELS[profile.intent]}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {profile.location}
                    </span>
                  )}
                </div>
                {(profile.looking_for ?? []).length > 0 && (
                  <div className="text-sm text-ink mt-3">
                    <span className="text-ink-muted">
                      {await tServer("Looking for:")}{" "}
                    </span>
                    {(
                      await Promise.all(
                        (profile.looking_for ?? [])
                          .map((r: string) => ROLE_LABELS[r])
                          .filter(Boolean)
                          .map((s: string) => tServer(s)),
                      )
                    ).join(", ")}
                  </div>
                )}
                {profile.type === "company" &&
                  ((profile.capabilities ?? []) as string[]).length > 0 && (
                    <div className="text-sm text-ink mt-3">
                      <span className="text-ink-muted">
                        {await tServer("Capabilities:")}{" "}
                      </span>
                      {((profile.capabilities ?? []) as string[]).join(", ")}
                    </div>
                  )}
              </div>
            </div>
          </header>

          {/* The Pitch */}
          {profile.pitch && (
            <section className="bg-white border border-line p-8 lg:p-10 mb-6">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                {await tServer("The Pitch")}
              </div>
              <p className="font-serif text-lg text-ink leading-relaxed">
                {profile.pitch}
              </p>
            </section>
          )}

          {/* Why this, why now */}
          {profile.why_this && (
            <section className="bg-white border border-line p-8 lg:p-10 mb-6">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                {await tServer("Why this, why now")}
              </div>
              <p className="text-ink leading-relaxed">{profile.why_this}</p>
            </section>
          )}

          {/* Skills */}
          {(profile.skills ?? []).length > 0 && (
            <section className="bg-white border border-line p-8 lg:p-10 mb-6">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
                {await tServer("Skills & expertise")}
              </div>
              <div className="flex flex-wrap gap-2">
                {(profile.skills as string[]).map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1.5 border border-line text-sm text-ink"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {score !== null && (
            <div className="bg-white border border-gold/30 p-6 text-center">
              <div className="font-serif text-5xl text-gold leading-none mb-2">
                {score}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                {await tServer("Complement Score")}
              </div>
            </div>
          )}

          {!isOwnProfile && (
            <>
              <div className="bg-white border border-line p-6">
                <ExpressInterestForm
                  toId={profile.id}
                  alreadySent={!!existingInterest}
                />
              </div>
              <div className="bg-white border border-line p-4">
                <ReportForm targetId={profile.id} />
              </div>
            </>
          )}

          {isOwnProfile && (
            <div className="bg-cream border border-gold/40 p-6 text-center">
              <p className="text-sm text-ink mb-3">
                {await tServer("This is your own profile.")}
              </p>
              <Link
                href="/onboarding"
                className="inline-block px-4 py-2 border border-navy text-navy hover:bg-navy hover:text-white text-sm tracking-wide transition-colors"
              >
                {await tServer("Edit profile")}
              </Link>
            </div>
          )}

          {/* Facts */}
          <div className="bg-white border border-line p-6 space-y-4 text-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-2">
              {await tServer("Founder facts")}
            </div>
            <Fact label="Stage" value={profile.stage && STAGE_LABELS[profile.stage]} />
            <Fact
              label="Commitment"
              value={profile.commitment && COMMITMENT_LABELS[profile.commitment]}
            />
            <Fact
              label="Runway"
              value={profile.runway && RUNWAY_LABELS[profile.runway]}
            />
            <Fact
              label="Experience"
              value={profile.experience && EXPERIENCE_LABELS[profile.experience]}
            />
            <Fact
              label="Industries"
              value={(profile.industry ?? []).join(", ") || null}
            />
          </div>

          {profile.linkedin_url && (
            <div className="bg-white border border-line p-6 text-sm">
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy hover:text-gold inline-flex items-center gap-2"
              >
                LinkedIn profile
              </a>
            </div>
          )}
        </aside>
      </div>
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
