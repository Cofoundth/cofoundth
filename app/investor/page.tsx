import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { signOutAction } from "@/app/(auth)/actions";
import { BrandMark, Wordmark } from "@/components/Brand";

export const dynamic = "force-dynamic";

// Placeholder home for investor accounts. The real investor module (browsing
// founders/companies, warm intros, deal flow) is a Phase-2 build — for now this
// just confirms the account and keeps investors out of the founder app.
export default async function InvestorPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, full_name")
    .eq("id", user.id)
    .single();

  // Not an investor → they belong in the founder app.
  if (profile?.account_type !== "investor") redirect("/dashboard");

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

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full bg-white border border-line p-8 lg:p-10 text-center">
          <div className="w-14 h-14 mx-auto bg-cream border border-line flex items-center justify-center mb-6">
            <Compass className="w-6 h-6 text-gold" strokeWidth={1.5} />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
            {await tServer("Investor")}
          </p>
          <h1 className="font-serif text-2xl text-navy leading-tight mb-3">
            {firstName
              ? (await tServer("Welcome, {name}")).replace("{name}", firstName)
              : await tServer("Welcome")}
          </h1>
          <p className="text-ink-muted leading-relaxed">
            {await tServer(
              "The investor experience — discovering and backing Thai startups — is coming soon. Your account is ready; we'll reach out when early access opens.",
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
