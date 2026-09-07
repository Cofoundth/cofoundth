"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
          {/* One trailing group, not two more children: `justify-between` on
              the row spreads three siblings evenly, which would strand a tag
              in the middle of the rail. */}
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
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive(i.href) ? "bg-white text-navy" : "bg-gold text-navy"
                  }`}
                >
                  {i.tag}
                </span>
              )}
              {i.badge !== undefined && i.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
                  {i.badge > 9 ? "9+" : i.badge}
                </span>
              )}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
