import type { createClient } from "@/lib/supabase/server";

export const TRY_BEFORE_COMMENTING = "Try this product before commenting.";

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
