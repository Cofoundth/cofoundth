"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  createCalendarEvent,
  hasGoogleCalendarConnected,
} from "@/lib/google-calendar";

export type ScheduleState =
  | { error?: string; ok?: boolean; meetLink?: string | null }
  | null;

export async function scheduleCallAction(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const matchId = String(formData.get("matchId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = parseInt(String(formData.get("duration") ?? "30"), 10);

  if (!matchId) return { error: "Missing match." };
  if (!date || !time) return { error: "Please pick a date and time." };
  if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 480) {
    return { error: "Duration must be between 1 and 480 minutes." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Confirm the user is in this match
  const { data: match } = await supabase
    .from("matches")
    .select("id, profile_a_id, profile_b_id")
    .eq("id", matchId)
    .single();
  if (!match) return { error: "Match not found." };

  const otherId =
    match.profile_a_id === user.id
      ? (match.profile_b_id as string)
      : (match.profile_a_id as string);

  // Check Google Calendar is connected
  const hasGoogle = await hasGoogleCalendarConnected(user.id);
  if (!hasGoogle) {
    return {
      error:
        "Google Calendar isn't connected. Sign in with Google (with Calendar permission) to enable scheduling.",
    };
  }

  // Build start/end times — interpret inputs as local time in Bangkok
  const startLocal = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(startLocal.getTime())) {
    return { error: "Invalid date or time." };
  }
  const endLocal = new Date(startLocal.getTime() + durationMin * 60_000);

  // Look up other party's email (admin client only)
  let otherEmail: string | null = null;
  let otherName = "your match";
  try {
    if (process.env.SUPABASE_SECRET_KEY) {
      const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const admin = createAdminClient(adminUrl, process.env.SUPABASE_SECRET_KEY);
      const [{ data: otherUser }, { data: otherProfile }] = await Promise.all([
        admin.auth.admin.getUserById(otherId),
        admin.from("profiles").select("full_name").eq("id", otherId).single(),
      ]);
      otherEmail = otherUser?.user?.email ?? null;
      otherName = (otherProfile?.full_name as string) ?? otherName;
    }
  } catch (e) {
    console.error("[scheduleCallAction] lookup other party failed", e);
  }

  // Create Calendar event with Meet link
  let event;
  try {
    event = await createCalendarEvent({
      userId: user.id,
      summary: `Co-founder intro call: ${otherName}`,
      description:
        "Co-founder intro call via CoFound.th. Discuss vision, skills, and fit.",
      startISO: startLocal.toISOString(),
      endISO: endLocal.toISOString(),
      attendeeEmails: otherEmail ? [otherEmail] : [],
      timeZone: "Asia/Bangkok",
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `Couldn't create event: ${e.message}`
          : "Couldn't create event.",
    };
  }

  // Send a message in chat with the details
  const when = startLocal.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  const messageContent = [
    `📅 Scheduled a ${durationMin}-min call for ${when} Bangkok time.`,
    event.meetLink ? `Google Meet: ${event.meetLink}` : null,
    `Calendar event: ${event.htmlLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: user.id,
    content: messageContent,
  });

  revalidatePath(`/messages/${matchId}`);
  return { ok: true, meetLink: event.meetLink };
}
