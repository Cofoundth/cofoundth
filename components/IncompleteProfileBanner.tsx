"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { useT } from "@/lib/i18n-client";

// Global nudge shown on every authenticated page until the profile clears the
// directory gate (migration 0046's profile_complete). `onboarded` is guaranteed
// true by the (app) layout's redirect, so the CTA always points at /settings.
// Hidden on the open chat view — it's full-height, and the banner would push the
// message composer below the fold.
//
// Styling follows the app's existing high-priority banner (see
// profile/[id]/IncomingInterestBanner): navy panel, gold hairline, gold icon in
// a gold-tinted square, gold CTA. It replaces an off-palette #ec4444 / #ffdd61
// alarm bar — urgency here comes from contrast and the gold "Action needed"
// eyebrow, not from a red that isn't in the brand and failed contrast.
export function IncompleteProfileBanner({ complete }: { complete: boolean }) {
  const tr = useT();
  const pathname = usePathname();
  if (complete || pathname?.startsWith("/messages/")) return null;
  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 pt-8">
      <div className="bg-navy border border-gold/50 p-6 lg:p-8 rounded-xl">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 bg-gold/15 border border-gold/50 flex items-center justify-center shrink-0">
            <TriangleAlert
              className="w-6 h-6 text-gold"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.2em] text-gold mb-2">
              {tr("Action needed")}
            </div>
            <h2 className="text-xl mb-2 text-white">
              {tr("Your profile isn’t complete yet")}
            </h2>
            <p className="text-sm text-white leading-relaxed mb-1.5">
              {tr("Right now other founders can’t find your profile.")}
            </p>
            <p className="text-sm text-white/70 leading-relaxed mb-4">
              {tr(
                "Add a bit about you, what you’re looking for, and what you’re working on — then your profile shows on the Founders page for others to find.",
              )}
            </p>
            <Link
              href="/settings"
              className="px-5 py-2.5 bg-gold hover:bg-gold-soft text-navy font-medium text-sm tracking-wide transition-colors inline-flex items-center gap-2 rounded-full"
            >
              {tr("Complete profile")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
