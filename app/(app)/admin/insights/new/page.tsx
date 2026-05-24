import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { InsightForm } from "../InsightForm";
import { createInsightAction } from "../actions";

export default async function NewInsightPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/admin/insights"
        className="text-sm text-ink-muted hover:text-navy mb-6 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> All insights
      </Link>

      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Admin
        </div>
        <h1 className="text-4xl">New insight</h1>
      </div>

      <InsightForm action={createInsightAction} submitLabel="Create" />
    </div>
  );
}
