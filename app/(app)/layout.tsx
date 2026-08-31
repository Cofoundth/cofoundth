import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { AppSidebar } from "@/components/AppSidebar";
import { AppFooter } from "@/components/AppFooter";
import { IncompleteProfileBanner } from "@/components/IncompleteProfileBanner";

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
    .select("onboarded, profile_complete, account_type")
    .eq("id", user.id)
    .single();

  const pathname = (await headers()).get("x-pathname") ?? "";

  // Conversation views are full-height by design: they own the viewport and
  // scroll internally. A marketing-style footer underneath just adds a strip of
  // page scroll below a pane that is already exactly one screen tall, so these
  // routes drop it and take the full height instead.
  const isConversation =
    pathname.startsWith("/messages/") || pathname.endsWith("/chat");

  // Investors are funding actors + read-first community members: they can reach
  // funding, the community feed, the founder directory, profiles, and settings.
  // Everything else (dashboard, B2B/orgs, connections/DMs) — and posting a new
  // thread — bounces to /funding. Writes are also blocked server-side.
  const isInvestor = profile?.account_type === "investor";

  if (isInvestor) {
    const readable =
      pathname === "/investor" ||
      pathname === "/funding" ||
      pathname.startsWith("/funding/") ||
      pathname === "/community" ||
      (pathname.startsWith("/community/") &&
        !pathname.startsWith("/community/new")) ||
      // Meetups: same read-first terms as the community feed. Investors can see
      // what is happening; RSVPing is a write and stays closed to them (also
      // enforced server-side in app/(app)/meetups/actions.ts).
      pathname === "/meetups" ||
      pathname.startsWith("/meetups/") ||
      // Companies: investors browse the company directory + profiles (read), but
      // not the founder-to-founder B2B actions (create / propose / chat).
      pathname === "/orgs" ||
      (pathname.startsWith("/orgs/") &&
        !pathname.startsWith("/orgs/new") &&
        !pathname.endsWith("/propose") &&
        !pathname.endsWith("/chat")) ||
      pathname.startsWith("/profile/") ||
      pathname === "/settings";
    if (!readable) redirect("/funding");
  } else if (!profile?.onboarded) {
    // New founders must finish their profile before using the app.
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* First tab stop on every app page: lets keyboard users jump the ~8-item
          nav instead of tabbing through it on each navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-cream focus:text-navy focus:border focus:border-navy focus:px-4 focus:py-2 focus:text-sm focus:tracking-wide"
      >
        {await tServer("Skip to content")}
      </a>
      {/* Persistent left rail on desktop, slim top bar on mobile. */}
      <AppSidebar />
      <div className="lg:pl-64 min-h-[calc(100vh-4rem)] lg:min-h-screen flex flex-col">
        <main id="main" className="flex-1">
          <IncompleteProfileBanner
            complete={isInvestor || !!profile?.profile_complete}
          />
          {children}
        </main>
        {!isConversation && <AppFooter />}
      </div>
    </div>
  );
}
