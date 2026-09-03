import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { InsightForm } from "../InsightForm";
import { createInsightAction } from "../actions";
import { Section } from "@/components/ui";

export default async function NewInsightPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  return (
    <Section width="narrow">
      <Link
        href="/admin/insights"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> All insights
      </Link>

      <div className="mb-8">
        <h1 className="text-d2">New insight</h1>
      </div>

      <InsightForm action={createInsightAction} submitLabel="Create" />
    </Section>
  );
}
