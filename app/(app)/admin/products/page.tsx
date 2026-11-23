import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminTabs } from "@/components/AdminTabs";
import { Paginated } from "@/components/Paginated";
import { CardChip, LinkButton, Section, SectionHeading, cardClasses } from "@/components/ui";
import { isAdminUser } from "@/lib/admin";
import { CURATED_PRODUCT_LABEL } from "@/lib/curated-products";
import { tServer } from "@/lib/i18n-server";
import { editProductPath, productPath } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CuratedProductEditor } from "./CuratedProductEditor";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  const [{ data: products, error }, tTitle, tEdit, tHidden, tUntitled, tError] = await Promise.all([
    createAdminClient().from("forum_posts")
      .select("id, title, hidden, availability:products!products_listing_id_fkey!inner(is_curated)")
      .eq("kind", "show_and_tell")
      .eq("availability.is_curated", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    tServer("Curated products"),
    tServer("Edit product"),
    tServer("Hidden"),
    tServer("Untitled"),
    tServer("Couldn’t load curated products. Refresh to try again."),
  ]);

  return (
    <Section>
      <AdminTabs />
      <h1 className="text-d2 mb-2">{CURATED_PRODUCT_LABEL}</h1>
      <p className="mb-6 max-w-[640px] text-sm text-ink-muted">
        {await tServer("List products made by other people. Review the details before publishing them on Cofoundee.")}
      </p>
      <CuratedProductEditor />
      {error ? (
        <p role="alert" className="mt-8 text-sm text-danger-ink">{tError}</p>
      ) : !!products?.length && (
        <section className="mt-8">
          <SectionHeading title={tTitle} />
          <Paginated pageSize={12} className={cardClasses({ padding: "none", className: "mt-3 divide-y divide-line" })}>
            {products.map(({ id, title, hidden }) => (
              <div key={id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 sm:px-6">
                <div className="min-w-0">
                  <Link href={productPath(id)} className="wrap-anywhere font-medium underline-offset-4 hover:underline">
                    {title || tUntitled}
                  </Link>
                  {hidden && <CardChip className="ml-2">{tHidden}</CardChip>}
                </div>
                <LinkButton
                  href={editProductPath(id)}
                  variant="secondary"
                  size="sm"
                  aria-label={`${tEdit} · ${title || tUntitled}`}
                  className="min-h-11 shrink-0"
                >
                  {tEdit}
                </LinkButton>
              </div>
            ))}
          </Paginated>
        </section>
      )}
    </Section>
  );
}
