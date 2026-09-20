import { getUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

// Signed in: the same app shell as every app route (rail, mobile bar, footer),
// so a member never switches menus by opening a public page. Deliberately NONE
// of the (app) layout's gates — public pages stay readable to a founder who has
// not finished onboarding, and to investors. No IncompleteProfileBanner either:
// it would cost a profile read on every public page, and for a founder who has
// not onboarded its /settings CTA points at the wrong door. Every app route
// already carries it.
//
// Logged out: exactly the marketing header and footer, unchanged.
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (user) {
    return <AppShell surface="public">{children}</AppShell>;
  }
  return (
    <>
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </>
  );
}
