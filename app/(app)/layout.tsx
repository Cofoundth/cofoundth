import { redirect } from "next/navigation";
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
    .select("onboarded, profile_complete")
    .eq("id", user.id)
    .single();

  // New users must finish their profile before using the app.
  if (!profile?.onboarded) {
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
