"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";
import { MESSAGE_MAX } from "@/lib/limits";
import type { OrgMsg } from "./chat-types";

// Returns the caller's org within this accepted connection, or null if the
// connection isn't accepted or the caller isn't a member of either side.
async function callerOrgInConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  connectionId: string,
  userId: string,
): Promise<string | null> {
  const { data: conn } = await admin
    .from("org_connections")
    .select("requester_org, target_org, status")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn || conn.status !== "accepted") return null;
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .in("org_id", [conn.requester_org as string, conn.target_org as string])
    .limit(1)
    .maybeSingle();
  return (membership?.org_id as string | undefined) ?? null;
}

// Drop control characters (but keep tab / newline / CR) so an invisible-only
// message can't slip past the empty check below.
function cleanMessage(raw: string): string {
  return [...raw]
    .filter((c) => {
      const n = c.codePointAt(0) ?? 0;
      return n === 9 || n === 10 || n === 13 || n >= 32;
    })
    .join("")
    .trim()
    .slice(0, MESSAGE_MAX);
}

export async function sendOrgMessageAction(
  connectionId: string,
  body: string,
): Promise<{ error?: string }> {
  if (!isUuid(connectionId)) return { error: "Invalid conversation." };
  const text = cleanMessage(body);
  if (!text) return { error: "Write a message first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const myOrg = await callerOrgInConnection(
    supabase,
    admin,
    connectionId,
    user.id,
  );
  if (!myOrg) {
    return { error: "You can only message companies you're connected with." };
  }

  const { error } = await admin.from("org_messages").insert({
    connection_id: connectionId,
    sender_id: user.id,
    sender_org: myOrg,
    body: text,
  });
  if (error) {
    console.error("[orgchat.send]", error);
    return { error: "Couldn't send. Try again." };
  }
  return {};
}

export async function fetchOrgMessagesAction(
  connectionId: string,
): Promise<OrgMsg[]> {
  if (!isUuid(connectionId)) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // RLS (org_messages_select) restricts this to members of either org in the
  // connection — a non-member gets nothing back even with a guessed id.
  const { data: rows } = await supabase
    .from("org_messages")
    .select("id, sender_id, sender_org, body, created_at")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true })
    .limit(500);

  const msgs = rows ?? [];
  if (msgs.length === 0) return [];

  // Resolve sender + company names in two small batched lookups (avoids fragile
  // PostgREST embed typing).
  const senderIds = [...new Set(msgs.map((m) => m.sender_id as string))];
  const orgIds = [...new Set(msgs.map((m) => m.sender_org as string))];
  const [{ data: people }, { data: orgs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", senderIds),
    supabase.from("organizations").select("id, name").in("id", orgIds),
  ]);
  const nameById = new Map(
    (people ?? []).map((p) => [p.id as string, p.full_name as string | null]),
  );
  const orgById = new Map(
    (orgs ?? []).map((o) => [o.id as string, o.name as string | null]),
  );

  return msgs.map((m) => ({
    id: m.id as string,
    sender_id: m.sender_id as string,
    sender_name: nameById.get(m.sender_id as string) ?? "Member",
    sender_org: m.sender_org as string,
    sender_org_name: orgById.get(m.sender_org as string) ?? "",
    body: m.body as string,
    created_at: m.created_at as string,
  }));
}
