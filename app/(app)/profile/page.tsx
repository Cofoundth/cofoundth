// My Profile — the reference app's /profile: identity at the top, the
// account door right under it, your numbers, then the way out to the public
// view. This is a HUB, not a second renderer of the profile — the full
// section content lives on the public page one row away, so it can never
// drift out of sync with what other founders actually see.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bookmark,
  ChevronRight,
  Eye,
  Pencil,
  Rocket,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parseAccountRole } from "@/lib/roles";
import { requireUser } from "@/lib/auth";
import { getBlockedIds } from "@/lib/blocking";
import { t } from "@/lib/i18n";
import { tServer, getLocale } from "@/lib/i18n-server";
import { STAGE_LABELS } from "@/lib/matching";
import { provinceLabel } from "@/lib/provinces";
import { msAgoISO, DAY_MS } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { Card, Section, StageEmblem } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, slug, full_name, photo_url, location, stage, account_type, onboarded",
    )
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/onboarding");
  const role = parseAccountRole(profile.account_type);
  if (role === "investor") redirect("/investor");

  // AN EXPLORER LANDS HERE TOO — /profile is on their route allowlist — and
  // everything below this block was written for exactly one reader. They have
  // no founder profile and never will: no stage, no pitch, no directory entry,
  // and no public page at all (lib/public-profile.ts pins account_type =
  // 'founder', so /profile/<their slug> is a clean 404). Hosted meetups,
  // profile views, connections and saved founders are all structurally zero.
  //
  // So the founder half is DROPPED rather than rendered empty, and the four
  // stat queries below are never run for them. The identity row is written out
  // again here instead of shared: it is a different card — no StageEmblem, and
  // the way out goes to the shelf rather than to a public profile that does not
  // exist. Keeping them apart is what stops a founder-only number reappearing
  // on this surface the next time the hub grows a row.
  if (role === "explorer") {
    const explorerRow =
      "flex items-center justify-between gap-3 p-4 text-sm text-ink hover:bg-cream transition-colors";
    return (
      <Section width="narrow">
        <div className="mb-8">
          <h1 className="text-d2 mb-2">{await tServer("My Profile")}</h1>
          <p className="text-sm text-ink-muted">
            {await tServer(
              "Your account. In the community you show up as a commenter and a meetup guest.",
            )}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex items-center gap-4">
            <Avatar
              name={profile.full_name as string}
              url={profile.photo_url as string | null}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl">
                <span className="truncate">
                  {(profile.full_name as string) ?? "—"}
                </span>
              </h2>
              {profile.location ? (
                <div className="text-xs text-ink-muted mt-1">
                  {provinceLabel(profile.location as string, locale)}
                </div>
              ) : null}
            </div>
            <Link
              href="/settings"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm text-ink border border-line hover:border-navy transition-colors rounded-full"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              {await tServer("Edit")}
            </Link>
          </Card>

          <Card padding="none" className="divide-y divide-line overflow-hidden">
            <Link href="/settings?tab=account" className={explorerRow}>
              <span className="inline-flex items-center gap-2 min-w-0">
                <SettingsIcon
                  className="w-4 h-4 text-gold-ink shrink-0"
                  strokeWidth={1.5}
                />
                {await tServer("Account settings")}
              </span>
              <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
            </Link>
            <Link href="/products" className={explorerRow}>
              <span className="inline-flex items-center gap-2 min-w-0">
                <Rocket
                  className="w-4 h-4 text-gold-ink shrink-0"
                  strokeWidth={1.5}
                />
                {await tServer("Try what the community built")}
              </span>
              <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
            </Link>
          </Card>
        </div>
      </Section>
    );
  }

  const publicHref = `/profile/${profile.slug ?? profile.id}`;
  const since = msAgoISO(30 * DAY_MS);

  // Distinct viewers over 30 days — the SAME query /activity runs, down to the
  // client, the ordering and the 100-row limit, because these two numbers sit
  // one tap apart and any difference reads as a bug. Saves-of-me stays on
  // /activity (it needs service role); the saved count HERE is MY saved list,
  // RLS-readable.
  const blocked = await getBlockedIds(user.id);
  const [
    { count: hostedCount },
    { data: viewRows },
    { data: matchRows },
    { count: savedCount },
  ] = await Promise.all([
    supabase
      .from("meetups")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("profile_views")
      .select("viewer_id, viewed_at")
      .eq("viewed_id", user.id)
      .gte("viewed_at", since)
      .order("viewed_at", { ascending: false })
      .limit(100),
    // Rows, not a count: blocked pairs are dropped in JS (the reverse
    // direction of a block is RLS-invisible), and /matches hides them from the
    // list — so a raw count would send the user to a list one short.
    supabase
      .from("matches")
      .select("id, profile_a_id, profile_b_id")
      .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`),
    supabase
      .from("profile_saves")
      .select("profile_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  const viewerCount = new Set(
    (viewRows ?? [])
      .map((v) => v.viewer_id as string)
      .filter((id) => id && id !== user.id && !blocked.has(id)),
  ).size;
  const matchCount = (matchRows ?? []).filter((m) => {
    const other =
      (m.profile_a_id as string) === user.id
        ? (m.profile_b_id as string)
        : (m.profile_a_id as string);
    return !blocked.has(other);
  }).length;

  const stageLabel =
    profile.stage && STAGE_LABELS[profile.stage as string]
      ? t(STAGE_LABELS[profile.stage as string], locale)
      : "";

  const stats: { n: number; label: string; href: string }[] = [
    {
      n: hostedCount ?? 0,
      label: await tServer("Meetups hosted"),
      href: "/meetups",
    },
    {
      n: viewerCount,
      label: await tServer("Profile views"),
      href: "/activity",
    },
    {
      n: matchCount,
      label: await tServer("Connections"),
      href: "/matches",
    },
    {
      n: savedCount ?? 0,
      label: await tServer("Saved founders"),
      href: "/browse?tab=saved",
    },
  ];

  const row =
    "flex items-center justify-between gap-3 p-4 text-sm text-ink hover:bg-cream transition-colors";

  return (
    <Section width="narrow">
      <div className="mb-8">
        <h1 className="text-d2 mb-2">{await tServer("My Profile")}</h1>
        <p className="text-sm text-ink-muted">
          {await tServer("This is how other founders see you")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Identity */}
        <Card className="flex items-center gap-4">
          <Avatar
            name={profile.full_name as string}
            url={profile.photo_url as string | null}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl flex items-center gap-2.5 flex-wrap min-w-0">
              <span className="truncate">
                {(profile.full_name as string) ?? "—"}
              </span>
              <StageEmblem
                stage={profile.stage as string | null}
                label={stageLabel}
              />
            </h2>
            {profile.location ? (
              <div className="text-xs text-ink-muted mt-1">
                {provinceLabel(profile.location as string, locale)}
              </div>
            ) : null}
          </div>
          <Link
            href="/settings"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm text-ink border border-line hover:border-navy transition-colors rounded-full"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            {await tServer("Edit")}
          </Link>
        </Card>

        {/* Account settings */}
        <Card padding="none" className="divide-y divide-line overflow-hidden">
          <Link href="/settings?tab=account" className={row}>
            <span className="inline-flex items-center gap-2 min-w-0">
              <SettingsIcon
                className="w-4 h-4 text-gold-ink shrink-0"
                strokeWidth={1.5}
              />
              {await tServer("Account settings")}
            </span>
            <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
          </Link>
        </Card>

        {/* Stats. The Link wraps the Card rather than the other way round —
            Card is a plain div with no `as`/`href`, and the whole tile has to
            be the hit target. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
              <Card hoverable padding="sm" className="text-center">
                <div className="font-serif text-num1 text-navy tabular-nums">
                  {s.n}
                </div>
                <div className="text-xs text-ink-muted mt-2">{s.label}</div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Saved founders */}
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-navy mb-2">
            <Bookmark className="w-4 h-4 text-gold-ink" strokeWidth={1.5} />
            {await tServer("Saved founders")}
          </div>
          <p className="text-sm text-ink-muted leading-relaxed mb-4 max-w-lg">
            {await tServer(
              "Tap the heart on any profile to keep founders you want to come back to.",
            )}
          </p>
          <Link
            href="/browse?tab=saved"
            className="inline-flex items-center gap-1.5 text-sm text-navy hover:text-gold-ink tracking-wide"
          >
            {await tServer("Open saved list")}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Card>

        {/* Public view */}
        <Card padding="none" className="divide-y divide-line overflow-hidden">
          <Link href={publicHref} className={row}>
            <span className="inline-flex items-center gap-2 min-w-0">
              <UserRound
                className="w-4 h-4 text-gold-ink shrink-0"
                strokeWidth={1.5}
              />
              {await tServer("View public profile")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted shrink-0">
              <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </Card>
      </div>
    </Section>
  );
}
