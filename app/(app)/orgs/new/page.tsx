import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { CreateOrgForm } from "./CreateOrgForm";

export const dynamic = "force-dynamic";

export default async function NewOrgPage() {
  await requireUser();

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/orgs"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {await tServer("Companies")}
      </Link>

      <p className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
        {await tServer("Create a company")}
      </p>
      <h1 className="font-serif text-3xl text-navy leading-tight mb-2">
        {await tServer("Set up your company page")}
      </h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        {await tServer(
          "Create a company profile and invite your team. You stay an individual founder — this is your company, separate from your personal profile.",
        )}
      </p>

      <div className="bg-white border border-line p-6 lg:p-8">
        <CreateOrgForm />
      </div>
    </div>
  );
}
