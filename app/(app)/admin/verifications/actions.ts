"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    throw new Error("Forbidden");
  }
}

export async function toggleVerifiedAction(
  profileId: string,
  next: boolean,
) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ verified: next })
    .eq("id", profileId);
  revalidatePath("/admin/verifications");
  revalidatePath("/browse");
  revalidatePath("/companies");
  revalidatePath(`/profile/${profileId}`);
}
