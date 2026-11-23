import { isAdminUser } from "@/lib/admin";
import { readListingWithAvailability } from "@/lib/product-store-data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readProductForEdit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
  id: string,
  mayEditOwn: boolean,
) {
  if (!UUID.test(id)) return null;

  if (mayEditOwn) {
    const { data: post } = await readListingWithAvailability(supabase, id);
    if (post?.kind === "show_and_tell" && post.author_id === user.id && !post.is_curated) {
      return { post, client: supabase };
    }
  }

  if (!(await isAdminUser(supabase, user))) return null;
  const admin = createAdminClient();
  const { data: post } = await readListingWithAvailability(admin, id);
  return post?.kind === "show_and_tell" && post.is_curated ? { post, client: admin } : null;
}
