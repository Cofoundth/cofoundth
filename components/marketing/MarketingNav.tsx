import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import { MobileMenu } from "@/components/MobileMenu";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";

// Auth-aware nav for public pages: logged-in members get the app navbar (so
// public content like /insights and /legal-templates feels in-app), logged-out
// visitors get the minimal landing nav focused on signup.
export async function MarketingNav() {
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, photo_url, slug")
      .eq("id", user.id)
      .single();
    const myProfileHref = `/profile/${(profile?.slug as string | undefined) ?? user.id}`;
    const navItems = [
      { href: "/dashboard", label: tr("Dashboard") },
      { href: "/community", label: tr("Community") },
      { href: "/browse", label: tr("Founders") },
      { href: "/matches", label: tr("Connections") },
      { href: "/insights", label: tr("Insights") },
      { href: "/legal-templates", label: tr("Legal") },
    ];
    const signOut = (
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full text-center py-2.5 border border-line text-ink hover:border-navy tracking-wide text-sm"
        >
          {tr("Sign out")}
        </button>
      </form>
    );

    return (
      <header className="bg-white border-b border-line relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 lg:gap-8">
              <MobileMenu
                className="lg:hidden"
                links={navItems}
                footer={signOut}
              />
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5"
              >
                <BrandMark size="sm" />
                <Wordmark className="text-base" />
              </Link>
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="px-4 py-2 text-sm text-ink hover:text-navy tracking-wide"
                  >
                    {i.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                href={myProfileHref}
                title={tr("Your profile")}
                className="hover:opacity-80 transition-opacity"
              >
                <Avatar
                  name={profile?.full_name ?? user.email}
                  url={profile?.photo_url}
                  size="sm"
                />
              </Link>
              <form action={signOutAction} className="hidden lg:block">
                <button
                  type="submit"
                  className="text-sm text-ink-muted hover:text-navy tracking-wide"
                >
                  {tr("Sign out")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Logged-out: minimal landing nav (logo + auth).
  return (
    <nav className="bg-white border-b border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="md" />
            <div className="text-left">
              <Wordmark />
              <div className="text-[10px] text-ink-muted uppercase tracking-[0.2em] mt-1">
                {tr("Est. 2026 · Bangkok")}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm text-ink hover:text-navy tracking-wide"
            >
              {tr("Sign in")}
            </Link>
            <Link
              href="/signup"
              className="px-4 sm:px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors whitespace-nowrap"
            >
              {tr("Join Cofoundee")}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
