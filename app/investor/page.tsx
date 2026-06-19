import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { signOutAction } from "@/app/(auth)/actions";
import { BrandMark, Wordmark } from "@/components/Brand";
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

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <Wordmark className="text-base" />
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-ink-muted hover:text-navy tracking-wide"
            >
              {await tServer("Sign out")}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        {editing ? (
          <div className="max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
              {await tServer("Investor")}
            </p>
            <h1 className="font-serif text-3xl text-navy leading-tight mb-2">
              {await tServer("Set up your investor profile")}
            </h1>
            <p className="text-ink-muted leading-relaxed mb-8">
              {await tServer(
                "Tell us how you invest. This is separate from the founder profile — no company or co-founder details needed.",
              )}
            </p>
            <div className="bg-white border border-line p-6 lg:p-8">
              <InvestorOnboardingForm
                initial={(inv as InvestorInitial | null) ?? undefined}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-line p-8 lg:p-10 text-center">
              <div className="w-14 h-14 mx-auto bg-cream border border-line flex items-center justify-center mb-6">
                <Compass className="w-6 h-6 text-gold" strokeWidth={1.5} />
              </div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
                {await tServer("Investor")}
              </p>
              <h1 className="font-serif text-2xl text-navy leading-tight mb-3">
                {firstName
                  ? (await tServer("Welcome, {name}")).replace(
                      "{name}",
                      firstName,
                    )
                  : await tServer("Welcome")}
              </h1>
              <p className="text-ink-muted leading-relaxed mb-6">
                {await tServer(
                  "Your investor profile is saved. The full experience — discovering and backing Thai startups — is coming soon; we'll reach out when early access opens.",
                )}
              </p>
              <Link
                href="/investor?edit=1"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-line hover:border-navy text-ink hover:text-navy text-sm transition-colors"
              >
                <Pencil className="w-4 h-4" />
                {await tServer("Edit profile")}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
