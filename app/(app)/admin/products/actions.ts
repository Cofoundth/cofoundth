"use server";

import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin";
import {
  CURATED_SCREENSHOT_BYTES_ERROR,
  MAX_CURATED_PRODUCTS,
  PRODUCT_IMPORT_COLUMNS,
  validateCuratedProduct,
  type CuratedProductInput,
} from "@/lib/curated-products";
import { filesIn, removePostImages, uploadAll } from "@/lib/post-image-upload";
import { MAX_UPLOAD_IMAGE_BYTES, productPath } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function publishCuratedProducts(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) return { error: "Not allowed." };
  let drafts: unknown;
  try {
    drafts = JSON.parse(String(formData.get("drafts")));
  } catch {
    return { error: "Invalid product preview. Try again." };
  }
  if (!Array.isArray(drafts) || drafts.length === 0 || drafts.length > MAX_CURATED_PRODUCTS)
    return { error: "Review up to 50 products at a time." };

  const ids = new Set<string>();
  const rows = [];
  for (const draft of drafts) {
    if (!draft || typeof draft.id !== "string" || !UUID.test(draft.id) || ids.has(draft.id) ||
        !draft.input || PRODUCT_IMPORT_COLUMNS.some((column) => typeof draft.input[column] !== "string"))
      return { error: "Invalid product preview. Try again." };
    const files = filesIn(formData, draft.id);
    const parsed = validateCuratedProduct(draft.input as CuratedProductInput, files.length);
    if (!parsed.entry) return { error: parsed.error };
    ids.add(draft.id);
    rows.push({ entry: { id: draft.id as string, ...parsed.entry }, files });
  }

  const files = rows.flatMap((row) => row.files);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_UPLOAD_IMAGE_BYTES)
    return { error: CURATED_SCREENSHOT_BYTES_ERROR };

  const uploaded = await uploadAll(
    user.id, files, "curated-products.publish", "Couldn't upload the screenshots. No products were published.",
  );
  if (!uploaded.uploads) return { error: uploaded.error };

  let last = 0;
  const entries = rows.map(({ entry, files }) => {
    const screenshots = uploaded.uploads.slice(last, last + files.length);
    last += files.length;
    return { ...entry, image_urls: [...entry.image_urls, ...screenshots.map(({ url }) => url)] };
  });
  const admin = createAdminClient();
  const { error } = await admin.rpc("publish_curated_products", {
    publisher_id: user.id,
    entries,
  });
  if (error) {
    // A SQL error rolls back the batch. A lost response may have committed it.
    if (/^[A-Z0-9]{5}$/.test(error.code)) await removePostImages(uploaded.uploads);
    if (error.message === "curated_product_publisher_unavailable")
      return { error: "Publish from an active founder admin account." };
    console.error("[curated-products.publish]", error.code);
    return { error: "Publication could not be confirmed. Retry the same preview." };
  }

  if (uploaded.uploads.length) {
    // A retry can succeed with the previous rows. Clean up only this attempt's
    // uploads that the published listings reference nowhere.
    const { data: listings } = await admin.from("forum_posts").select("image_urls").in("id", [...ids]);
    if (listings) {
      const referenced = new Set(listings.flatMap(({ image_urls }) => image_urls ?? []));
      await removePostImages(uploaded.uploads.filter(({ url }) => !referenced.has(url)));
    }
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  revalidatePath("/admin/posts");
  for (const id of ids) revalidatePath(productPath(id));

  return { published: entries.map(({ id, title }) => ({ id, title })) };
}
