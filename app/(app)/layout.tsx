import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
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

  // Investors are funding actors + read-first community members: they can reach
  // funding, the community feed, the founder directory, profiles, and settings.
  // Everything else (dashboard, B2B/orgs, connections/DMs) — and posting a new
  // thread — bounces to /funding. Writes are also blocked server-side.
  if (profile?.account_type === "investor") {
    const readable =
      pathname === "/funding" ||
      pathname.startsWith("/funding/") ||
      pathname === "/community" ||
      (pathname.startsWith("/community/") &&
        !pathname.startsWith("/community/new")) ||
      pathname === "/browse" ||
      pathname.startsWith("/profile/") ||
      pathname === "/settings";
    if (!readable) redirect("/funding");
  } else if (!profile?.onboarded) {
    // New founders must finish their profile before using the app.
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <AppHeader />
      <main className="flex-1">
        <IncompleteProfileBanner complete={!!profile?.profile_complete} />
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
