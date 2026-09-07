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
import { SidebarNav } from "@/components/SidebarNav";

// App chrome, Onfound-style: a persistent left rail on desktop, a slim top bar
// on mobile. Public/marketing pages keep the horizontal AppHeader — the same
// split their product uses (marketing site = top nav, product = sidebar).
export async function AppSidebar() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, photo_url, slug, is_admin, account_type")
    .eq("id", user.id)
    .single();
  // Founders land on the My Profile hub (identity, stats, account door) —
  // the public view is one row inside it. Investors keep their own home.
  const myProfileHref =
    profile?.account_type === "investor" ? "/investor" : "/profile";

  // "Acting as" company switcher — only meaningful when in >1 company, and it
  // is company chrome, so it hides for the meetups soft launch along with the
  // Companies nav above: a combobox of company names has nothing to point at in
  // a rail with no company surface left in it.
  //
  // The flag gates the READS too, not just the render. These are org_members
  // round-trips on every app page render for every signed-in user, and while
  // the flag is off nothing consumes the result. /orgs keeps working by direct
  // URL regardless — it calls getActiveOrgId itself, which falls back to the
  // earliest-joined org when no cookie has been set.
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

  // Meetups sits directly under Dashboard in the FOUNDER nav: it is the surface
  // the soft launch is about, and the two navs used to disagree with each other
  // about where it went (this one had it after Founders, AppHeader had it
  // before) — that was drift, not a decision. Both are on this order now.
  // Investors have no Dashboard, so "below Dashboard" has nothing to mean for
  // them; their order is untouched.
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
        {
          href: "/meetups",
          label: await tServer("Meetups"),
          // Equally new to investors — only the ORDER above is founder-specific.
          ...(FEATURES.meetupsNew ? { tag: await tServer("New") } : {}),
        },
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
        // flag puts them back exactly here. Investors keep theirs above.
        ...(FEATURES.companies
          ? [{ href: "/orgs", label: await tServer("Companies") }]
          : []),
        ...(FEATURES.funding
          ? [{ href: "/funding", label: await tServer("Funding") }]
          : []),
        { href: "/activity", label: await tServer("Profile insights") },
      ];
  if (
    isAdmin({
      email: user.email,
      isAdminFlag: profile?.is_admin as boolean | null,
    })
  ) {
    navItems.push({ href: "/admin/overview", label: await tServer("Admin") });
  }

  const signOutLabel = await tServer("Sign out");
  const profileLabel = await tServer("Your profile");

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-30 flex-col bg-white border-r border-line">
        <div className="px-5 h-16 flex items-center shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <Wordmark className="text-base" />
          </Link>
        </div>

        <SidebarNav items={navItems} />

        <div className="shrink-0 border-t border-line p-3 space-y-3">
          {/* Hidden for the meetups soft launch — company chrome. The reads
              above are gated on the same flag, so this is off, not just empty. */}
          {FEATURES.companies && activeOrgId && (
            <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} />
          )}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell
              items={notifItems}
              unreadCount={unreadNotifs ?? 0}
              placement="up-right"
            />
          </div>
          <Link
            href={myProfileHref}
            title={profileLabel}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-cream transition-colors"
          >
            <Avatar
              name={profile?.full_name ?? user.email}
              url={profile?.photo_url}
              size="sm"
            />
            <span className="text-sm text-ink truncate">
              {profile?.full_name ?? user.email}
            </span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-left px-2 py-2 text-sm text-ink-muted hover:text-navy tracking-wide"
            >
              {signOutLabel}
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-line">
        <div className="px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileMenu
              className="lg:hidden"
              links={navItems}
              footer={
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full text-center py-2.5 border border-line text-ink hover:border-navy tracking-wide text-sm"
                  >
                    {signOutLabel}
                  </button>
                </form>
              }
            />
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <Wordmark className="text-base hidden sm:inline" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/* Hidden for the meetups soft launch — same gate as the rail. */}
            {FEATURES.companies && activeOrgId && (
              <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} />
            )}
            <LanguageSwitcher />
            <NotificationBell
              items={notifItems}
              unreadCount={unreadNotifs ?? 0}
            />
            <Link href={myProfileHref} title={profileLabel}>
              <Avatar
                name={profile?.full_name ?? user.email}
                url={profile?.photo_url}
                size="sm"
              />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
