import type { createClient } from "@/lib/supabase/server";

export const TRY_BEFORE_COMMENTING = "Try this product before commenting.";

export async function getTriedProductIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  productIds: readonly string[],
): Promise<Set<string>> {
  if (!productIds.length) return new Set();
  const { data } = await supabase
    .from("product_tries")
    .select("product_id")
    .eq("user_id", userId)
    .in("product_id", [...productIds]);
  return new Set((data ?? []).map(({ product_id }) => product_id));
}

export async function hasTriedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  productId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("product_tries")
    .select("product_id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  return data !== null;
}
