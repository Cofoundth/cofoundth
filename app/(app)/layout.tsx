import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { signOutAction } from "../(auth)/actions";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";

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
    .select("full_name, photo_url")
    .eq("id", user.id)
    .single();

  // Notification dots (best-effort, exact counts not shown)
  const [{ count: receivedPending }, { count: unreadMessages }] =
    await Promise.all([
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
    ]);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <BrandMark size="sm" />
                <Wordmark className="text-base" />
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/browse">Browse</NavLink>
                <NavLink href="/interests" badge={receivedPending ?? 0}>
                  Interests
                </NavLink>
                <NavLink href="/matches" badge={unreadMessages ?? 0}>
                  Chat
                </NavLink>
                <NavLink href="/community">Community</NavLink>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                href={`/profile/${user.id}`}
                title="Your profile"
                className="hover:opacity-80 transition-opacity"
              >
                <Avatar
                  name={profile?.full_name ?? user.email}
                  url={profile?.photo_url}
                  size="sm"
                />
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-sm text-ink-muted hover:text-navy tracking-wide"
                >
                  Sign out
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
