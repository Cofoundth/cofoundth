import { getBlockedIds } from "@/lib/blocking";
import { loadMeetupChat } from "@/lib/meetup-data";
import { isUuid } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: RouteContext<"/api/meetups/[id]/chat">) {
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const [{ data: meetup }, { data: seat }, blocked] = await Promise.all([
    supabase.from("meetups").select("status, created_by").eq("id", id).maybeSingle(),
    supabase.from("meetup_rsvps").select("status").eq("meetup_id", id).eq("user_id", user.id).maybeSingle(),
    getBlockedIds(user.id),
  ]);
  if (meetup?.status !== "published" || seat?.status !== "going" || blocked.has(meetup.created_by)) {
    return new Response(null, { status: 403 });
  }

  const messages = await loadMeetupChat(supabase, id, blocked);
  if (!messages) return new Response(null, { status: 503 });

  return Response.json(messages, { headers: { "Cache-Control": "private, no-store" } });
}
