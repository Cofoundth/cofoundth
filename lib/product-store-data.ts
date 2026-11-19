import type { PostItem } from "./post-types";
import type { createClient } from "./supabase/server";

const PRODUCT_STORE_COLUMNS = "ios_store_url, android_store_url";
const PRODUCT_AVAILABILITY = `availability:products!products_listing_id_fkey(platforms, ${PRODUCT_STORE_COLUMNS})`;
const LEGACY_PRODUCT_AVAILABILITY = `platforms, ${PRODUCT_STORE_COLUMNS}`;

type QueryResult = { error: { code?: string; message: string } | null };

type ProductAvailability = {
  platforms: string[];
  ios_store_url: string | null;
  android_store_url: string | null;
};

type ProductAvailabilityRow = Partial<ProductAvailability> & {
  availability?: ProductAvailability | null;
};

export type ProductListingSummary = Pick<
  PostItem,
  "id" | "title" | "content" | "link_url" | "image_url" | "image_urls" | "tags"
> & ProductAvailabilityRow;

type ListingRow = ProductListingSummary & {
  author_id: string;
  kind: string | null;
  created_at: string;
  hidden: boolean;
};

/** Keep existing reads and writes available during the store-link migration. */
export async function queryWithProductStoreColumns<T extends QueryResult>(
  query: (includeStores: boolean) => PromiseLike<T>,
  canUsePreviousSchema = true,
) {
  const result = await query(true);
  const error = result.error;
  if (
    canUsePreviousSchema &&
    (error?.code === "42703" || error?.code === "PGRST204") &&
    /\b(ios_store_url|android_store_url)\b/.test(error.message)
  ) {
    return query(false);
  }
  return result;
}

/** Read availability from the dedicated record once migration 0092 is visible. */
export async function queryWithProductAvailability<T extends QueryResult>(
  query: (
    availability: typeof PRODUCT_AVAILABILITY | typeof LEGACY_PRODUCT_AVAILABILITY | "platforms",
  ) => PromiseLike<T>,
) {
  const result = await query(PRODUCT_AVAILABILITY);
  if (result.error?.code === "PGRST200" && /\bproducts\b/.test(result.error.message)) {
    return queryWithProductStoreColumns((includeStores) =>
      query(includeStores ? LEGACY_PRODUCT_AVAILABILITY : "platforms"),
    );
  }
  return result;
}

export function productAvailabilityOf(row: Record<string, unknown>) {
  const availability = "availability" in row
    ? row.availability as Record<string, unknown> | null
    : row;
  return {
    platforms: (availability?.platforms as string[] | null) ?? [],
    ios_store_url: (availability?.ios_store_url as string | null) ?? null,
    android_store_url: (availability?.android_store_url as string | null) ?? null,
  };
}

export async function readListingWithAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  visibleOnly = false,
) {
  const { data, error } = await queryWithProductAvailability((availability) => {
    let query = supabase
      .from("forum_posts")
      .select(`id, author_id, title, content, kind, link_url, image_url, image_urls, tags, created_at, hidden, ${availability}`)
      .eq("id", id);
    if (visibleOnly) query = query.eq("hidden", false);
    return query.maybeSingle().overrideTypes<ListingRow | null, { merge: false }>();
  });
  return { data: data && { ...data, ...productAvailabilityOf(data) }, error };
}
