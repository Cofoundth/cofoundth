import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { adminGetById } from "@/lib/insights";
import { InsightForm } from "../../InsightForm";
import { updateInsightAction } from "../../actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditInsightPage({ params }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) notFound();

  const { id } = await params;
  const insight = await adminGetById(id);
  if (!insight) notFound();

  const action = updateInsightAction.bind(null, id);

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/admin/insights"
        className="text-sm text-ink-muted hover:text-navy mb-6 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> All insights
      </Link>

      <div className="mb-10 pb-8 border-b border-line flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
            Admin
          </div>
          <h1 className="text-4xl">Edit insight</h1>
          <p className="text-ink-muted text-sm mt-1">
            {insight.slug} · {insight.locale}
          </p>
        </div>
        {insight.status === "published" && (
          <Link
            href={`/insights/${insight.slug}`}
            className="text-xs px-3 py-1.5 border border-line hover:border-navy text-ink hover:text-navy"
            target="_blank"
            rel="noopener"
          >
            View live →
          </Link>
        )}
      </div>

      <InsightForm
        initial={insight}
        action={action}
        submitLabel="Save changes"
      />
    </div>
  );
}
