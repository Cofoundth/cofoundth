import { notFound } from "next/navigation";
import { AdminTabs } from "@/components/AdminTabs";
import { Section } from "@/components/ui";
import { isAdminUser } from "@/lib/admin";
import { getBlockedIds } from "@/lib/blocking";
import { CURATED_PRODUCT_LABEL } from "@/lib/curated-products";
import { tServer } from "@/lib/i18n-server";
import { getProductRatings } from "@/lib/product-ratings";
import { UNRATED, postImages } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { webUrl } from "@/lib/web-url";
import { CuratedProductEditor } from "./CuratedProductEditor";
import { CuratedProductList } from "./CuratedProductList";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) notFound();

  const blocked = await getBlockedIds(user.id);
  const query = createAdminClient().from("forum_posts")
    .select(`
      id, title, hidden, image_url, image_urls,
      availability:products!products_listing_id_fkey!inner(is_curated),
      comment_stats:forum_comments(count),
      latest_comment:forum_comments(content)
    `)
    .eq("kind", "show_and_tell")
    .eq("availability.is_curated", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("created_at", { referencedTable: "latest_comment", ascending: false })
    .order("id", { referencedTable: "latest_comment", ascending: false })
    .limit(1, { referencedTable: "latest_comment" });
  if (blocked.size) {
    const ids = `(${[...blocked].join(",")})`;
    query.not("comment_stats.author_id", "in", ids).not("latest_comment.author_id", "in", ids);
  }
  const [{ data: products, error }, tError, intro] = await Promise.all([
    query,
    tServer("Couldn’t load curated products. Refresh to try again."),
    tServer("List products made by other people. Review the details before publishing them on Cofoundee."),
  ]);
  const ratings = await getProductRatings(products?.map(({ id }) => id) ?? []);

  return (
    <Section>
      <AdminTabs />
      <h1 className="text-d2 mb-2">{CURATED_PRODUCT_LABEL}</h1>
      <p className="mb-4 max-w-[640px] text-sm text-ink-muted">{intro}</p>
      <CuratedProductEditor />
      {error ? (
        <p role="alert" className="mt-8 text-sm text-danger-ink">{tError}</p>
      ) : !!products?.length && (
        <CuratedProductList products={products.map((row) => ({
          id: row.id,
          title: row.title,
          hidden: row.hidden,
          cover: webUrl(postImages(row)[0])?.href,
          rating: ratings.get(row.id) ?? UNRATED,
          commentCount: row.comment_stats?.[0]?.count ?? 0,
          latestComment: row.latest_comment?.[0]?.content,
        }))} />
      )}
    </Section>
  );
}
