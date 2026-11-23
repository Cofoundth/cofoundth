"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n-client";

const TABS = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/meetups", label: "Meetups" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/rewards", label: "Monthly draw" },
  // Insights (blog) hidden for now — public Insights pages aren't linked.
  // Re-enable when the blog goes live.
  // { href: "/admin/insights", label: "Insights" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const tr = useT();
  return (
    <nav
      aria-label={tr("Admin")}
      className="mb-8 flex max-w-full flex-wrap items-center gap-x-1 border-b border-line"
    >
      {TABS.map((t) => {
        const active = pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex min-h-11 items-center border-b-2 px-3 py-2 text-sm tracking-wide transition-colors sm:px-4 ${
              active
                ? "border-navy text-navy font-medium"
                : "border-transparent text-ink-muted hover:text-navy"
            }`}
          >
            {tr(t.label)}
          </Link>
        );
      })}
    </nav>
  );
}
