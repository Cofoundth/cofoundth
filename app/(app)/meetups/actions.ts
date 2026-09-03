"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInvestorAccount } from "@/lib/account";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import {
  bangkokInputToISO,
  MEETUP_CATEGORIES,
  type MeetupCategory,
  type MeetupFormat,
} from "@/lib/meetups";

export type RsvpResult = { error?: string; going?: boolean; count?: number };

// Toggle the caller's RSVP for a meetup. Runs on the user's RLS client:
// meetup_rsvps_insert_self / _delete_self enforce that a member can only touch
// their OWN row, so no service role is needed here.
export async function rsvpAction(
  meetupId: string,
  going: boolean,
): Promise<RsvpResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Investors read the founder community but do not act in it — the same rule
  // the forum composer follows. Routing already hides the button; this is the
  // boundary that actually holds.
  if (await isInvestorAccount(supabase, user.id)) {
    return { error: "Not authenticated." };
  }

  // RLS hides drafts; a cancelled or already-passed meetup can't be joined.
  const { data: meetup } = await supabase
    .from("meetups")
    .select("id, slug, status, starts_at, capacity")
    .eq("id", meetupId)
    .maybeSingle();
  if (!meetup) return { error: "Meetup not found." };
  if (meetup.status === "cancelled") return { error: "This meetup was cancelled." };
  if (new Date(meetup.starts_at as string).getTime() < Date.now()) {
    return { error: "This meetup has already happened." };
  }

  if (going) {
    // Advisory capacity check. A race at the very last seat is possible and
    // acceptable at this scale; the (meetup_id,user_id) PK makes a double-RSVP
    // an idempotent upsert rather than a duplicate.
    if (meetup.capacity != null) {
      const [{ count: goingCount }, { data: mine }] = await Promise.all([
        supabase
          .from("meetup_rsvps")
          .select("user_id", { count: "exact", head: true })
          .eq("meetup_id", meetupId),
        supabase
          .from("meetup_rsvps")
          .select("user_id")
          .eq("meetup_id", meetupId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!mine && (goingCount ?? 0) >= (meetup.capacity as number)) {
        return { error: "This meetup is full." };
      }
    }
    const { error } = await supabase.from("meetup_rsvps").upsert(
      { meetup_id: meetupId, user_id: user.id, status: "going" },
      { onConflict: "meetup_id,user_id" },
    );
    if (error) {
      console.error("[meetups.rsvp]", error);
      return { error: "Couldn't RSVP. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("meetup_rsvps")
      .delete()
      .eq("meetup_id", meetupId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[meetups.rsvp.cancel]", error);
      return { error: "Couldn't update your RSVP. Try again." };
    }
  }

  const { count } = await supabase
    .from("meetup_rsvps")
    .select("user_id", { count: "exact", head: true })
    .eq("meetup_id", meetupId);

  revalidatePath("/meetups");
  revalidatePath(`/meetups/${meetup.slug as string}`);
  return { going, count: count ?? 0 };
}

// ── Founder-facing hosting ─────────────────────────────────────────────────
// The admin keeps its own actions in app/(app)/admin/meetups/actions.ts; this
// differs where the audience does: any FOUNDER may host (investors read
// meetups but never write into the founder community — same line rsvpAction
// draws above), there is no status field (a hosted meetup publishes
// immediately; drafts are an editorial tool and members aren't editors), and
// the host RSVPs to their own meetup on create — a host who isn't going is a
// data bug, and Onfound's own cards count the host in "going".
//
// parse/slug logic is duplicated from the admin actions on purpose: both
// modules are "use server", so importing helpers across them would expose the
// admin module's surface here. ~60 lines of duplication buys a hard
// permission boundary.

export type HostMeetupState = { error: string } | undefined;

const urlOk = (u: string) => /^https?:\/\/.+\..+/.test(u);

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

export async function hostMeetupAction(
  _prev: HostMeetupState,
  formData: FormData,
): Promise<HostMeetupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to host a meetup." };
  // Investors read the meetup calendar but do not write into the founder
  // community — the same boundary /community/new enforces.
  if (await isInvestorAccount(supabase, user.id)) {
    return { error: "Investor accounts can't host meetups." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const format = String(formData.get("format") ?? "in_person");
  const location = String(formData.get("location") ?? "").trim();
  const onlineUrl = String(formData.get("online_url") ?? "").trim();
  const startsRaw = String(formData.get("starts_at") ?? "").trim();
  const endsRaw = String(formData.get("ends_at") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  const cover = formData.get("cover");

  if (title.length < 2 || title.length > 120) {
    return { error: "Title must be 2–120 characters." };
  }
  if (description.length > 5000) {
    return { error: "Description is too long (5000 max)." };
  }
  if (!(category in MEETUP_CATEGORIES)) {
    return { error: "Pick a category." };
  }
  if (format !== "in_person" && format !== "online") {
    return { error: "Pick a format." };
  }
  if (format === "online" && onlineUrl && !urlOk(onlineUrl)) {
    return { error: "Enter a valid meeting link (https://…)." };
  }

  const starts_at = bangkokInputToISO(startsRaw);
  if (!starts_at) return { error: "Pick a start date and time." };
  if (new Date(starts_at).getTime() < Date.now()) {
    return { error: "Pick a time in the future." };
  }

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
    if (!Number.isFinite(n) || n < 2 || n > 500) {
      return { error: "Capacity must be between 2 and 500." };
    }
    capacity = n;
  }

  if (visibility !== "public" && visibility !== "private") {
    return { error: "Invalid visibility." };
  }
  // The pin is optional and only powers the map; free-text location stays the
  // human-readable truth. Both-or-neither, and bounded to plausible Earth.
  let lat: number | null = null;
  let lng: number | null = null;
  if (latRaw || lngRaw) {
    lat = Number(latRaw);
    lng = Number(lngRaw);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return { error: "Map pin is invalid." };
    }
  }

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, title);

  // Optional cover upload → the public meetup-covers bucket. The bucket caps
  // size (2MB) and MIME (jpeg/png/webp) server-side; this trusts those caps
  // rather than re-implementing them. No cover → the category SVG fallback.
  let image_url: string | null = null;
  if (cover instanceof File && cover.size > 0) {
    if (cover.size > 2 * 1024 * 1024) {
      return { error: "Cover image must be under 2MB." };
    }
    const ext =
      cover.type === "image/png"
        ? "png"
        : cover.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${slug}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("meetup-covers")
      .upload(path, cover, { contentType: cover.type || "image/jpeg" });
    if (upErr) return { error: "Could not upload the cover image." };
    image_url = admin.storage.from("meetup-covers").getPublicUrl(path).data
      .publicUrl;
  }

  const { data: created, error } = await admin
    .from("meetups")
    .insert({
      slug,
      title,
      description: description || null,
      category: category as MeetupCategory,
      format: format as MeetupFormat,
      location: format === "in_person" ? location || null : null,
      online_url: format === "online" ? onlineUrl || null : null,
      starts_at,
      ends_at,
      capacity,
      status: "published",
      image_url,
      visibility,
      lat,
      lng,
      created_by: user.id,
    })
    .select("id, slug")
    .single();
  if (error || !created) {
    return { error: "Could not create the meetup. Try again." };
  }

  // The host is going to their own meetup — count them from the start.
  await admin.from("meetup_rsvps").insert({
    meetup_id: created.id,
    user_id: user.id,
  });

  revalidatePath("/meetups");
  revalidatePath("/dashboard");
  redirect(`/meetups/${created.slug}`);
}
