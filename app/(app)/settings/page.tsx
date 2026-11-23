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
import { loginHref } from "@/lib/auth";
import { AvatarUploader } from "@/components/AvatarUploader";
import { PasswordForm } from "@/components/PasswordForm";
import { Avatar } from "@/components/Avatar";
import { EditProfileFormClient } from "./EditProfileFormClient";
import { IdentityForm } from "./IdentityForm";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { UnblockButton } from "./UnblockButton";
import { signOutAction } from "@/app/(auth)/actions";
import { parseAccountRole, roleHome } from "@/lib/roles";
import { tServer } from "@/lib/i18n-server";
import { Button, Card, cn, Section, SectionHeading, Tabs } from "@/components/ui";
import { SETTINGS_HEADING, SETTINGS_SECTION } from "./settings-layout";

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
  if (!user) redirect(await loginHref());

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, slug, account_type, full_name, first_name, last_name, age, location, linkedin_url, instagram_url, facebook_url, x_url, photo_url, type, company_name, capabilities, partnership_seeking, status_tags, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, project_url, project_images, why_this, background, work_experience, education, skills, activities, help_with, needs_help_with, building_since, onboarded",
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
    onboarded: profile.onboarded === true,
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
    // These four are SELECTED above and EDITED by the form, so they must be
    // handed to it: left out, the form started them empty and every save
    // wrote [] / NULL over what the member had (found 2026-11-17).
    activities: arr(profile.activities),
    help_with: arr(profile.help_with),
    needs_help_with: arr(profile.needs_help_with),
    building_since: (profile.building_since as string | null) ?? "",
  };

  // A GATED ROLE HAS NO FOUNDER PROFILE TO EDIT.
  //
  // /settings is on both gated roles' allowlists in lib/roles.ts, and on
  // purpose — the Account tab is where their email, password and account
  // deletion live. What is NOT theirs is the Profile tab's founder editor:
  // it writes i_am / looking_for / pitch / type and `onboarded: true`, which
  // publishes the row as a founder to every unpinned query. updateProfileAction
  // refuses that submit; this hides the form so nobody fills in two screens of
  // fields to be told no. Both layers are needed — see the comment there.
  //
  // `roleHome(role) !== null` is "this role is gated", the same test the
  // onboarding refusal uses, so role four is covered without a third disjunct.
  const role = parseAccountRole(profile.account_type);
  const gated = roleHome(role) !== null;

  const t = {
    title: await tServer("Settings"),
    view: await tServer("View profile"),
    sub: await tServer("Your profile, your account."),
    photo: await tServer("Profile photo"),
    tabProfile: await tServer("Profile"),
    tabAccount: await tServer("Account"),
    noFounderProfile: await tServer(
      "This account doesn’t have a founder profile to fill in.",
    ),
    explorerVisibility: await tServer(
      "Your account. In the community you show up as a commenter and a meetup guest.",
    ),
  };

  const row =
    "flex items-center justify-between gap-3 p-4 text-sm text-ink hover:bg-cream transition-colors";

  // The full width (the founder's call, 2026-11-18): from `lg` every section
  // is a row, its title left and its content right (./settings-layout.ts).
  return (
    <Section>
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

      <Tabs
        className="mb-8"
        value={tab}
        aria-label={t.title}
        items={[
          { key: "profile", label: t.tabProfile, href: "/settings" },
          {
            key: "account",
            label: t.tabAccount,
            href: "/settings?tab=account",
          },
        ]}
      />

      {tab === "profile" ? (
        <>
          {/* The first row sits right under the tabs, whose own line is
              its separator. */}
          <section className={cn("mb-14", SETTINGS_SECTION, "lg:border-t-0 lg:pt-0")}>
            <SectionHeading
              title={t.photo}
              divider
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
              <AvatarUploader
                userId={user.id}
                initialUrl={profile.photo_url ?? null}
                name={profile.full_name ?? user.email ?? null}
              />
            </div>
          </section>

          {gated ? (
            <div className="max-w-[640px] space-y-5">
              <div className="space-y-2">
                <p className="text-sm text-ink-muted leading-relaxed">
                  {t.noFounderProfile}
                </p>
                {role === "explorer" && (
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {t.explorerVisibility}
                  </p>
                )}
              </div>
              {/* The name IS editable even without a founder profile — it is
                  public the moment they comment or RSVP. updateIdentityAction
                  writes those three columns and nothing else; see the comment
                  on it for why it is a separate action and not a branch. */}
              <IdentityForm
                firstName={initial.first_name}
                lastName={initial.last_name}
              />
            </div>
          ) : (
            <EditProfileFormClient initial={initial} />
          )}
        </>
      ) : (
        <div className="space-y-14">
          {/* ---- Account ---- (the first row: the tabs' line is above it) */}
          <section className={cn(SETTINGS_SECTION, "lg:border-t-0 lg:pt-0")}>
            <SectionHeading
              title={await tServer("Account")}
              divider
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
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
            </div>
          </section>

          {/* ---- Privacy & safety ---- */}
          <section className={SETTINGS_SECTION}>
            <SectionHeading
              title={await tServer("Privacy & safety")}
              divider
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
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
            </div>
          </section>

          {/* ---- Help & support ---- */}
          <section className={SETTINGS_SECTION}>
            <SectionHeading
              title={await tServer("Help & support")}
              divider
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
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
            </div>
          </section>

          {/* ---- About & legal ---- */}
          <section className={SETTINGS_SECTION}>
            <SectionHeading
              title={await tServer("About & legal")}
              divider
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
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
            </div>
          </section>

          {/* ---- Session ---- */}
          <section className={SETTINGS_SECTION}>
            <SectionHeading
              title={await tServer("Session")}
              divider
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
              <form action={signOutAction}>
                {/* tracking-normal: size="sm" brings the CTA face's tracking-wide
                    and this button never had it (HEAD: no tracking utility).
                    Same call as notifications:134 and BlockButton — the sweep
                    stays a no-op. */}
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="gap-2 tracking-normal"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  {await tServer("Sign out")}
                </Button>
              </form>
            </div>
          </section>

          {/* ---- Danger zone ---- */}
          <section className={SETTINGS_SECTION}>
            <SectionHeading
              title={await tServer("Danger zone")}
              divider
              tone="danger"
              className={`mb-4 lg:mb-0 ${SETTINGS_HEADING}`}
            />
            <div className="min-w-0">
              <Card tone="danger">
                <p className="text-sm text-ink mb-5 max-w-lg leading-relaxed">
                  {await tServer(
                    "Permanently delete your account and all of your data.",
                  )}
                </p>
                <DeleteAccountForm />
              </Card>
            </div>
          </section>
        </div>
      )}
    </Section>
  );
}
