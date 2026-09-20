import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { IncompleteProfileBanner } from "@/components/IncompleteProfileBanner";
import {
  isInvestorReadableRoute,
  INVESTOR_HOME,
} from "@/lib/investor-routes";

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
    // Defence in depth only — the REAL gate is proxy.ts. A layout redirect does
    // not fire on client-side navigation, because Next does not re-render a
    // shared layout between sibling routes. Same allowlist, one definition, so
    // the two cannot drift apart.
    if (!isInvestorReadableRoute(pathname)) redirect(INVESTOR_HOME);
  } else if (!profile?.onboarded) {
    // New founders must finish their profile before using the app.
    redirect("/onboarding");
  }

  // Gates above, chrome below. The chrome is shared with signed-in marketing
  // routes (app/(marketing)/layout.tsx) through AppShell; the gates are not.
  return (
    <AppShell
      footer={!isConversation}
      banner={
        <IncompleteProfileBanner
          complete={isInvestor || !!profile?.profile_complete}
        />
      }
    >
      {children}
    </AppShell>
  );
}
