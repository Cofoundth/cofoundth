import type { createClient } from "@/lib/supabase/server";

export function readProductLike(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  productId: string,
) {
  return supabase
    .from("forum_likes")
    .select("post_id")
    .eq("post_id", productId)
    .eq("user_id", userId)
    .maybeSingle();
}
