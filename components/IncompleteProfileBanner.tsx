"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";

// Global nudge shown on every authenticated page until the profile clears the
// directory gate (migration 0046's profile_complete). `onboarded` is guaranteed
// true by the (app) layout's redirect, so the CTA always points at /settings.
// Hidden on the open chat view — it's full-height, and the banner would push the
// message composer below the fold.
export function IncompleteProfileBanner({ complete }: { complete: boolean }) {
  const tr = useT();
  const pathname = usePathname();
  if (complete || pathname?.startsWith("/messages/")) return null;
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8">
      <div className="bg-[#ec4444] text-white p-6 lg:p-8">
        <div className="flex items-start gap-5">
          <div className="font-serif text-2xl text-[#ffdd61] leading-none mt-1">
            !
          </div>
          <div className="flex-1">
            <h2 className="text-xl mb-2 text-white">
              {tr("Your profile isn’t complete yet")}
            </h2>
            <p className="text-sm text-white leading-relaxed mb-1.5">
              {tr("Right now other founders can’t find your profile.")}
            </p>
            <p className="text-sm text-white/75 leading-relaxed mb-4">
              {tr(
                "Add a bit about you, what you’re looking for, and what you’re working on — then your profile shows on the Founders page for others to find.",
              )}
            </p>
            <Link
              href="/settings"
              className="px-5 py-2.5 bg-[#ffdd61] hover:bg-[#ffdd61]/90 text-navy font-medium text-sm tracking-wide transition-colors inline-flex items-center gap-2"
            >
              {tr("Complete profile")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
