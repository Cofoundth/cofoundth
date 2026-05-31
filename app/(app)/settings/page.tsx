import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/AvatarUploader";
import { EditProfileFormClient } from "./EditProfileFormClient";
import { tServer } from "@/lib/i18n-server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, slug, full_name, age, location, linkedin_url, photo_url, type, company_name, capabilities, partnership_seeking, status_tags, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, why_this, background, skills, onboarded",
    )
    .eq("id", user.id)
    .single();

  // Every authed user has a profile row (created on signup). If somehow
  // missing, fall back to the wizard. Note: we intentionally DON'T gate on
  // `onboarded` — the editor is available even before onboarding, and a
  // complete save here marks the profile onboarded (see updateProfileAction).
  if (!profile) redirect("/onboarding");

  const profileHref = `/profile/${profile.slug ?? profile.id}`;

  // Map to plain primitives — never hand a raw driver row (enum arrays etc.)
  // straight to a client component.
  const arr = (v: unknown) => [...((v as string[] | null) ?? [])].map(String);
  const initial = {
    full_name: profile.full_name ?? "",
    age: profile.age ?? null,
    location: profile.location ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    type: profile.type ?? "individual",
    company_name: profile.company_name ?? "",
    capabilities: arr(profile.capabilities),
    partnership_seeking: arr(profile.partnership_seeking),
    status_tags: arr(profile.status_tags),
    i_am: arr(profile.i_am),
    intent: arr(profile.intent),
    looking_for: arr(profile.looking_for),
    industry: arr(profile.industry),
    stage: profile.stage ?? "",
    commitment: profile.commitment ?? "",
    runway: profile.runway ?? "",
    experience: profile.experience ?? "",
    pitch: profile.pitch ?? "",
    why_this: profile.why_this ?? "",
    background: profile.background ?? "",
    skills: arr(profile.skills),
  };

  const t = {
    title: await tServer("Edit profile"),
    view: await tServer("View profile"),
    sub: await tServer("Update your details anytime."),
    photo: await tServer("Profile photo"),
  };

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl">{t.title}</h1>
        <Link
          href={profileHref}
          className="text-sm text-navy hover:text-gold tracking-wide"
        >
          {t.view} →
        </Link>
      </div>
      <p className="text-sm text-ink-muted mb-8">{t.sub}</p>

      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.2em] text-gold border-b border-line pb-2 mb-4">
          {t.photo}
        </div>
        <AvatarUploader
          userId={user.id}
          initialUrl={profile.photo_url ?? null}
          name={profile.full_name ?? user.email ?? null}
        />
      </div>

      <EditProfileFormClient initial={initial} />
    </div>
  );
}
