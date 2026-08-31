"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { bangkokInputToISO, type MeetupFormat, type MeetupStatus } from "@/lib/meetups";

export type MeetupFormState = { error: string } | undefined;

// Admin gate for every mutation here. Throws (caught by the framework) rather
// than returning, so a non-admin never reaches the service-role client.
async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) throw new Error("Forbidden");
  return user!.id;
}

const urlOk = (u: string) => /^https?:\/\/.+\..+/.test(u);

type ParsedMeetup = {
  title: string;
  description: string | null;
  format: MeetupFormat;
  location: string | null;
  online_url: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: MeetupStatus;
};

function parseForm(formData: FormData): ParsedMeetup | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const format = String(formData.get("format") ?? "in_person");
  const location = String(formData.get("location") ?? "").trim();
  const onlineUrl = String(formData.get("online_url") ?? "").trim();
  const startsRaw = String(formData.get("starts_at") ?? "").trim();
  const endsRaw = String(formData.get("ends_at") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const status = String(formData.get("status") ?? "published");

  if (title.length < 2 || title.length > 120) {
    return { error: "Title must be 2–120 characters." };
  }
  if (description.length > 5000) {
    return { error: "Description is too long (5000 max)." };
  }
  if (format !== "in_person" && format !== "online") {
    return { error: "Pick a format." };
  }
  if (format === "online" && onlineUrl && !urlOk(onlineUrl)) {
    return { error: "Enter a valid meeting link (https://…)." };
  }

  const starts_at = bangkokInputToISO(startsRaw);
  if (!starts_at) return { error: "Pick a start date and time." };

  let ends_at: string | null = null;
  if (endsRaw) {
    ends_at = bangkokInputToISO(endsRaw);
    if (!ends_at) return { error: "End time is invalid." };
    if (new Date(ends_at).getTime() <= new Date(starts_at).getTime()) {
      return { error: "End time must be after the start time." };
    }
  }

  let capacity: number | null = null;
  if (capacityRaw) {
    const n = parseInt(capacityRaw, 10);
    if (!Number.isFinite(n) || n < 1 || n > 100000) {
      return { error: "Capacity must be a number between 1 and 100000." };
    }
    capacity = n;
  }

  if (!["draft", "published", "cancelled"].includes(status)) {
    return { error: "Invalid status." };
  }

  return {
    title,
    description: description || null,
    format,
    location: format === "in_person" ? location || null : null,
    online_url: format === "online" ? onlineUrl || null : null,
    starts_at,
    ends_at,
    capacity,
    status: status as MeetupStatus,
  };
}

// Unique slug from the title. Thai titles slugify to "" → fall back to "meetup".
async function uniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  title: string,
): Promise<string> {
  let base = slugify(title);
  if (base.length < 3) base = base ? `${base}-meetup` : "meetup";
  let candidate = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await admin
      .from("meetups")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`.slice(0, 50);
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`.slice(0, 50);
}

export async function createMeetupAction(
  _prev: MeetupFormState,
  formData: FormData,
): Promise<MeetupFormState> {
  const adminId = await requireAdmin();
  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, parsed.title);

  const { error } = await admin
    .from("meetups")
    .insert({ ...parsed, slug, created_by: adminId });
  if (error) {
    console.error("[admin.meetups.create]", error);
    return { error: "Couldn't create the meetup. Try again." };
  }

  revalidatePath("/meetups");
  revalidatePath("/admin/meetups");
  redirect("/admin/meetups");
}

export async function updateMeetupAction(
  id: string,
  _prev: MeetupFormState,
  formData: FormData,
): Promise<MeetupFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("meetups")
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !updated) {
    console.error("[admin.meetups.update]", error);
    return { error: "Couldn't save the meetup. Try again." };
  }

  revalidatePath("/meetups");
  revalidatePath(`/meetups/${updated.slug as string}`);
  revalidatePath("/admin/meetups");
  redirect("/admin/meetups");
}

// Soft-off: keeps the row + RSVPs so attendees see it's cancelled.
export async function cancelMeetupAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("meetups")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !updated) {
    console.error("[admin.meetups.cancel]", error);
    return { error: "Couldn't cancel the meetup." };
  }
  revalidatePath("/meetups");
  revalidatePath(`/meetups/${updated.slug as string}`);
  revalidatePath("/admin/meetups");
  return {};
}

export async function deleteMeetupAction(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("meetups").delete().eq("id", id);
  if (error) {
    console.error("[admin.meetups.delete]", error);
    return;
  }
  revalidatePath("/meetups");
  revalidatePath("/admin/meetups");
  redirect("/admin/meetups");
}
