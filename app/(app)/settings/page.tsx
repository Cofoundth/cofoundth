import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bug,
  ChevronRight,
  FileText,
  LifeBuoy,
  LogOut,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/AvatarUploader";
import { PasswordForm } from "@/components/PasswordForm";
import { Avatar } from "@/components/Avatar";
import { EditProfileFormClient } from "./EditProfileFormClient";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { UnblockButton } from "./UnblockButton";
import { signOutAction } from "@/app/(auth)/actions";
import { tServer } from "@/lib/i18n-server";
import { Card, Section } from "@/components/ui";

const SUPPORT_EMAIL = "chayanonr@cofoundee.co";

// Two tabs, one destination. The reference app splits "edit what others see"
// (their /profile pencils) from "manage the account" (their /settings);
// ours keeps both under /settings — Profile is the editor that has always
// lived here, Account is their settings anatomy minus the subscription
// group (Cofoundee has no paid tier and doesn't copy paywalls).
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "account" ? "account" : "profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, slug, full_name, first_name, last_name, age, location, linkedin_url, instagram_url, facebook_url, x_url, photo_url, type, company_name, capabilities, partnership_seeking, status_tags, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, project_url, project_images, why_this, background, work_experience, education, skills, activities, help_with, needs_help_with, building_since, onboarded",
    )
    .eq("id", user.id)
    .single();

  // Every authed user has a profile row (created on signup). If somehow
  // missing, fall back to the wizard. Note: we intentionally DON'T gate on
  // `onboarded` — the editor is available even before onboarding, and a
  // complete save here marks the profile onboarded (see updateProfileAction).
  if (!profile) redirect("/onboarding");

  const profileHref = `/profile/${profile.slug ?? profile.id}`;

  // ---- Blocked members (account tab) — own rows, RLS-readable ----------
  const { data: blockRows } = await supabase
    .from("profile_blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });
  const blockedIds = (blockRows ?? []).map((b) => b.blocked_id as string);
  const { data: blockedProfiles } = blockedIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, full_name, photo_url")
        .in("id", blockedIds)
    : { data: [] };

  // Map to plain primitives — never hand a raw driver row (enum arrays etc.)
  // straight to a client component.
  const arr = (v: unknown) => [...((v as string[] | null) ?? [])].map(String);
  const initial = {
    full_name: profile.full_name ?? "",
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    age: profile.age ?? null,
    location: profile.location ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    instagram_url: profile.instagram_url ?? "",
    facebook_url: profile.facebook_url ?? "",
    x_url: profile.x_url ?? "",
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
    project_url: profile.project_url ?? "",
    project_images: arr(profile.project_images),
    why_this: profile.why_this ?? "",
    background: profile.background ?? "",
    work_experience: profile.work_experience ?? "",
    education: profile.education ?? "",
    skills: arr(profile.skills),
  };

  const t = {
    title: await tServer("Settings"),
    view: await tServer("View profile"),
    sub: await tServer("Your profile, your account."),
    photo: await tServer("Profile photo"),
    tabProfile: await tServer("Profile"),
    tabAccount: await tServer("Account"),
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
      active
        ? "border-navy text-navy font-medium"
        : "border-transparent text-ink-muted hover:text-navy"
    }`;

  const heading = "text-lg font-bold tracking-normal border-b border-line pb-2 mb-4";
  const row =
    "flex items-center justify-between gap-3 p-4 text-sm text-ink hover:bg-cream transition-colors";

  return (
    <Section width="narrow">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-d2 mb-2">{t.title}</h1>
        <Link
          href={profileHref}
          className="text-sm text-navy hover:text-gold-ink tracking-wide"
        >
          {t.view} →
        </Link>
      </div>
      <p className="text-sm text-ink-muted mb-8">{t.sub}</p>

      <nav className="flex items-center gap-1 mb-8 border-b border-line">
        <Link href="/settings" className={tabClass(tab === "profile")}>
          {t.tabProfile}
        </Link>
        <Link href="/settings?tab=account" className={tabClass(tab === "account")}>
          {t.tabAccount}
        </Link>
      </nav>

      {tab === "profile" ? (
        <>
          <div className="mb-14">
            <h2 className={heading}>{t.photo}</h2>
            <AvatarUploader
              userId={user.id}
              initialUrl={profile.photo_url ?? null}
              name={profile.full_name ?? user.email ?? null}
            />
          </div>

          <EditProfileFormClient initial={initial} />
        </>
      ) : (
        <div className="space-y-14">
          {/* ---- Account ---- */}
          <section>
            <h2 className={heading}>{await tServer("Account")}</h2>
            <Card
              padding="none"
              className="divide-y divide-line overflow-hidden mb-5"
            >
              <div className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="text-ink-muted">{await tServer("Email")}</span>
                <span className="text-ink truncate">{user.email}</span>
              </div>
            </Card>
            <p className="text-sm text-ink-muted mb-5 max-w-lg leading-relaxed">
              {await tServer(
                "Set a password so you can sign in with your email — handy if you joined with Google.",
              )}
            </p>
            <PasswordForm />
          </section>

          {/* ---- Privacy & safety ---- */}
          <section>
            <h2 className={heading}>{await tServer("Privacy & safety")}</h2>
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              <div className="flex items-center gap-2 p-4 text-sm text-ink">
                <ShieldCheck
                  className="w-4 h-4 text-gold-ink shrink-0"
                  strokeWidth={1.5}
                />
                {await tServer("Blocked members")}
                <span className="text-xs text-ink-muted">
                  · {await tServer("Members you've blocked won't see you")}
                </span>
              </div>
              {(blockedProfiles ?? []).length === 0 ? (
                <div className="p-4 text-sm text-ink-muted">
                  {await tServer("You haven't blocked anyone.")}
                </div>
              ) : (
                (blockedProfiles ?? []).map((b) => (
                  <div
                    key={b.id as string}
                    className="flex items-center gap-3 p-4"
                  >
                    <Avatar
                      name={b.full_name as string}
                      url={b.photo_url as string | null}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 text-sm text-ink truncate">
                      {(b.full_name as string) ?? "—"}
                    </span>
                    <UnblockButton targetId={b.id as string} />
                  </div>
                ))
              )}
            </Card>
          </section>

          {/* ---- Help & support ---- */}
          <section>
            <h2 className={heading}>{await tServer("Help & support")}</h2>
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              <a href={`mailto:${SUPPORT_EMAIL}`} className={row}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <LifeBuoy
                    className="w-4 h-4 text-gold-ink shrink-0"
                    strokeWidth={1.5}
                  />
                  {await tServer("Contact support")}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Bug report")}`}
                className={row}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Bug
                    className="w-4 h-4 text-gold-ink shrink-0"
                    strokeWidth={1.5}
                  />
                  {await tServer("Report a bug")}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
              </a>
            </Card>
          </section>

          {/* ---- About & legal ---- */}
          <section>
            <h2 className={heading}>{await tServer("About & legal")}</h2>
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              <Link href="/terms" className={row}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <FileText
                    className="w-4 h-4 text-gold-ink shrink-0"
                    strokeWidth={1.5}
                  />
                  {await tServer("Terms of Service")}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
              </Link>
              <Link href="/privacy" className={row}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Scale
                    className="w-4 h-4 text-gold-ink shrink-0"
                    strokeWidth={1.5}
                  />
                  {await tServer("Privacy Policy")}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
              </Link>
              <Link href="/code-of-conduct" className={row}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <ShieldCheck
                    className="w-4 h-4 text-gold-ink shrink-0"
                    strokeWidth={1.5}
                  />
                  {await tServer("Code of Conduct")}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
              </Link>
            </Card>
          </section>

          {/* ---- Session ---- */}
          <section>
            <h2 className={heading}>{await tServer("Session")}</h2>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 border border-line text-sm text-ink hover:border-navy transition-colors rounded-full"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                {await tServer("Sign out")}
              </button>
            </form>
          </section>

          {/* ---- Danger zone ---- */}
          <section>
            <h2 className="text-lg font-bold tracking-normal border-b border-danger-line pb-2 mb-4 text-danger-ink">
              {await tServer("Danger zone")}
            </h2>
            <div className="bg-danger-surface border border-danger-line rounded-3xl p-6">
              <p className="text-sm text-ink mb-5 max-w-lg leading-relaxed">
                {await tServer(
                  "Permanently delete your account and all of your data.",
                )}
              </p>
              <DeleteAccountForm />
            </div>
          </section>
        </div>
      )}
    </Section>
  );
}
