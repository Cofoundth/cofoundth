"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInvestorAccount } from "@/lib/account";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import { notifyUsers } from "@/lib/notify";
import { slugify } from "@/lib/slug";
import {
  bangkokInputToISO,
  MEETUP_CATEGORIES,
  MEETUP_TOPICS,
  type MeetupCategory,
  type MeetupTopic,
  type MeetupFormat,
} from "@/lib/meetups";

export type RsvpResult = {
  error?: string;
  going?: boolean;
  /** Private meetups: the row landed as a REQUEST, not a seat. */
  requested?: boolean;
  count?: number;
};

/** The viewer's own row on a meetup. 'requested' is a knock, not a seat. */
export type MyRsvp = "none" | "going" | "requested";
export type InviteStatus = "pending" | "accepted" | "declined";

// The room's size is the number of SEATS. Since 0072 a meetup_rsvps row can
// also be a pending request, so every count / roster / chat gate has to say
// 'going' explicitly — this is that clause, in one place.
type DbClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

async function goingCountOf(
  client: DbClient,
  meetupId: string,
): Promise<number> {
  const { count } = await client
    .from("meetup_rsvps")
    .select("user_id", { count: "exact", head: true })
    .eq("meetup_id", meetupId)
    .eq("status", "going");
  return count ?? 0;
}

// Toggle the caller's RSVP for a meetup. Runs on the user's RLS client:
// meetup_rsvps_insert_self / _delete_self enforce that a member can only touch
// their OWN row, so no service role is needed here.
//
// PUBLIC meetups: unchanged — the row goes in as 'going'.
// PRIVATE meetups (0072): private no longer means link-only, it means the HOST
// picks. The row goes in as 'requested' and the host is notified — unless the
// caller holds an ACCEPTED invite, which is the host having already said yes.
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
    .select(
      "id, slug, title, status, starts_at, capacity, created_by, visibility",
    )
    .eq("id", meetupId)
    .maybeSingle();
  if (!meetup) return { error: "Meetup not found." };
  if (meetup.status === "cancelled") return { error: "This meetup was cancelled." };
  if (new Date(meetup.starts_at as string).getTime() < Date.now()) {
    return { error: "This meetup has already happened." };
  }

  // A blocked pair never lands in the same room. This has to run BEFORE the
  // write, not just before the notification: the list and detail pages hide a
  // blocked host's meetup, but a server action is directly callable, and the
  // row that got in anyway was invisible to the host (their requester list
  // filters blocked ids) while still consuming a seat and unlocking the
  // attendee chat. "Meetup not found." is the same answer /meetups/[slug]
  // gives — a block does not announce itself.
  const hostId = meetup.created_by as string;
  const blockedWithHost =
    !!hostId && hostId !== user.id && (await isBlockedEitherWay(hostId, user.id));
  if (blockedWithHost) return { error: "Meetup not found." };

  if (going) {
    // One cheap PK lookup up front: it powers the capacity check below. It
    // used to carry the whole "only notify on FIRST join" rule too, which it
    // could not actually keep — un-RSVPing DELETES the row, so a
    // cancel/rejoin made `mine` null again and re-pinged the host. The real
    // guard is the notification dedupe further down.
    const { data: mine } = await supabase
      .from("meetup_rsvps")
      .select("user_id, status")
      .eq("meetup_id", meetupId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Private = ask the host, unless the host already asked YOU. An accepted
    // invite is pre-approval, so it lands a seat directly (capacity still
    // applies — an invite is not a reservation).
    const isPrivate = (meetup.visibility as string) === "private";
    let preApproved = !isPrivate;
    if (isPrivate) {
      const { data: invite } = await supabase
        .from("meetup_invites")
        .select("status")
        .eq("meetup_id", meetupId)
        .eq("invitee_id", user.id)
        .maybeSingle();
      preApproved = (invite?.status as string | undefined) === "accepted";
    }
    const nextStatus: "going" | "requested" = preApproved
      ? "going"
      : "requested";

    // Advisory capacity check, and only for a SEAT — a request costs nothing,
    // and a full private meetup still takes knocks (someone may leave). A race
    // at the very last seat is possible and acceptable at this scale.
    if (nextStatus === "going" && meetup.capacity != null) {
      const goingCount = await goingCountOf(supabase, meetupId);
      if (
        mine?.status !== "going" &&
        goingCount >= (meetup.capacity as number)
      ) {
        return { error: "This meetup is full." };
      }
    }

    // ON CONFLICT DO NOTHING, not DO UPDATE: 0072 deliberately gives the row's
    // owner no UPDATE policy (self-approval would be exactly that), so an
    // upsert that tried to overwrite an existing row would be refused by RLS.
    // An existing row simply stands — a requester cannot promote themselves.
    if (!mine) {
      const { error } = await supabase.from("meetup_rsvps").upsert(
        { meetup_id: meetupId, user_id: user.id, status: nextStatus },
        { onConflict: "meetup_id,user_id", ignoreDuplicates: true },
      );
      if (error) {
        console.error("[meetups.rsvp]", error);
        return { error: "Couldn't RSVP. Try again." };
      }
    }

    // Tell the host someone's coming — or knocking (their Notifications).
    // entity_id carries the meetup id; the deep link needs the slug, which
    // rides in data (entity_id is a bare uuid to notifHref).
    const notifType =
      nextStatus === "requested" ? "meetup_request" : "meetup_rsvp";
    if (!mine && hostId && hostId !== user.id) {
      // The blocked pair is already gone (checked above the write). What is
      // left is the dedupe, on the notification itself rather than on `mine`:
      // cancelling an RSVP deletes the row, so `mine` alone lets a
      // cancel/rejoin loop ping the host once per rejoin. Service role,
      // because the row belongs to the HOST and RLS scopes reads to the
      // recipient.
      //
      // The dedupe is only ever a SPAM guard, never a lifecycle one — a host
      // who answers a request clears their own notification (see
      // respondRequestAction), so a later knock rings again.
      const admin = createAdminClient();
      const { data: existingNotif } = await admin
        .from("notifications")
        .select("id")
        .eq("recipient_id", hostId)
        .eq("actor_id", user.id)
        .eq("type", notifType)
        .eq("entity_id", meetupId)
        .limit(1)
        .maybeSingle();
      if (!existingNotif) {
        const { data: me } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        await notifyUsers([hostId], {
          actorId: user.id,
          type: notifType,
          entityId: meetupId,
          data: {
            actor_name: (me?.full_name as string) ?? "A founder",
            slug: (meetup.slug as string) ?? "",
            title: (meetup.title as string) ?? "",
          },
        });
      }
    }

    const finalStatus = (mine?.status as string | undefined) ?? nextStatus;
    const count = await goingCountOf(supabase, meetupId);
    revalidatePath("/meetups");
    revalidatePath(`/meetups/${meetup.slug as string}`);
    return {
      going: finalStatus === "going",
      requested: finalStatus === "requested",
      count,
    };
  }

  // Cancel — deletes whichever row exists, seat or request.
  const { error } = await supabase
    .from("meetup_rsvps")
    .delete()
    .eq("meetup_id", meetupId)
    .eq("user_id", user.id);
  if (error) {
    console.error("[meetups.rsvp.cancel]", error);
    return { error: "Couldn't update your RSVP. Try again." };
  }

  const count = await goingCountOf(supabase, meetupId);
  revalidatePath("/meetups");
  revalidatePath(`/meetups/${meetup.slug as string}`);
  return { going: false, requested: false, count };
}

