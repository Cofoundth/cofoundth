import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { tServer } from "@/lib/i18n-server";
import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE } from "@/lib/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarFrame } from "@/components/SidebarState";

// The signed-in chrome, ONE copy. Rendered by app/(app)/layout.tsx for every
// app route AND by app/(marketing)/layout.tsx for a signed-in visitor, so a
// member never bounces between two menus. Before this, public pages had their
// own horizontal AppHeader with a hand-maintained second nav array, which had
// already drifted from the rail once.
//
// Chrome only — no gates. The (app) layout keeps its auth / onboarding /
// investor redirects and runs them BEFORE handing its children here; public
// pages must stay readable to a founder mid-onboarding and to investors, so the
// marketing layout calls this without any.
//
// `surface="public"` marks a marketing page rendered inside the shell. The
// data-shell="public" attribute is what globals.css keys off to put those pages on
// the app's layout rules (py-14 rhythm, flat text-d2 titles) without editing
// each page — see the "public page inside the app shell" block there. Card
// grids need no remap any more: with the 64px icon rail from 768px, app and
// marketing grids both go three-up at lg.
//
// The rail (lib/sidebar.ts has the full map): none below 768px, a 64px icon
// rail at 768-1279px, and from 1280px 256px or 64px per the member's cookie.
// The cookie is read HERE, on the server, and the rest is CSS breakpoints, so
// the very first paint already has the right rail width and content offset at
// every width — no flash, and the client hydrates the same data-sidebar value.
//
// NO FOOTER. A signed-in page ends where its content ends: the copyright line
// and social icons are marketing furniture, and the legal links a member must
// always be able to reach live in the rail (expanded / overlay) and the phone
// menu instead — see AppSidebar. Logged out, MarketingFooter is unchanged.
export async function AppShell({
  children,
  banner,
  surface = "app",
}: {
  children: ReactNode;
  /** Rendered at the top of <main>, above the page (IncompleteProfileBanner). */
  banner?: ReactNode;
  surface?: "app" | "public";
}) {
  const collapsed =
    (await cookies()).get(SIDEBAR_COOKIE)?.value === SIDEBAR_COLLAPSED;
  return (
    <SidebarFrame initialCollapsed={collapsed} className="min-h-screen bg-cream">
      {/* First tab stop on every signed-in page: lets keyboard users jump the
          nav instead of tabbing through it on each navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-cream focus:text-navy focus:border focus:border-navy focus:px-4 focus:py-2 focus:text-sm focus:tracking-wide"
      >
        {await tServer("Skip to content")}
      </a>
      {/* Left rail from 768px, slim top bar below it. */}
      <AppSidebar />
      {/* Follows the rail actually on screen: 64px at 768-1279 (the overlay
          drawer floats OVER the page and adds nothing), 256px from 1280, and
          64px again when collapsed there (`rail-collapsed:` carries both
          breakpoints, and its rules land after xl:pl-64). Same duration and
          easing as the rail's width, so the two edges move together. */}
      <div className="md:pl-16 xl:pl-64 rail-collapsed:pl-16 transition-[padding-left] duration-200 ease-out motion-reduce:transition-none">
        <main
          id="main"
          data-shell={surface === "public" ? "public" : undefined}
        >
          {banner}
          {children}
        </main>
      </div>
    </SidebarFrame>
  );
}
