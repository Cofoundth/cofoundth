"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export type MobileLink = { href: string; label: string; badge?: number };

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
            className="fixed inset-0 z-40 bg-navy/20 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-50 bg-white border-y border-line shadow-lg">
            <nav className="px-6 py-1 flex flex-col">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-3.5 text-ink hover:text-navy border-b border-line/60 last:border-b-0"
                >
                  <span>{l.label}</span>
                  {l.badge && l.badge > 0 ? (
                    <span className="min-w-[18px] h-[18px] px-1 text-[10px] bg-gold text-white inline-flex items-center justify-center font-medium">
                      {l.badge > 9 ? "9+" : l.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
              {footer ? (
                <div
                  className="py-3 flex flex-col gap-2"
                  onClick={() => setOpen(false)}
                >
                  {footer}
                </div>
              ) : null}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
