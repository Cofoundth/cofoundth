"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { hardDeleteUser } from "@/lib/delete-user";
import {
  cleanUpDeletedPost,
  DELETED_POST_COLUMNS,
  type DeletedPost,
} from "@/lib/post-cleanup";
import { productPath } from "@/lib/post-types";
import { MY_PRODUCTS_PATH } from "@/lib/roles";
import { randomInt } from "node:crypto";
import { drawEntrants } from "@/lib/draw-data";
import { isMonth, monthOf } from "@/lib/rewards";

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
  revalidatePath("/community");
  revalidatePath("/browse");
}

// ---- Posts ----------------------------------------------------------

// Every page one forum_posts row shows on. It may be a PRODUCT, whose page is
// /products/<id> and which is listed on the shelf (/products, and / while it
// serves the shelf) and on its maker's My products — none of which
// revalidateAll() names.
function revalidatePost(postId: string) {
  revalidatePath(`/community/${postId}`);
  revalidatePath(productPath(postId));
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath(MY_PRODUCTS_PATH);
}

export async function adminSetPostHidden(
  postId: string,
  hidden: boolean,
): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  const { error } = await ctx.admin
    .from("forum_posts")
    .update({ hidden })
    .eq("id", postId);
  if (error) {
    // Said, not dropped: a "Hide" that silently failed leaves the post public.
    console.error("[admin.post.hidden]", error.message);
    return { error: "Couldn’t update it. Try again." };
  }
  revalidateAll();
  revalidatePost(postId);
  return { ok: true };
}

// The image(s) and the notifications that point at the row go with it
// (lib/post-cleanup.ts) — the same cleanup its author's own delete runs. A
// failed delete says so instead of reporting success.
export async function adminDeletePost(postId: string): Promise<Result> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  const { data: gone, error } = await ctx.admin
    .from("forum_posts")
    .delete()
    .eq("id", postId)
    .select(DELETED_POST_COLUMNS);
  if (error) {
    console.error("[admin.post.delete]", error.message);
    return { error: "Couldn’t delete it. Try again." };
  }
  if (gone?.length)
    await cleanUpDeletedPost(gone[0] as unknown as DeletedPost, "admin.post.delete");
  revalidateAll();
  revalidatePost(postId);
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

// ---- Monthly draw ---------------------------------------------------------

/**
 * Draw `month`'s winner (`YYYY-MM`), once. The entrants are recomputed here,
 * on the server, from the comments that exist now (lib/draw-data.ts) — never
 * taken from the page — and the pick is a cryptographic random index into
 * that list sorted by id. The result is stored once: monthly_draws.month is
 * the primary key (0087), so a second press says "already drawn" instead of
 * drawing again. Only a month that is over can be drawn.
 */
export async function drawMonthlyWinner(
  month: string,
): Promise<Result & { winner?: string }> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx;
  if (!isMonth(month)) return { error: "Pick a month." };
  if (month >= monthOf(new Date()))
    return { error: "A month can be drawn once it is over." };

  const entrants = await drawEntrants(month);
  if (entrants === null)
    return { error: "Couldn’t read this month’s comments. Try again." };
  if (!entrants.length) return { error: "Nobody qualified that month." };

  const winner = entrants[randomInt(entrants.length)];
  const { error } = await ctx.admin.from("monthly_draws").insert({
    month: `${month}-01`,
    winner_id: winner.id,
    eligible_count: entrants.length,
    drawn_by: ctx.selfId,
    // The pool as it was, in the order it was indexed (0088), so the record
    // can always say who was in this draw.
    entrant_ids: entrants.map((e) => e.id),
  });
  if (error) {
    if (error.code === "23505")
      return { error: "That month has already been drawn." };
    console.error("[draw.save]", error.message);
    return { error: "Couldn’t save the draw. Try again." };
  }

  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
  return { ok: true, winner: winner.name };
}
