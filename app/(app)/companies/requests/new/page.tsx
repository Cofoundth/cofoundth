import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { NewAskForm } from "./NewAskForm";
import { Section } from "@/components/ui";

export default async function NewAskPage() {
  const supabase = await createClient();
  const user = await requireUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("type, onboarded, company_name")
    .eq("id", user.id)
    .single();

  // Only companies can post asks
  if (me?.type !== "company" || !me?.onboarded) {
    redirect("/companies/requests");
  }

  return (
    <Section width="narrow">
      <Link
        href="/companies/requests"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        {await tServer("Back to board")}
      </Link>

      <div className="mb-8">
        <h1 className="text-d2 mb-2">
          {await tServer("Post a partnership ask")}
        </h1>
        <p className="text-ink">
          {(
            await tServer(
              "Describe the partner {name} needs. Other companies will see it and respond with offers.",
            )
          ).replace("{name}", me?.company_name ?? (await tServer("your company")))}
        </p>
      </div>

      <NewAskForm />
    </Section>
  );
}
