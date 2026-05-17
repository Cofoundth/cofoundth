// Server-side Google Calendar API helpers.
//
// Requires: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, SUPABASE_SECRET_KEY
// Tokens are stored in `user_google_tokens` table.

import { createClient as createAdminClient } from "@supabase/supabase-js";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY — required for Google token storage.",
    );
  }
  return createAdminClient(url, key);
}

type StoredTokens = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
};

export async function getStoredTokens(
  userId: string,
): Promise<StoredTokens | null> {
  const { data } = await admin()
    .from("user_google_tokens")
    .select("user_id, access_token, refresh_token, expires_at, scope")
    .eq("user_id", userId)
    .maybeSingle();
  return data as StoredTokens | null;
}

export async function storeTokens(opts: {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number; // seconds
  scope?: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + opts.expiresIn * 1000).toISOString();
  await admin()
    .from("user_google_tokens")
    .upsert(
      {
        user_id: opts.userId,
        access_token: opts.accessToken,
        // Only overwrite refresh_token if we got one (Google sends it only on first consent).
        ...(opts.refreshToken ? { refresh_token: opts.refreshToken } : {}),
        expires_at: expiresAt,
        scope: opts.scope ?? null,
      },
      { onConflict: "user_id" },
    );
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number; scope?: string }> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET env vars.",
    );
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return {
    accessToken: json.access_token as string,
    expiresIn: json.expires_in as number,
    scope: json.scope as string | undefined,
  };
}

export async function getValidAccessToken(
  userId: string,
): Promise<string | null> {
  const stored = await getStoredTokens(userId);
  if (!stored) return null;

  const expiresAt = new Date(stored.expires_at).getTime();
  // Refresh if within 2 minutes of expiry
  if (expiresAt - Date.now() > 2 * 60_000) {
    return stored.access_token;
  }

  if (!stored.refresh_token) {
    // Token expired and no refresh token — user needs to reconnect
    return null;
  }

  try {
    const fresh = await refreshAccessToken(stored.refresh_token);
    await storeTokens({
      userId,
      accessToken: fresh.accessToken,
      refreshToken: null, // refresh tokens persist across refreshes
      expiresIn: fresh.expiresIn,
      scope: fresh.scope,
    });
    return fresh.accessToken;
  } catch (e) {
    console.error("[google-calendar] refresh failed", e);
    return null;
  }
}

// ---- Calendar event creation ----------------------------------------

export type CreateEventInput = {
  userId: string;
  summary: string;
  description?: string;
  startISO: string; // ISO timestamp
  endISO: string;
  attendeeEmails?: string[];
  timeZone?: string;
};

export type CreatedEvent = {
  eventId: string;
  htmlLink: string;
  meetLink: string | null;
  start: string;
  end: string;
};

export async function createCalendarEvent(
  input: CreateEventInput,
): Promise<CreatedEvent> {
  const token = await getValidAccessToken(input.userId);
  if (!token) {
    throw new Error(
      "Google Calendar is not connected for this user (no valid access token).",
    );
  }

  const requestId = `cofound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const body = {
    summary: input.summary,
    description: input.description,
    start: {
      dateTime: input.startISO,
      timeZone: input.timeZone ?? "Asia/Bangkok",
    },
    end: {
      dateTime: input.endISO,
      timeZone: input.timeZone ?? "Asia/Bangkok",
    },
    attendees: (input.attendeeEmails ?? []).map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };

  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar event create failed (${res.status}): ${text}`);
  }

  const event = await res.json();
  const meetLink =
    (event.hangoutLink as string | undefined) ??
    (event.conferenceData?.entryPoints?.find(
      (p: { entryPointType?: string; uri?: string }) =>
        p.entryPointType === "video",
    )?.uri as string | undefined) ??
    null;

  return {
    eventId: event.id as string,
    htmlLink: event.htmlLink as string,
    meetLink: meetLink ?? null,
    start: event.start?.dateTime as string,
    end: event.end?.dateTime as string,
  };
}

export async function hasGoogleCalendarConnected(
  userId: string,
): Promise<boolean> {
  const stored = await getStoredTokens(userId);
  if (!stored) return false;
  // Check scope includes calendar.events
  return (stored.scope ?? "").includes(
    "https://www.googleapis.com/auth/calendar.events",
  );
}
