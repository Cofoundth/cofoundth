import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
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
  const myProfileHref =
    profile?.account_type === "investor"
      ? "/investor"
      : `/profile/${(profile?.slug as string | undefined) ?? user.id}`;

  const myOrgs = await getUserOrgs(supabase, user.id);
  const activeOrgId =
    myOrgs.length > 1 ? await getActiveOrgId(supabase, user.id) : null;

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

  const isInvestor = profile?.account_type === "investor";
  const navItems: { href: string; label: string; badge?: number }[] = isInvestor
    ? [
        { href: "/funding", label: await tServer("Funding") },
        { href: "/community", label: await tServer("Community") },
        { href: "/meetups", label: await tServer("Meetups") },
        { href: "/orgs", label: await tServer("Companies") },
      ]
    : [
        { href: "/dashboard", label: await tServer("Dashboard") },
        { href: "/community", label: await tServer("Community") },
        { href: "/browse", label: await tServer("Founders") },
        { href: "/meetups", label: await tServer("Meetups") },
        {
          href: "/matches",
          label: await tServer("Connections"),
          badge: (receivedPending ?? 0) + (unreadMessages ?? 0),
        },
        { href: "/orgs", label: await tServer("Companies") },
        { href: "/funding", label: await tServer("Funding") },
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
          {activeOrgId && <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} />}
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
            {activeOrgId && <OrgSwitcher orgs={myOrgs} activeId={activeOrgId} />}
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
