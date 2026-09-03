"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarNavItem = {
  href: string;
  /** ALREADY translated by the server component that renders this. */
  label: string;
  badge?: number;
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
export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  // A section root stays lit for its children: /community/<id> keeps Community
  // active. Exact-match alone would drop the highlight on every detail page.
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Main"
      className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
    >
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(i.href) ? "page" : undefined}
          className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm tracking-wide transition-colors ${
            isActive(i.href)
              ? "bg-gold text-navy font-medium"
              : "text-ink hover:bg-cream hover:text-navy"
          }`}
        >
          <span>{i.label}</span>
          {i.badge !== undefined && i.badge > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
              {i.badge > 9 ? "9+" : i.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