// ── The private door: requests, and invites ────────────────────────────────
// Three actions, one rule between them: the SEAT is only ever granted by
// someone entitled to grant it. Approving a request is the host's call and
// runs on the service role (0072 gives the requester no UPDATE policy, on
// purpose — a self-approve would otherwise be one PATCH away). Accepting an
// invite is the invitee's call, and the invite row is the host's earlier yes.

export type MeetupActionResult = { error?: string; ok?: boolean };

// Host answers one request. Service role, because the row being promoted
// belongs to the REQUESTER and they may not update it themselves.
export async function respondRequestAction(
  meetupId: string,
  userId: string,
  approve: boolean,
): Promise<MeetupActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: meetup } = await supabase
    .from("meetups")
    .select("id, slug, title, status, starts_at, capacity, created_by")
    .eq("id", meetupId)
    .maybeSingle();
  if (!meetup) return { error: "Meetup not found." };
  if ((meetup.created_by as string) !== user.id) {
    return { error: "Only the host can answer requests." };
  }
  if (meetup.status === "cancelled") {
    return { error: "This meetup was cancelled." };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("meetup_rsvps")
    .select("status")
    .eq("meetup_id", meetupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { error: "That request is no longer there." };
  if ((row.status as string) === "going") return { ok: true };

  if (approve) {
    if (meetup.capacity != null) {
      const goingCount = await goingCountOf(admin, meetupId);
      if (goingCount >= (meetup.capacity as number)) {
        return { error: "This meetup is full." };
      }
    }
    const { error } = await admin
      .from("meetup_rsvps")
      .update({ status: "going" })
      .eq("meetup_id", meetupId)
      .eq("user_id", userId);
    if (error) {
      console.error("[meetups.request.approve]", error);
      return { error: "Couldn't update that request. Try again." };
    }
  } else {
    // Declining DELETES the knock rather than parking a 'declined' status:
    // the founder can ask again later, and the host's list stays the list of
    // people actually waiting.
    const { error } = await admin
      .from("meetup_rsvps")
      .delete()
      .eq("meetup_id", meetupId)
      .eq("user_id", userId);
    if (error) {
      console.error("[meetups.request.decline]", error);
      return { error: "Couldn't update that request. Try again." };
    }
  }

  // The knock has been answered, so the host's "asked to join" notification is
  // spent — clear it. It is also what rsvpAction dedupes on, and request →
  // decline → request is a designed loop since 0072: leaving the old row in
  // place would make every later request from this founder silent (no bell, no
  // history entry), with nothing but the passive Requests list to notice it.
  await admin
    .from("notifications")
    .delete()
    .eq("recipient_id", user.id)
    .eq("actor_id", userId)
    .eq("type", "meetup_request")
    .eq("entity_id", meetupId);

  if (!(await isBlockedEitherWay(user.id, userId))) {
    const { data: me } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    await notifyUsers([userId], {
      actorId: user.id,
      type: approve ? "meetup_request_approved" : "meetup_request_declined",
      entityId: meetupId,
      data: {
        actor_name: (me?.full_name as string) ?? "The host",
        slug: (meetup.slug as string) ?? "",
        title: (meetup.title as string) ?? "",
      },
    });
  }

  revalidatePath("/meetups");
  revalidatePath(`/meetups/${meetup.slug as string}`);
  return { ok: true };
}

// Invite founders to a meetup you are going to. On a PUBLIC meetup the
// reference app lets any attendee bring people, not just the host, and the RLS
// insert policy says the same (0072: inviter must hold a 'going' row).
//
// PRIVATE meetups are host-only, and that is not a taste call: an accepted
// invite converts straight into a seat (respondInviteAction below), so on a
// private meetup an invite is not a suggestion, it is a KEY. One approved
// founder inviting twenty strangers into a room whose own copy promises "You
// choose who joins" — with no notification to the host and no way to remove
// them — is the host approval gate handing itself away. 0073 carries the same
// condition in the insert policy, because the insert below runs as admin.
export async function inviteFoundersAction(
  meetupId: string,
  inviteeIds: string[],
): Promise<MeetupActionResult & { invited?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (await isInvestorAccount(supabase, user.id)) {
    return { error: "Not authenticated." };
  }

  const ids = [...new Set(inviteeIds)].filter((id) => id && id !== user.id);
  if (ids.length === 0) return { error: "Pick at least one founder." };
  if (ids.length > 20) return { error: "Invite up to 20 founders at a time." };

  const { data: meetup } = await supabase
    .from("meetups")
    .select("id, slug, title, status, starts_at, created_by, visibility")
    .eq("id", meetupId)
    .maybeSingle();
  if (!meetup) return { error: "Meetup not found." };
  if (meetup.status === "cancelled") {
    return { error: "This meetup was cancelled." };
  }
  if (new Date(meetup.starts_at as string).getTime() < Date.now()) {
    return { error: "This meetup has already happened." };
  }
  if (
    (meetup.visibility as string) === "private" &&
    (meetup.created_by as string) !== user.id
  ) {
    return { error: "Only the host can invite people to a private meetup." };
  }

  const { data: mine } = await supabase
    .from("meetup_rsvps")
    .select("status")
    .eq("meetup_id", meetupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if ((mine?.status as string | undefined) !== "going") {
    return { error: "Join the meetup before you invite anyone." };
  }

  // Service role from here: an invite sent by ANOTHER attendee is invisible to
  // this caller under meetup_invites_select_parties, so an RLS read would miss
  // it and the insert would trip the primary key instead of being skipped.
  const admin = createAdminClient();
  const blocked = await getBlockedIds(user.id);
  const [{ data: existingRsvps }, { data: existingInvites }] =
    await Promise.all([
      admin
        .from("meetup_rsvps")
        .select("user_id")
        .eq("meetup_id", meetupId)
        .in("user_id", ids),
      admin
        .from("meetup_invites")
        .select("invitee_id")
        .eq("meetup_id", meetupId)
        .in("invitee_id", ids),
    ]);
  const already = new Set<string>([
    ...(existingRsvps ?? []).map((r) => r.user_id as string),
    ...(existingInvites ?? []).map((r) => r.invitee_id as string),
  ]);
  const fresh = ids.filter((id) => !already.has(id) && !blocked.has(id));
  if (fresh.length === 0) return { ok: true, invited: 0 };

  const { error } = await admin.from("meetup_invites").insert(
    fresh.map((id) => ({
      meetup_id: meetupId,
      inviter_id: user.id,
      invitee_id: id,
    })),
  );
  if (error) {
    console.error("[meetups.invite]", error);
    return { error: "Couldn't send those invites. Try again." };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  await notifyUsers(fresh, {
    actorId: user.id,
    type: "meetup_invite",
    entityId: meetupId,
    data: {
      actor_name: (me?.full_name as string) ?? "A founder",
      slug: (meetup.slug as string) ?? "",
      title: (meetup.title as string) ?? "",
    },
  });

  revalidatePath("/meetups");
  revalidatePath(`/meetups/${meetup.slug as string}`);
  return { ok: true, invited: fresh.length };
}

// Invitee answers. Accepting is the one path that turns an invite into a seat
// without the host touching anything — the invite row IS the host's yes.
export async function respondInviteAction(
  meetupId: string,
  accept: boolean,
): Promise<MeetupActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (await isInvestorAccount(supabase, user.id)) {
    return { error: "Not authenticated." };
  }

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("meetup_invites")
    .select("status, inviter_id")
    .eq("meetup_id", meetupId)
    .eq("invitee_id", user.id)
    .maybeSingle();
  if (!invite) return { error: "That invite is no longer there." };
  // 'declined' is a closed door, not a label. Without this the row stays
  // answerable forever — decline, then accept a week later — and there is no
  // withdraw affordance for the inviter to close it with.
  if ((invite.status as string) !== "pending") {
    return { error: "That invite was already answered." };
  }

  const { data: meetup } = await supabase
    .from("meetups")
    .select("id, slug, status, starts_at, capacity, created_by")
    .eq("id", meetupId)
    .maybeSingle();
  if (!meetup) return { error: "Meetup not found." };

  // Re-check the block at the moment the seat is granted, not only when the
  // invite was sent: the send path filters getBlockedIds, but a block placed
  // BETWEEN invite and accept has to hold too — and this is a service-role
  // write, so 0073's RLS predicate never sees it. Both pairs matter: the
  // inviter (who may not be the host) and the host, whose room it is.
  const inviterId = invite.inviter_id as string;
  const hostId = meetup.created_by as string;
  const [blockedInviter, blockedHost] = await Promise.all([
    inviterId === user.id
      ? Promise.resolve(false)
      : isBlockedEitherWay(inviterId, user.id),
    !hostId || hostId === user.id
      ? Promise.resolve(false)
      : isBlockedEitherWay(hostId, user.id),
  ]);
  if (blockedInviter || blockedHost) {
    return { error: "That invite is no longer there." };
  }

  if (accept) {
    if (meetup.status === "cancelled") {
      return { error: "This meetup was cancelled." };
    }
    if (new Date(meetup.starts_at as string).getTime() < Date.now()) {
      return { error: "This meetup has already happened." };
    }
    if (meetup.capacity != null) {
      const goingCount = await goingCountOf(admin, meetupId);
      if (goingCount >= (meetup.capacity as number)) {
        return { error: "This meetup is full." };
      }
    }
    // The seat first, the bookkeeping second: if the insert fails the invite
    // stays 'pending' and the founder can try again, rather than reading as
    // accepted with no seat behind it.
    const { error: seatErr } = await admin.from("meetup_rsvps").upsert(
      { meetup_id: meetupId, user_id: user.id, status: "going" },
      { onConflict: "meetup_id,user_id" },
    );
    if (seatErr) {
      console.error("[meetups.invite.accept]", seatErr);
      return { error: "Couldn't join the meetup. Try again." };
    }
  }

  const { error } = await admin
    .from("meetup_invites")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("meetup_id", meetupId)
    .eq("invitee_id", user.id);
  if (error) {
    console.error("[meetups.invite.respond]", error);
    return { error: "Couldn't answer that invite. Try again." };
  }

  revalidatePath("/meetups");
  revalidatePath(`/meetups/${meetup.slug as string}`);
  return { ok: true };
}

export type FounderHit = {
  id: string;
  slug: string | null;
  full_name: string | null;
  photo_url: string | null;
};

// Typeahead for the invite panel. Same founder-pool row filters as the browse
// directory (lib/public-profile.ts documents them), minus everyone who is
// already in the room or already asked.
export async function searchFoundersAction(
  meetupId: string,
  q: string,
): Promise<{ error?: string; results?: FounderHit[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Only someone who could actually SEND the invite may enumerate the pool —
  // which on a private meetup is the host alone, matching inviteFoundersAction.
  const [{ data: mine }, { data: meetup }] = await Promise.all([
    supabase
      .from("meetup_rsvps")
      .select("status")
      .eq("meetup_id", meetupId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("meetups")
      .select("visibility, created_by")
      .eq("id", meetupId)
      .maybeSingle(),
  ]);
  if ((mine?.status as string | undefined) !== "going") {
    return { error: "Join the meetup before you invite anyone." };
  }
  if (
    (meetup?.visibility as string | undefined) === "private" &&
    (meetup?.created_by as string | undefined) !== user.id
  ) {
    return { error: "Only the host can invite people to a private meetup." };
  }

  // % and _ are ILIKE wildcards and a comma is a PostgREST list separator —
  // strip all three so a typed query stays a literal name search.
  const term = q.replace(/[%_,]/g, " ").trim();
  if (term.length < 1) return { results: [] };

  const admin = createAdminClient();
  const [{ data: rows }, blocked, { data: rsvpRows }, { data: inviteRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, slug, full_name, photo_url")
        .eq("profile_complete", true)
        .eq("suspended", false)
        .eq("account_type", "founder")
        .not("is_bot", "is", true)
        .neq("id", user.id)
        .ilike("full_name", `%${term}%`)
        .order("full_name", { ascending: true })
        .limit(40),
      getBlockedIds(user.id),
      admin.from("meetup_rsvps").select("user_id").eq("meetup_id", meetupId),
      admin
        .from("meetup_invites")
        .select("invitee_id")
        .eq("meetup_id", meetupId),
    ]);

  const taken = new Set<string>([
    ...(rsvpRows ?? []).map((r) => r.user_id as string),
    ...(inviteRows ?? []).map((r) => r.invitee_id as string),
  ]);
  const results = (rows ?? [])
    .filter((p) => !taken.has(p.id as string) && !blocked.has(p.id as string))
    .slice(0, 8)
    .map((p) => ({
      id: p.id as string,
      slug: (p.slug as string | null) ?? null,
      full_name: (p.full_name as string | null) ?? null,
      photo_url: (p.photo_url as string | null) ?? null,
    }));
  return { results };
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
  const topic = String(formData.get("topic") ?? "");
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
  // Required for anything created through the wizard. The COLUMN stays
  // nullable (legacy rows have no topic) — the requirement lives here, at the
  // only place that writes new ones.
  if (!(topic in MEETUP_TOPICS)) {
    return { error: "Pick a topic." };
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
      topic: topic as MeetupTopic,
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
    status: "going",
  });

  revalidatePath("/meetups");
  revalidatePath("/dashboard");
  redirect(`/meetups/${created.slug}`);
}

// Report a meetup into the same moderation queue posts and profiles use.
// Runs on the user's RLS client — the reports insert policy already scopes
// reporter_id to auth.uid(), so no service role is involved.
export async function reportMeetupAction(
  meetupId: string,
  reason: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const clean = reason.trim();
  if (clean.length < 5 || clean.length > 1000) {
    return { error: "Tell us a little more (5–1000 characters)." };
  }
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_kind: "meetup",
    target_id: meetupId,
    reason: clean,
  });
  if (error) {
    console.error("[meetups.report]", error);
    return { error: "Couldn't send the report. Try again." };
  }
  return { ok: true };
}

// Post into a meetup's attendee chat. RLS is the gate — the insert policy
// requires the caller's own RSVP row — so this runs on the user's client and
// a non-attendee (or investor, who can never RSVP) is refused by Postgres.
export async function postMeetupMessageAction(
  meetupId: string,
  content: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const clean = content.trim();
  if (clean.length < 1 || clean.length > 2000) {
    return { error: "Message must be 1–2000 characters." };
  }
  const { error } = await supabase.from("meetup_messages").insert({
    meetup_id: meetupId,
    author_id: user.id,
    content: clean,
  });
  if (error) {
    // RLS refusal lands here — the honest copy for the only real cause.
    return { error: "Join the meetup to chat with the attendees." };
  }
  return { ok: true };
}
