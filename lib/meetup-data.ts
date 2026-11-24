import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Meetup } from "@/lib/meetups";

type DbClient = Awaited<ReturnType<typeof createClient>>;
type Venue = Pick<Meetup, "location" | "online_url" | "lat" | "lng">;

export async function privateMeetupVenues(client: DbClient, ids: string[]) {
  if (!ids.length) return new Map<string, Venue>();

  const { data } = await client
    .from("meetup_private_details")
    .select("meetup_id, location, online_url, lat, lng")
    .in("meetup_id", ids);

  return new Map<string, Venue>(
    (data ?? []).map(({ meetup_id, ...venue }) => [meetup_id, venue]),
  );
}

export type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    slug: string | null;
    full_name: string | null;
    photo_url: string | null;
  } | null;
};

export async function loadMeetupChat(
  client: DbClient,
  meetupId: string,
  blocked: Set<string>,
) {
  const { data, error } = await client
    .from("meetup_messages")
    .select("id, content, created_at, author:profiles(id, slug, full_name, photo_url)")
    .eq("meetup_id", meetupId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);

  if (error) return null;
  return (data as unknown as ChatMessage[])
    .filter((message) => !message.author || !blocked.has(message.author.id))
    .reverse();
}
