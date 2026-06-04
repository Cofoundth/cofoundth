"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n-client";

const TABS = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/posts", label: "Posts" },
  // Insights (blog) hidden for now — public Insights pages aren't linked.
  // Re-enable when the blog goes live.
  // { href: "/admin/insights", label: "Insights" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const tr = useT();
  return (
    <nav className="flex items-center gap-1 mb-8 border-b border-line">
      {TABS.map((t) => {
        const active = pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
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
