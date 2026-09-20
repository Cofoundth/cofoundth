import type { ReactNode } from "react";
import { tServer } from "@/lib/i18n-server";
import { AppSidebar } from "@/components/AppSidebar";
import { AppFooter } from "@/components/AppFooter";

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
// the app's layout rules (py-14 rhythm, flat text-d2 titles, three-up grids at
// xl) without editing each page — see the "public page inside the app shell"
// block there.
export async function AppShell({
  children,
  banner,
  footer = true,
  surface = "app",
}: {
  children: ReactNode;
  /** Rendered at the top of <main>, above the page (IncompleteProfileBanner). */
  banner?: ReactNode;
  /** False on full-height conversation views. */
  footer?: boolean;
  surface?: "app" | "public";
}) {
  return (
    <div className="min-h-screen bg-cream">
      {/* First tab stop on every signed-in page: lets keyboard users jump the
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
        <main
          id="main"
          className="flex-1"
          data-shell={surface === "public" ? "public" : undefined}
        >
          {banner}
          {children}
        </main>
        {footer && <AppFooter />}
      </div>
    </div>
  );
}
