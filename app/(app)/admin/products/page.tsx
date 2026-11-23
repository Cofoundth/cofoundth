import { notFound } from "next/navigation";
import { AdminTabs } from "@/components/AdminTabs";
import { Section } from "@/components/ui";
import { isAdminUser } from "@/lib/admin";
import { CURATED_PRODUCT_LABEL } from "@/lib/curated-products";
import { tServer } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { CuratedProductEditor } from "./CuratedProductEditor";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  return (
    <Section>
      <AdminTabs />
      <h1 className="text-d2 mb-2">{CURATED_PRODUCT_LABEL}</h1>
      <p className="mb-6 max-w-[640px] text-sm text-ink-muted">
        {await tServer("List products made by other people. Review the details before publishing them on Cofoundee.")}
      </p>
      <CuratedProductEditor />
    </Section>
  );
}
