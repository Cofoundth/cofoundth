import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getActiveOrgId } from "@/lib/active-org";
import { tServer } from "@/lib/i18n-server";
import { DealProposalForm } from "./DealProposalForm";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProposePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) notFound();

  // Propose AS the company the viewer is currently acting as (active-org cookie),
  // not whichever they joined first — matters for users in multiple companies.
  const myOrgId = (await getActiveOrgId(supabase, user.id)) ?? undefined;
  if (!myOrgId || myOrgId === org.id) redirect(`/orgs/${slug}`);

  // Proposals require an accepted connection between the two companies.
  const { data: conn } = await supabase
    .from("org_connections")
    .select("status")
    .or(
      `and(requester_org.eq.${myOrgId},target_org.eq.${org.id}),and(requester_org.eq.${org.id},target_org.eq.${myOrgId})`,
    )
    .maybeSingle();
  if (!conn || conn.status !== "accepted") redirect(`/orgs/${slug}`);

  return (
    <Section width="narrow">
      <Link
        href={`/orgs/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {org.name as string}
      </Link>

      <p className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
        {await tServer("Deal proposal")}
      </p>
      <h1 className="text-d2 mb-2">
        {(await tServer("Propose a deal with {company}")).replace(
          "{company}",
          org.name as string,
        )}
      </h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        {await tServer(
          "Both sides confirm the terms, then Cofoundee coordinates the contract.",
        )}
      </p>

      <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-xs">
        <DealProposalForm
          targetOrgId={org.id as string}
          targetSlug={org.slug as string}
          targetName={org.name as string}
        />
      </div>
    </Section>
  );
}
