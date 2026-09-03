import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { investorTypeLabel } from "@/lib/investor";
import {
  InvestorOnboardingForm,
  type InvestorInitial,
} from "./InvestorOnboardingForm";

export const dynamic = "force-dynamic";

// Home for investor accounts. New investors get an investor-specific onboarding
// (NOT the founder/company form); once saved, a placeholder until the full
// Phase-2 investor module ships. Founders are bounced to /dashboard.
export default async function InvestorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "investor") redirect("/dashboard");

  const { data: inv } = await supabase
    .from("investor_profiles")
    .select(
      "investor_type, firm_name, focus_industries, stages, ticket_size, thesis, location",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const sp = await searchParams;
  const editing = sp?.edit === "1" || !inv;
  const firstName =
    (profile?.full_name as string | null)?.split(" ")[0]?.trim() ?? "";
  // Never render the raw slug ("family_office") — map it, then translate.
  const typeLabel = inv?.investor_type
    ? await tServer(investorTypeLabel(inv.investor_type as string))
    : "";

  return (
    <div className="px-6 lg:px-10 py-[88px]">
        {editing ? (
          <div className="max-w-[640px] mx-auto">
            <h1 className="text-d2 mb-2">
              {await tServer("Set up your investor profile")}
            </h1>
            <p className="text-sm text-ink-muted mb-8">
              {await tServer(
                "Tell us how you invest. This is separate from the founder profile — no company or co-founder details needed.",
              )}
            </p>
            <div className="bg-white rounded-3xl shadow-xs p-6 lg:p-8">
              <InvestorOnboardingForm
                initial={(inv as InvestorInitial | null) ?? undefined}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-[640px] mx-auto">
            <h1 className="text-d2 mb-2">
              {(inv?.firm_name as string | null) ||
                (firstName
                  ? (await tServer("Welcome, {name}")).replace(
                      "{name}",
                      firstName,
                    )
                  : await tServer("Welcome"))}
            </h1>
            <p className="text-sm text-ink-muted mb-8">
              {[typeLabel, inv?.location].filter(Boolean).join(" · ")}
            </p>

            {/* The live investor surface — discovering + backing companies. */}
            <Link
              href="/funding"
              className="flex items-center justify-between gap-4 bg-navy hover:bg-navy-dark text-white px-6 py-5 mb-8 transition-colors rounded-full"
            >
              <span>
                <span className="block font-serif text-lg">
                  {await tServer("Discover companies to back")}
                </span>
                <span className="block text-xs text-white/70 mt-0.5">
                  {await tServer(
                    "Browse Thai startups, connect, and propose a deal.",
                  )}
                </span>
              </span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </Link>

            <div className="bg-white rounded-3xl shadow-xs p-6 lg:p-8 space-y-5">
              {((inv?.focus_industries as string[] | null) ?? []).length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
                    {await tServer("Focus")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {((inv?.focus_industries as string[] | null) ?? []).map(
                      (x) => (
                        <span
                          key={x}
                          className="text-xs px-2 py-1 border border-line text-ink rounded-full"
                        >
                          {x}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
              {((inv?.stages as string[] | null) ?? []).length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
                    {await tServer("Stages")}
                  </div>
                  <div className="text-sm text-ink">
                    {((inv?.stages as string[] | null) ?? []).join(" · ")}
                  </div>
                </div>
              )}
              {inv?.ticket_size && (
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
                    {await tServer("Cheque size")}
                  </div>
                  <div className="text-sm text-ink">
                    {inv.ticket_size as string}
                  </div>
                </div>
              )}
              {inv?.thesis && (
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
                    {await tServer("Thesis")}
                  </div>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                    {inv.thesis as string}
                  </p>
                </div>
              )}
              <div className="pt-1">
                <Link
                  href="/investor?edit=1"
                  className="inline-flex items-center gap-2 text-sm text-navy hover:text-gold-ink transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  {await tServer("Edit profile")}
                </Link>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
