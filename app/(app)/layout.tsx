import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import { signOutAction } from "../(auth)/actions";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import { NotificationBell, type NotifItem } from "@/components/NotificationBell";
import { MobileMenu } from "@/components/MobileMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, photo_url, slug, onboarded")
    .eq("id", user.id)
    .single();

  // New users must finish their profile before using the app.
  if (!profile?.onboarded) {
    redirect("/onboarding");
  }

  const myProfileHref = `/profile/${(profile?.slug as string | undefined) ?? user.id}`;

  // Connections dot (best-effort, exact counts not shown) + notification feed.
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

  // Hydrate actor profiles (avatar / name / slug) for the notification list.
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
  const actorMap = new Map(
    (actorRows ?? []).map((a) => [a.id as string, a]),
  );
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
      data: (n.data as { actor_name?: string; post_title?: string }) ?? null,
      readAt: (n.read_at as string | null) ?? null,
      createdAt: n.created_at as string,
      actor,
    };
  });

  const navItems: { href: string; label: string; badge?: number }[] = [
    { href: "/dashboard", label: await tServer("Dashboard") },
    { href: "/community", label: await tServer("Community") },
    { href: "/browse", label: await tServer("Founders") },
    {
      href: "/matches",
      label: await tServer("Connections"),
      badge: (receivedPending ?? 0) + (unreadMessages ?? 0),
    },
  ];
  if (isAdminEmail(user.email)) {
    navItems.push({ href: "/admin/insights", label: await tServer("Admin") });
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-white border-b border-line relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 md:gap-8">
              <MobileMenu
                className="md:hidden"
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
                <Wordmark className="text-base" />
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="/dashboard">{await tServer("Dashboard")}</NavLink>
                <NavLink href="/community">{await tServer("Community")}</NavLink>
                <NavLink href="/browse">
                  {await tServer("Founders")}
                </NavLink>
                {/* B2B parked until Phase 3 — community-first focus.
                <NavLink href="/companies">
                  {await tServer("Companies")}
                </NavLink>
                */}
                {/* Interests + Chat merged into one "Connections" inbox. */}
                <NavLink
                  href="/matches"
                  badge={(receivedPending ?? 0) + (unreadMessages ?? 0)}
                >
                  {await tServer("Connections")}
                </NavLink>
                {isAdminEmail(user.email) && (
                  <NavLink href="/admin/insights">
                    {await tServer("Admin")}
                  </NavLink>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <NotificationBell
                items={notifItems}
                unreadCount={unreadNotifs ?? 0}
                currentUserId={user.id}
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
              <form action={signOutAction} className="hidden md:block">
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

      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative px-4 py-2 text-sm text-ink hover:text-navy tracking-wide"
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] bg-gold text-white inline-flex items-center justify-center font-medium">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
