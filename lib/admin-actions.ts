"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { hardDeleteUser } from "@/lib/delete-user";

type Result = { ok?: boolean; error?: string };

async function requireAdmin(): Promise<
  | { admin: ReturnType<typeof createAdminClient>; selfId: string }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) return { error: "Not allowed." };
  return { admin: createAdminClient(), selfId: user!.id };
}

function revalidateAll() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/posts");
  revalidatePath("/dashboard");
  revalidatePath("/community");
  revalidatePath("/browse");
}

// ---- Posts ----------------------------------------------------------

export async function adminSetPostHidden(
  postId: string,
  hidden: boolean,
): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  await ctx.admin.from("forum_posts").update({ hidden }).eq("id", postId);
  revalidateAll();
  return { ok: true };
}

export async function adminDeletePost(postId: string): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  await ctx.admin.from("forum_posts").delete().eq("id", postId);
  revalidateAll();
  return { ok: true };
}

// ---- Users ----------------------------------------------------------

export async function adminSetUserSuspended(
  userId: string,
  suspended: boolean,
): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  if (userId === ctx.selfId) return { error: "You can't suspend yourself." };
  await ctx.admin.from("profiles").update({ suspended }).eq("id", userId);
  revalidateAll();
  return { ok: true };
}

export async function adminSetUserAdmin(
  userId: string,
  isAdminFlag: boolean,
): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  if (userId === ctx.selfId && !isAdminFlag)
    return { error: "You can't remove your own admin." };
  await ctx.admin
    .from("profiles")
    .update({ is_admin: isAdminFlag })
    .eq("id", userId);
  revalidateAll();
  return { ok: true };
}

export async function adminSetUserVerified(
  userId: string,
  verified: boolean,
): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  await ctx.admin.from("profiles").update({ verified }).eq("id", userId);
  revalidateAll();
  return { ok: true };
}

// Hard-delete a user: their storage, then the auth account (DB rows cascade
// off profiles → forum_posts/comments/messages/etc).
export async function adminDeleteUser(userId: string): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  if (userId === ctx.selfId) return { error: "You can't delete yourself." };

  // Same routine the member's own Danger zone runs (lib/delete-user), so an
  // admin delete can't succeed where a self-delete would have been refused —
  // or vice versa.
  const { error } = await hardDeleteUser(ctx.admin, userId);
  if (error) return { error };

  revalidateAll();
  return { ok: true };
}
