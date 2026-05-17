"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postScheduleNoticeAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = parseInt(String(formData.get("duration") ?? "30"), 10);

  if (!matchId || !date || !time) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Confirm match exists and user is a party (RLS will also enforce)
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .single();
  if (!match) return;

  const startLocal = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(startLocal.getTime())) return;

  const when = startLocal.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  const content =
    `📅 Proposed a ${durationMin}-min call for ${when} (Bangkok time).\n` +
    `Check your email for the Google Calendar invite — accept it and the event lands on your calendar with the Meet link.`;

  await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: user.id, content });

  revalidatePath(`/messages/${matchId}`);
}
