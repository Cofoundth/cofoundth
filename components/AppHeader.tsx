import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { FEATURES } from "@/lib/features";
import { tServer } from "@/lib/i18n-server";
import { signOutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import { NotificationBell, type NotifItem } from "@/components/NotificationBell";
import { MobileMenu } from "@/components/MobileMenu";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { getUserOrgs, getActiveOrgId } from "@/lib/active-org";

// The marketing header for logged-in visitors, rendered by MarketingNav, so
// public content (insights/legal) and the app share the same navbar. The (app)
// shell itself uses AppSidebar — this is no longer mounted there.
export async function AppHeader() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, photo_url, slug, is_admin, account_type")
    .eq("id", user.id)
    .single();
  const myProfileHref =
    profile?.account_type === "investor"
      ? "/investor"
      : `/profile/${(profile?.slug as string | undefined) ?? user.id}`;

  // "Acting as" company switcher — only meaningful when in >1 company, and
  // hidden for the meetups soft launch with the Companies nav below it: this
  // header is what a signed-in founder sees on marketing routes, so it has to
  // hide the switcher for the same reason AppSidebar does.
  //
  // The flag gates the READS too, not just the render — two org_members
  // round-trips nothing consumes while it is off. /orgs still works by direct
  // URL: it calls getActiveOrgId itself, which falls back to the earliest-joined
  // org when no cookie has been set.
  const myOrgs = FEATURES.companies ? await getUserOrgs(supabase, user.id) : [];
  const activeOrgId =
    FEATURES.companies && myOrgs.length > 1
      ? await getActiveOrgId(supabase, user.id)
      : null;

  const [
    { count: receivedPending },
    { count: unreadMessages },
    { count: unreadNotifs },
    { data: notifRows },
  ] = await Promise.all([
    supabase
      .from("interests")
      .select("id", { count: "exact", head: true })
      .eq("to_profile_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id, type, entity_id, data, read_at, created_at, actor_id")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const actorIds = [
    ...new Set(
      (notifRows ?? [])
        .map((n) => n.actor_id as string | null)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: actorRows } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, photo_url, full_name")
        .in("id", actorIds)
    : { data: [] as { id: string }[] };
  const actorMap = new Map((actorRows ?? []).map((a) => [a.id as string, a]));
  const notifItems: NotifItem[] = (notifRows ?? []).map((n) => {
    const actor = n.actor_id
      ? (actorMap.get(n.actor_id as string) as
          | {
              id: string;
              slug: string | null;
              photo_url: string | null;
              full_name: string | null;
            }
          | undefined) ?? null
      : null;
    return {
      id: n.id as string,
      type: n.type as string,
      entityId: (n.entity_id as string | null) ?? null,
      data:
        (n.data as { actor_name?: string; post_title?: string; slug?: string }) ??
        null,
      readAt: (n.read_at as string | null) ?? null,
      createdAt: n.created_at as string,
      actor,
    };
  });

  // Investors are funding actors + read-only community members (the layout
  // bounces them off founder-only pages). Their nav is funding + the read
  // surfaces they're allowed on.
  //
  // Meetups sits directly under Dashboard in the FOUNDER nav, matching
  // AppSidebar. The two used to disagree — this file had Meetups before
  // Founders, the rail had it after — which was drift, not a decision, so one
  // person could see two different navs depending on whether they were on a
  // marketing route. Investors have no Dashboard here, so their order stands.
  const isInvestor = profile?.account_type === "investor";
  const navItems: {
    href: string;
    label: string;
    badge?: number;
    tag?: string;
  }[] = isInvestor
    ? [
        { href: "/funding", label: await tServer("Funding") },
        { href: "/community", label: await tServer("Community") },
        { href: "/orgs", label: await tServer("Companies") },
      ]
    : [
        { href: "/dashboard", label: await tServer("Dashboard") },
        {
          href: "/meetups",
          label: await tServer("Meetups"),
          // Launch marker, not a surface gate: the item renders either way.
          ...(FEATURES.meetupsNew ? { tag: await tServer("New") } : {}),
        },
        { href: "/community", label: await tServer("Community") },
        { href: "/browse", label: await tServer("Founders") },
        {
          href: "/matches",
          label: await tServer("Connections"),
          badge: (receivedPending ?? 0) + (unreadMessages ?? 0),
        },
        // Hidden for the meetups soft launch, kept in place so flipping the
        // flag puts them back exactly here. This header is what a signed-in
        // founder sees on marketing routes, so it has to hide them too —
        // AppSidebar only covers the (app) shell.
        ...(FEATURES.companies
          ? [{ href: "/orgs", label: await tServer("Companies") }]
          : []),
        ...(FEATURES.funding
          ? [{ href: "/funding", label: await tServer("Funding") }]
          : []),
      ];
  if (
    isAdmin({
      email: user.email,
      isAdminFlag: profile?.is_admin as boolean | null,
    })
  ) {
    navItems.push({ href: "/admin/overview", label: await tServer("Admin") });
  }

  // Sticky, not relative. MobileMenu's panel is `absolute top-full`, so it is
  // anchored to this element: a static header scrolls away and takes the open
  // menu with it. AppSidebar's mobile bar is sticky for the same reason, which
  // is why the menu only detached on marketing pages.
  return (
    <header className="bg-white border-b border-line sticky top-0 z-40">
      {/* 1120 to sit flush with the marketing section container below it. */}
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 xl:gap-8">
            {/* The horizontal nav needs xl, not lg: eight Thai labels plus the
                language/bell/avatar/sign-out cluster wrap mid-word at 1024. */}
            <MobileMenu
              className="xl:hidden"
              links={navItems}
              footer={
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full text-center py-2.5 border border-line text-ink hover:border-navy tracking-wide text-sm"
                  >
                    {await tServer("Sign out")}
                  </button>
                </form>
              }
            />
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <Wordmark className="text-base hidden sm:inline" />
            </Link>
            <nav className="hidden xl:flex items-center gap-1">
              {navItems.map((i) => (
                <NavLink key={i.href} href={i.href} badge={i.badge} tag={i.tag}>
                  {i.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Hidden for the meetups soft launch — company chrome. The reads
                above are gated on the same flag, so this is off, not just
                empty. */}
            {FEATURES.companies && activeOrgId && (
              <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} />
            )}
            <LanguageSwitcher />
            <NotificationBell
              items={notifItems}
              unreadCount={unreadNotifs ?? 0}
            />
            <Link
              href={myProfileHref}
              title={await tServer("Your profile")}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar
                name={profile?.full_name ?? user.email}
                url={profile?.photo_url}
                size="sm"
              />
            </Link>
            <form action={signOutAction} className="hidden xl:block">
              <button
                type="submit"
                className="text-sm text-ink-muted hover:text-navy tracking-wide"
              >
                {await tServer("Sign out")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  badge,
  tag,
}: {
  href: string;
  children: React.ReactNode;
  badge?: number;
  /** ALREADY translated, like the label. A word ("New"), not a count. */
  tag?: string;
}) {
  return (
    <Link
      href={href}
      className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-ink hover:bg-cream tracking-wide whitespace-nowrap transition-colors"
    >
      {children}
      {tag && (
        // INLINE, not the badge's `absolute top-1 -right-1`: that offset is cut
        // for a two-character numeric pill, and a word hangs off the link box.
        //
        // 12px rather than the badge's 11px — that tier is Latin-and-digits
        // only, and this word is "ใหม่" in the default locale, where 12px is
        // the floor for translatable text. No uppercase/tracking (Thai has
        // neither, and globals.css strips tracking under lang="th"), so
        // font-medium carries the emphasis. No active state exists in this
        // horizontal nav, so the chip is always the gold surface here.
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gold text-navy shrink-0">
          {tag}
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
