"use server";

import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin";
import {
  MAX_CURATED_PRODUCTS,
  PRODUCT_IMPORT_COLUMNS,
  validateCuratedProduct,
  type CuratedProductInput,
} from "@/lib/curated-products";
import { productPath } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function publishCuratedProducts(drafts: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) return { error: "Not allowed." };
  if (!Array.isArray(drafts) || drafts.length === 0 || drafts.length > MAX_CURATED_PRODUCTS)
    return { error: "Review up to 50 products at a time." };

  const ids = new Set<string>();
  const entries = [];
  for (const draft of drafts) {
    if (!draft || typeof draft.id !== "string" || !UUID.test(draft.id) || ids.has(draft.id) ||
        !draft.input || PRODUCT_IMPORT_COLUMNS.some((column) => typeof draft.input[column] !== "string"))
      return { error: "Invalid product preview. Try again." };
    const parsed = validateCuratedProduct(draft.input as CuratedProductInput);
    if (!parsed.entry) return { error: parsed.error };
    ids.add(draft.id);
    entries.push({ id: draft.id as string, ...parsed.entry });
  }

  const { error } = await createAdminClient().rpc("publish_curated_products", {
    publisher_id: user.id,
    entries,
  });
  if (error) {
    if (error.message === "curated_product_publisher_unavailable")
      return { error: "Publish from an active founder admin account." };
    console.error("[curated-products.publish]", error.code);
    return { error: "Publication could not be confirmed. Retry the same preview." };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/posts");
  for (const id of ids) revalidatePath(productPath(id));

  return { published: entries.map(({ id, title }) => ({ id, title })) };
}
