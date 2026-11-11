"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  ChartColumn,
  Circle,
  HandCoins,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Newspaper,
  Package,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { RAIL_TIP } from "@/lib/sidebar";

export type SidebarNavItem = {
  href: string;
  /** ALREADY translated by the server component that renders this. */
  label: string;
  badge?: number;
  /**
   * A word-shaped marker ("New") rather than a count — ALREADY translated, the
   * same as `label`. Nothing carries both `tag` and `badge` today, but the type
   * does not forbid it; the render puts the tag first if it ever happens.
   */
  tag?: string;
};

// The rail's nav links, as a CLIENT component purely so the active item can
// follow the route.
//
// This cannot live in the server layout. Next does not re-render a shared layout
// on client-side navigation — that is the whole point of layouts — so
// `headers().get("x-pathname")` is evaluated once, on the first server render,
// and never again. The active item then freezes on whichever page was first
// hard-loaded. It looks correct in any test that uses a full page load, and is
// wrong the moment a user clicks a link, which is every real navigation.
//
// usePathname() is reactive across soft navigations, so the highlight follows.
// Everything expensive (auth, counts, notifications, translation) stays on the
// server; only these links are client-side, and they receive no data of their own.
//
// Each item carries an icon, looked up by href HERE rather than passed in: the
// three role arrays in AppSidebar stay plain data, and an icon is the one thing
// the collapsed 64px rail has left to show. An href with no entry still gets a
// neutral mark, so a new nav item can never render as an empty square.
const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/meetups": Calendar,
  "/products": Package,
  "/community": MessageCircle,
  "/insights": Newspaper,
  "/browse": Users,
  "/matches": Handshake,
  "/orgs": Building2,
  "/funding": HandCoins,
  "/activity": ChartColumn,
  "/admin/overview": ShieldCheck,
};

// As an icon rail (the `rail-collapsed:` classes — app/globals.css: always at
// 768-1279px, and from 1280px when collapsed), each row is a 40x36 icon tile:
// the label becomes the hover/focus tooltip (RAIL_TIP, still
// the link's accessible name), the "New" chip is hidden, and a count shrinks
// onto the icon's top-right corner.
//
// The icon sits at the SAME x in both states (12px nav padding + 10px row
// padding), so collapsing moves nothing but the rail's edge. The row is the
// same 36px tall in both states for the same reason.
export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  // No onClick to close the overlay drawer: SidebarFrame closes it on a click
  // on ANY link in the rail (components/SidebarState.tsx), these included.

  // A section root stays lit for its children: /community/<id> keeps Community
  // active. Exact-match alone would drop the highlight on every detail page.
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Main"
      // overflow-x-hidden: overflow-y-auto alone computes overflow-x to auto,
      // which would flash a horizontal scrollbar mid-animation.
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1"
    >
      {items.map((i) => {
        const Icon = ICONS[i.href] ?? Circle;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            // Radius 10 (rounded-lg): CLAUDE.md "Surfaces" — sidebar nav item.
            className={`group/rail relative flex items-center gap-3 h-9 px-2.5 rounded-lg text-sm tracking-wide transition-colors rail-collapsed:w-10 rail-collapsed:gap-0 ${
              isActive(i.href)
                ? "bg-gold text-navy font-medium"
                : "text-ink hover:bg-cream hover:text-navy"
            }`}
          >
            <Icon aria-hidden="true" className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            {/* py-1: `truncate` clips at the padding box, and a stacked Thai
                tone mark (ที่) rises to 15px above a baseline that sits 15.5px
                down a 20px line — measured 0.5px from being cut off. The
                padding is that headroom; the 36px row does not grow. */}
            <span className={`min-w-0 flex-1 truncate py-1 ${RAIL_TIP}`}>
              {i.label}
            </span>
            {/* One trailing group, not two more children: the label's flex-1
                pushes it to the end of the row, so a tag can never strand in the
                middle of the rail. */}
            {(i.tag || (i.badge !== undefined && i.badge > 0)) && (
              <span className="flex items-center gap-1.5 shrink-0">
                {i.tag && (
                  // 12px, not the 11px the numeric badge uses: that tier is
                  // "Latin-and-digits only" and this is a word — "New" renders
                  // as "ใหม่" in the default locale, and 12px is the floor for
                  // anything translatable. No uppercase/tracking either, since
                  // Thai has neither (globals.css strips tracking under
                  // lang="th"); font-medium carries the emphasis instead.
                  //
                  // The active row is itself bg-gold, so a gold chip would
                  // vanish into it — it flips to white there. text-navy on
                  // both (13.50:1 on gold, 17.40:1 on white); text-gold-ink on
                  // gold measures 4.49:1 and misses AA at this size.
                  //
                  // Icon rail: hidden. A word chip has no room on a 40px tile,
                  // and a launch marker is not worth a second dot beside a count.
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium rail-collapsed:hidden ${
                      isActive(i.href) ? "bg-white text-navy" : "bg-gold text-navy"
                    }`}
                  >
                    {i.tag}
                  </span>
                )}
                {i.badge !== undefined && i.badge > 0 && (
                  // Icon rail: a 16px count on the icon's top-right corner,
                  // ringed so it reads as a separate mark over the icon. Still
                  // digits only (the 11px tier's rule), still inside the link, so
                  // the accessible name keeps the number.
                  <span className="min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium rail-collapsed:absolute rail-collapsed:top-0 rail-collapsed:right-0.5 rail-collapsed:min-w-4 rail-collapsed:h-4 rail-collapsed:px-0.5 rail-collapsed:ring-2 rail-collapsed:ring-white">
                    {i.badge > 9 ? "9+" : i.badge}
                  </span>
                )}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
