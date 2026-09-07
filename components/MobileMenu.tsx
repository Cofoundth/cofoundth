"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export type MobileLink = {
  href: string;
  label: string;
  badge?: number;
  /**
   * A word-shaped marker ("New") rather than a count — ALREADY translated, the
   * same as `label`. Mirrors SidebarNavItem; this menu is what BOTH the
   * sidebar's mobile top bar and the marketing header's hamburger render, so
   * anything the rail shows has to show here too.
   */
  tag?: string;
};

// Hamburger + drop-down panel for small screens. The desktop nav links are
// `hidden md:flex` / `hidden lg:flex`; this fills the gap so the app is
// navigable on a phone. Pass the breakpoint via `className`
// (e.g. "md:hidden" or "lg:hidden") to mirror where the desktop nav appears.
export function MobileMenu({
  links,
  className = "md:hidden",
  footer,
}: {
  links: MobileLink[];
  className?: string;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Hold the page still while the menu is over it. The backdrop covers the
  // viewport but does not stop scrolling, so without this the content slides
  // around behind an open menu.
  //
  // The lock goes on <html>, not just <body>: <html> is the scrolling element
  // here, and hiding overflow on <body> alone left wheel and touch scrolling
  // working. This stops user scrolling; programmatic scrollTo still moves the
  // page, which nothing in the UI does while the menu is open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);
  // Same reason as the desktop rail: the server layout does not re-render on a
  // soft navigation, so the active item has to be derived on the client.
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="p-2 -mr-2 text-navy"
      >
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            // `rounded-none` is load-bearing — do not delete it as redundant.
            // globals.css @layer base pills EVERY <button> (border-radius:
            // 9999px, the Onfound geometry rule), and this one is a
            // full-viewport backdrop, so without the reset it renders as a
            // giant ellipse: the four screen corners stay undimmed, and
            // because border-radius clips hit-testing too, a click in a corner
            // falls through to the page instead of closing the menu.
            // Utilities are a later cascade layer than base, so this wins.
            //
            // bg-navy/20 stays lighter than the /40 modal scrim on purpose:
            // this is a nav dropdown hanging off the header, not a modal that
            // takes the screen over. The blur is what the founder asked for —
            // it separates the panel from the page without darkening it.
            className="fixed inset-0 z-40 rounded-none bg-navy/20 backdrop-blur-sm cursor-default"
          />
          <div
            // Scrolls internally: with the body locked, a list taller than the
            // screen would otherwise have unreachable items on a short phone.
            className="absolute left-0 right-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-white border-y border-line shadow-lg"
          >
            <nav className="px-6 py-1 flex flex-col">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`flex items-center justify-between -mx-3 px-3 py-3.5 rounded-lg border-b border-line/60 last:border-b-0 ${
                    isActive(l.href)
                      ? "bg-gold text-navy font-medium"
                      : "text-ink hover:bg-cream"
                  }`}
                >
                  <span>{l.label}</span>
                  {/* One trailing group, not two more children: the row is
                      `justify-between` and would spread three siblings evenly,
                      stranding a tag in the middle of the panel. */}
                  {l.tag || (l.badge && l.badge > 0) ? (
                    <span className="flex items-center gap-1.5 shrink-0">
                      {l.tag ? (
                        // 12px, not the numeric badge's 11px: that tier is
                        // "Latin-and-digits only" and this is a word — "New"
                        // is "ใหม่" in the default locale, where 12px is the
                        // floor for translatable text. No uppercase/tracking
                        // (Thai has neither, and globals.css strips tracking
                        // under lang="th"); font-medium does that work.
                        //
                        // The active row is bg-gold, so the gold chip would
                        // disappear into it — white there instead. text-navy
                        // on both (13.50:1 on gold, 17.40:1 on white).
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isActive(l.href)
                              ? "bg-white text-navy"
                              : "bg-gold text-navy"
                          }`}
                        >
                          {l.tag}
                        </span>
                      ) : null}
                      {l.badge && l.badge > 0 ? (
                        <span className="min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
                          {l.badge > 9 ? "9+" : l.badge}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </Link>
              ))}
              {footer ? (
                // No onClick={() => setOpen(false)} here: the footer holds the
                // sign-out <form>, and closing the menu would synchronously
                // unmount the form before its server action fires, cancelling
                // the submit. signOutAction redirects, so the menu closes anyway.
                <div className="py-3 flex flex-col gap-2">{footer}</div>
              ) : null}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
