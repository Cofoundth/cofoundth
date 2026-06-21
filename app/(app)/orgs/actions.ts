"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid, slugify } from "@/lib/slug";
import { LONG_TEXT_MAX } from "@/lib/limits";

export type OrgFormState = { error?: string } | null;

// Parse a comma-separated input into a clean string[] (trimmed, de-duped,
// capped) — used for industry / capabilities / partnership_seeking.
function parseList(raw: string, maxItems = 12, maxLen = 40): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.slice(0, maxLen)),
    ),
  ].slice(0, maxItems);
}

const STAGES = ["idea", "building", "launched", "raising", "scaling"] as const;

// Find a unique slug for an org name. Thai names slugify to "" → fall back to
// "company"; then append -2, -3, … until free.
async function uniqueOrgSlug(
  admin: ReturnType<typeof createAdminClient>,
  name: string,
): Promise<string> {
  let base = slugify(name);
  if (base.length < 3) base = base ? `${base}-co` : "company";
  let candidate = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`.slice(0, 50);
  }
  // Extremely unlikely fallback: suffix with a slice of a fresh uuid.
  return `${base}-${crypto.randomUUID().slice(0, 6)}`.slice(0, 50);
}

// ------------------------------------------------------------------
// CREATE COMPANY — creator becomes the owner.
// ------------------------------------------------------------------
export async function createOrgAction(
  _prev: OrgFormState,
  formData: FormData,
): Promise<OrgFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const pitch = String(formData.get("pitch") ?? "").trim();
  const productUrl = String(formData.get("product_url") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const industry = parseList(String(formData.get("industry") ?? ""));
  const capabilities = parseList(String(formData.get("capabilities") ?? ""));
  const partnershipSeeking = parseList(
    String(formData.get("partnership_seeking") ?? ""),
  );

  // product_images arrives as a JSON array of uploaded public URLs.
  let productImages: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("product_images") ?? "[]"));
    if (Array.isArray(parsed)) {
      productImages = parsed
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .slice(0, 6);
    }
  } catch {
    productImages = [];
  }

  const urlOk = (u: string) => /^https?:\/\/.+\..+/.test(u);

  if (name.length < 2 || name.length > 80) {
    return { error: "Company name must be 2–80 characters." };
  }
  if (tagline.length > 140) return { error: "Tagline is too long (140 max)." };
  if (!pitch) return { error: "Add a short pitch — what your company does." };
  if (pitch.length > LONG_TEXT_MAX) {
    return { error: "Pitch is too long (about 200 words max)." };
  }
  if (!logoUrl) return { error: "Upload a company logo." };
  if (!productUrl || !urlOk(productUrl)) {
    return { error: "Add a valid product link (https://…)." };
  }
  if (productImages.length === 0) {
    return { error: "Add at least one product image." };
  }
  if (stage && !(STAGES as readonly string[]).includes(stage)) {
    return { error: "Invalid stage." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const slug = await uniqueOrgSlug(admin, name);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      slug,
      name,
      tagline: tagline || null,
      pitch,
      product_url: productUrl,
      product_images: productImages,
      logo_url: logoUrl,
      location: location || null,
      stage: stage || null,
      industry,
      capabilities,
      partnership_seeking: partnershipSeeking,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (orgError || !org) {
    console.error("[orgs.create]", orgError);
    return { error: "Couldn't create the company. Try again." };
  }

  // Membership insert is service-role only (RLS blocks direct client insert).
  const { error: memberError } = await admin.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
  });
  if (memberError) {
    console.error("[orgs.create.owner_member]", memberError);
    // Roll back the orphaned org so the user can retry cleanly.
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: "Couldn't create the company. Try again." };
  }

  revalidatePath("/orgs");
  redirect(`/orgs/${org.slug}`);
}

// ------------------------------------------------------------------
// INVITE a teammate by email (owner/admin only).
// ------------------------------------------------------------------
export async function inviteMemberAction(
  orgId: string,
  emailRaw: string,
  role: "admin" | "member",
): Promise<{ error?: string; ok?: boolean }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email." };
  }
  const safeRole = role === "admin" ? "admin" : "member";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // RLS (org_invites_insert_admins) enforces caller is owner/admin; we pass
  // invited_by = caller to satisfy the WITH CHECK. Upsert so re-inviting the
  // same email refreshes a prior declined/revoked row instead of erroring.
  const { error } = await supabase.from("org_invites").upsert(
    {
      org_id: orgId,
      email,
      role: safeRole,
      status: "pending",
      invited_by: user.id,
    },
    { onConflict: "org_id,email" },
  );

  if (error) {
    console.error("[orgs.invite]", error);
    return { error: "Couldn't send the invite. Are you an admin of this company?" };
  }

  revalidatePath(`/orgs`);
  return { ok: true };
}

// ------------------------------------------------------------------
// RESPOND to an invite (the invited person accepts / declines).
// ------------------------------------------------------------------
export async function respondInviteAction(
  inviteId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const myEmail = (user.email ?? "").toLowerCase();

  // Read the invite (RLS lets the invitee see their own by email).
  const { data: invite } = await supabase
    .from("org_invites")
    .select("id, org_id, email, role, status")
    .eq("id", inviteId)
    .maybeSingle();
  if (!invite || (invite.email as string).toLowerCase() !== myEmail) {
    return { error: "Invite not found." };
  }
  if (invite.status !== "pending") return { error: "Invite already handled." };

  const admin = createAdminClient();
  if (accept) {
    // Membership grant is service-role only.
    const { error: memberError } = await admin.from("org_members").upsert(
      {
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role === "admin" ? "admin" : "member",
      },
      { onConflict: "org_id,user_id" },
    );
    if (memberError) {
      console.error("[orgs.invite.accept]", memberError);
      return { error: "Couldn't join. Try again." };
    }
  }
  await admin
    .from("org_invites")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invite.id);

  revalidatePath("/orgs");
  return {};
}

// ------------------------------------------------------------------
// MANAGE members — change role / remove (owner/admin). Self-leave allowed.
// ------------------------------------------------------------------
export async function updateMemberRoleAction(
  orgId: string,
  userId: string,
  role: "owner" | "admin" | "member",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // RLS (org_members_update_admins) enforces caller is owner/admin.
  const { error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) {
    console.error("[orgs.role]", error);
    return { error: "Couldn't update role." };
  }
  revalidatePath(`/orgs`);
  return {};
}

export async function removeMemberAction(
  orgId: string,
  userId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // RLS (org_members_delete_admin_or_self): owner/admin removes anyone; a
  // member can remove themself.
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) {
    console.error("[orgs.remove]", error);
    return { error: "Couldn't remove member." };
  }
  revalidatePath(`/orgs`);
  return {};
}

// ------------------------------------------------------------------
// COMPANY <-> COMPANY connections (the gate for "นัดคุย" / scheduling).
// A member acts on behalf of their first company. Writes go through the
// service role (no insert/update RLS on org_connections), after verifying
// membership here — mirroring the org_members / org_invites design.
// ------------------------------------------------------------------

// The org the viewer acts as (their earliest-joined membership). Most users
// belong to 0 or 1 company; if several, we use the first.
async function viewerPrimaryOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.org_id as string | undefined) ?? null;
}

export async function requestConnectionAction(
  targetOrgId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const myOrg = await viewerPrimaryOrg(supabase, user.id);
  if (!myOrg) return { error: "Create a company first to connect." };
  if (myOrg === targetOrgId) return { error: "That's your own company." };
  if (!isUuid(targetOrgId)) return { error: "Couldn't send the request. Try again." };

  const admin = createAdminClient();
  // Either direction already on file?
  const { data: existing } = await admin
    .from("org_connections")
    .select("id, status")
    .or(
      `and(requester_org.eq.${myOrg},target_org.eq.${targetOrgId}),and(requester_org.eq.${targetOrgId},target_org.eq.${myOrg})`,
    )
    .maybeSingle();

  if (existing && existing.status !== "declined") {
    return { error: "A connection already exists." };
  }

  if (existing) {
    // Re-open a previously declined request from my side.
    await admin
      .from("org_connections")
      .update({
        requester_org: myOrg,
        target_org: targetOrgId,
        status: "pending",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    const { error } = await admin.from("org_connections").insert({
      requester_org: myOrg,
      target_org: targetOrgId,
      status: "pending",
      created_by: user.id,
    });
    if (error) {
      console.error("[orgs.connect.request]", error);
      return { error: "Couldn't send the request. Try again." };
    }
  }

  revalidatePath("/orgs");
  return { ok: true };
}

export async function respondConnectionAction(
  connectionId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("org_connections")
    .select("id, target_org, status")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn || conn.status !== "pending") {
    return { error: "Request not found." };
  }

  // Only a member of the TARGET company can accept / decline.
  const { data: membership } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", conn.target_org)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Not allowed." };

  await admin
    .from("org_connections")
    .update({
      status: accept ? "accepted" : "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  revalidatePath("/orgs");
  return {};
}

// Revoke a still-pending invite (owner/admin).
export async function revokeInviteAction(
  inviteId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // RLS (org_invites_update_admin_or_invitee) lets the org's admins update it.
  const { error } = await supabase
    .from("org_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("status", "pending");
  if (error) {
    console.error("[orgs.revoke]", error);
    return { error: "Couldn't revoke invite." };
  }
  revalidatePath(`/orgs`);
  return {};
}
