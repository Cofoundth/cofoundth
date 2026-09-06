"use client";

// The meetup DOOR, in one component — used by the dialog on /meetups and by
// the /meetups/[slug] page, which used to carry two different RSVP controls
// that could disagree with each other.
//
// It renders four things that are really one question ("can I be in this
// room, and who decides?"):
//
//   public          Join / You're going, exactly as before.
//   private         Request to join → "Requested · waiting for the host".
//                   0072 turned private from link-only into ask-the-host, so
//                   the button that used to say "Join" now knocks.
//   host            the Requests (n) list, with Approve / Decline.
//   going or host   Invite founders — the reference app lets any attendee
//                   bring people, and the RLS insert policy says the same.
//
// Plus "Contact the host", which is the one affordance that works in every
// state: a match becomes a DM link, everyone else gets the express-interest
// route, because our messaging needs mutual interest before it unlocks.
//
// OPTIMISTIC: the dialog owns a count override per meetup, so every mutation
// reports back through onChange. Server state arriving from a revalidate wins
// — see the signature reset below.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Lock, MessageCircle, Plus, UserPlus } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { Avatar } from "@/components/Avatar";
import { Button, Input } from "@/components/ui";
import {
  inviteFoundersAction,
  respondInviteAction,
  respondRequestAction,
  rsvpAction,
  searchFoundersAction,
  type FounderHit,
  type InviteStatus,
  type MyRsvp,
} from "./actions";

export type JoinPerson = {
  id: string;
  slug: string | null;
  full_name: string | null;
  photo_url: string | null;
};

export type MeetupViewerState = {
  isHost: boolean;
  /** The viewer's own meetup_rsvps row. 'requested' is a knock, not a seat. */
  mine: MyRsvp;
  invite: InviteStatus | null;
  /** SEATS only — 'requested' rows are never counted. */
  count: number;
  capacity: number | null;
  visibility: "public" | "private";
  /** A mutual match with the host → messaging is already unlocked. */
  hostMatchId: string | null;
  hostSlug: string | null;
  blockedHost?: boolean;
  /** Host view only: who is waiting at the door. */
  requesters?: JoinPerson[];
};

type Override = {
  mine?: MyRsvp;
  count?: number;
  invite?: InviteStatus | null;
  handled?: string[];
};

const LABEL = "text-xs uppercase tracking-[0.15em] text-ink-muted";

// A nested panel here needs a boundary that survives BOTH grounds this
// component renders on: the white dialog on /meetups and the cream page on
// /meetups/[slug]. `Card` is borderless white + shadow-xs — a treatment
// measured against cream, and effectively invisible on white — so these
// sub-surfaces take the hairline border instead, the same way the host wizard
// draws its sub-panels inside the very same modal.
const PANEL = "rounded-3xl border border-line bg-white p-5";

export function MeetupJoinControls({
  meetupId,
  investor,
  closed,
  state,
  onChange,
  ctaFullWidth,
}: {
  meetupId: string;
  investor: boolean;
  /** Past or cancelled — the door is shut. Contact the host still works. */
  closed?: boolean;
  state: MeetupViewerState;
  onChange?: (next: { mine: MyRsvp; count: number }) => void;
  /**
   * Stretch the join CTA. The dialog wants a full-bleed pill across the modal
   * (what it had before this component existed); the detail page wants the
   * button to size to its label, next to "Add to Calendar".
   */
  ctaFullWidth?: boolean;
}) {
  const tr = useT();
  const [ov, setOv] = useState<Override>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Fresh server state (a revalidate landed) drops every optimistic override.
  // Compared as a SIGNATURE, not by object identity: the parents build the
  // state object inline, so identity changes on every render and an identity
  // check would clear the override in the same tick it was set.
  //
  // The signature also has to survive our OWN echo. /meetups keeps a
  // {mine, count} override map above this component, so every mutation here
  // reports upward and comes back as a changed `state` prop one render later —
  // by value alone that is indistinguishable from fresh server data. So each
  // mutation records the signature it expects its echo to produce, and only a
  // signature that is neither the previous one nor that echo counts as the
  // server talking.
  //
  // Without it the override was wiped by the very mutation that set it:
  // accepting an invite lost `invite: 'accepted'` (the parent map carries no
  // invite field) and re-rendered the "You're invited" card over a seat the
  // server had already granted, and approving a request lost `handled`, so the
  // approved founder bounced back into the host's list with live buttons and a
  // second click added another +1 to the count.
  const requesterCount = state.requesters?.length ?? 0;
  const sigOf = (m: MyRsvp, c: number) =>
    `${m}|${c}|${state.invite}|${requesterCount}`;
  const sig = sigOf(state.mine, state.count);
  const [prevSig, setPrevSig] = useState(sig);
  const [echoSig, setEchoSig] = useState<string | null>(null);
  if (prevSig !== sig) {
    setPrevSig(sig);
    if (sig !== echoSig) setOv({});
    setEchoSig(null);
  }

  const mine = ov.mine ?? state.mine;
  const count = ov.count ?? state.count;
  const invite = ov.invite !== undefined ? ov.invite : state.invite;
  const handled = ov.handled ?? [];
  const requesters = (state.requesters ?? []).filter(
    (p) => !handled.includes(p.id),
  );

  const isPrivate = state.visibility === "private";
  const seatFull =
    state.capacity != null && mine !== "going" && count >= state.capacity;
  // An accepted invite is the host's yes already given — capacity is then the
  // only thing left between the founder and a seat, which is exactly why a
  // pre-approved founder IS stopped by a full room.
  const preApproved = invite === "accepted";
  // Capacity gates SEATS, not knocks. rsvpAction runs its capacity check only
  // when it is about to grant a seat ("a request costs nothing, and a full
  // private meetup still takes knocks — someone may leave"), so a disabled
  // Request button put the client on the opposite side of the server's own
  // rule and left the founder no way to queue at all — under copy telling them
  // to wait for a spot.
  const full = seatFull && (!isPrivate || preApproved);

  function report(next: { mine: MyRsvp; count: number }) {
    setEchoSig(sigOf(next.mine, next.count));
    onChange?.(next);
  }

  function run(fn: () => Promise<string | null>) {
    setError(null);
    startTransition(async () => {
      const err = await fn();
      if (err) setError(tr(err));
    });
  }

  // ── Join / request / cancel ──────────────────────────────────────────────
  function toggleJoin() {
    const leaving = mine !== "none";
    run(async () => {
      const res = await rsvpAction(meetupId, !leaving);
      if (res.error) return res.error;
      const nextMine: MyRsvp = res.going
        ? "going"
        : res.requested
          ? "requested"
          : "none";
      const nextCount = res.count ?? count;
      setOv((o) => ({ ...o, mine: nextMine, count: nextCount }));
      report({ mine: nextMine, count: nextCount });
      return null;
    });
  }

  function answerInvite(accept: boolean) {
    run(async () => {
      const res = await respondInviteAction(meetupId, accept);
      if (res.error) return res.error;
      const nextMine: MyRsvp = accept ? "going" : mine;
      const nextCount = accept ? count + 1 : count;
      setOv((o) => ({
        ...o,
        invite: accept ? "accepted" : "declined",
        mine: nextMine,
        count: nextCount,
      }));
      report({ mine: nextMine, count: nextCount });
      return null;
    });
  }

  function answerRequest(userId: string, approve: boolean) {
    run(async () => {
      const res = await respondRequestAction(meetupId, userId, approve);
      if (res.error) return res.error;
      const nextCount = approve ? count + 1 : count;
      setOv((o) => ({
        ...o,
        handled: [...(o.handled ?? []), userId],
        count: nextCount,
      }));
      report({ mine, count: nextCount });
      return null;
    });
  }

  const canAct = !investor && !closed;
  // On a PRIVATE meetup an invite is not a suggestion, it is a key: accepting
  // one grants the seat outright. So only the host hands them out there —
  // inviteFoundersAction and 0073's RLS policy draw the same line.
  const canInvite =
    !investor && !closed && (state.isHost || (mine === "going" && !isPrivate));

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-danger-ink bg-danger-surface border border-danger-line rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* ── The door itself ─────────────────────────────────────────────── */}
      {canAct && !state.isHost && (
        <div>
          {invite === "pending" ? (
            <div className={`${PANEL} flex flex-wrap items-center gap-3`}>
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink">
                <UserPlus className="h-4 w-4 shrink-0 text-gold-ink" />
                {tr("You're invited")}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => answerInvite(true)}
                >
                  {tr("Accept")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => answerInvite(false)}
                >
                  {tr("Decline")}
                </Button>
              </span>
            </div>
          ) : mine === "requested" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink-muted">
                {tr("Requested · waiting for the host")}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={toggleJoin}
                className="text-sm text-ink-muted underline underline-offset-4 hover:text-navy disabled:opacity-50"
              >
                {tr("Cancel request")}
              </button>
            </div>
          ) : (
            <div>
              <Button
                variant={mine === "going" ? "secondary" : "primary"}
                size="md"
                fullWidth={ctaFullWidth}
                disabled={pending || full}
                aria-pressed={mine === "going"}
                onClick={toggleJoin}
              >
                {mine === "going" ? (
                  <>
                    <Check className="h-4 w-4" /> {tr("You're going")}
                  </>
                ) : full ? (
                  isPrivate ? (
                    tr("Fully booked — spots open up if someone leaves")
                  ) : (
                    tr("Fully booked")
                  )
                ) : isPrivate ? (
                  <>
                    <Lock className="h-4 w-4" /> {tr("Request to join")}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> {tr("Join Meetup")}
                  </>
                )}
              </Button>
              {mine === "going" && (
                <p className="mt-2 text-xs text-ink-muted">
                  {tr("Tap again to cancel")}
                </p>
              )}
              {isPrivate && mine === "none" && !full && (
                <p className="mt-2 text-xs text-ink-muted">
                  {tr("Founders request a spot. You choose who joins.")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Host: who is waiting ────────────────────────────────────────── */}
      {state.isHost && !investor && !closed && requesters.length > 0 && (
        <div className={PANEL}>
          <div className={`${LABEL} mb-3`}>
            {tr("Requests")} · {requesters.length}
          </div>
          <div className="divide-y divide-line">
            {requesters.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
              >
                <Link
                  href={`/profile/${p.slug ?? p.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-navy"
                >
                  <Avatar name={p.full_name} url={p.photo_url} size="sm" />
                  <span className="truncate text-sm text-ink">
                    {p.full_name ?? tr("Founder")}
                  </span>
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <Button
                    size="xs"
                    disabled={pending}
                    onClick={() => answerRequest(p.id, true)}
                  >
                    {tr("Approve")}
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => answerRequest(p.id, false)}
                  >
                    {tr("Decline")}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invite founders ─────────────────────────────────────────────── */}
      {canInvite && <InvitePanel meetupId={meetupId} />}

      {/* ── Contact the host ────────────────────────────────────────────── */}
      {!state.isHost && !state.blockedHost && (
        <ContactHost
          matchId={state.hostMatchId}
          hostSlug={state.hostSlug}
        />
      )}
    </div>
  );
}

// A DM if the two of you already matched, otherwise the express-interest
// route — messaging on Cofoundee unlocks on MUTUAL interest, so a "message
// the host" button that opened a thread would be a promise the product does
// not keep. The help line says which of the two you are looking at.
function ContactHost({
  matchId,
  hostSlug,
}: {
  matchId: string | null;
  hostSlug: string | null;
}) {
  const tr = useT();
  if (!matchId && !hostSlug) return null;
  return (
    <div>
      <Link
        href={matchId ? `/messages/${matchId}` : `/profile/${hostSlug}#connect`}
        className="inline-flex items-center gap-1.5 text-sm text-navy hover:text-gold-ink"
      >
        <MessageCircle className="h-4 w-4" /> {tr("Contact the host")}
      </Link>
      {!matchId && (
        <p className="mt-1 text-xs text-ink-muted">
          {tr("Express interest to unlock messages")}
        </p>
      )}
    </div>
  );
}

// Inline, not a floating overlay: the dialog scrolls its own backdrop, and a
// popover anchored inside it would clip or fight that scroll. A bordered
// in-flow panel is the surface for exactly this (see PANEL above for why it is
// not a Card).
function InvitePanel({ meetupId }: { meetupId: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FounderHit[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  function onType(value: string) {
    setQ(value);
    setSent(null);
    if (timer.current) clearTimeout(timer.current);
    const term = value.trim();
    if (!term) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    // 300ms debounce, plus a sequence guard so a slow early response cannot
    // overwrite the results of a later keystroke.
    const mine = ++seq.current;
    timer.current = setTimeout(async () => {
      const res = await searchFoundersAction(meetupId, term);
      if (mine !== seq.current) return;
      setSearching(false);
      if (res.error) {
        setError(tr(res.error));
        setHits([]);
        return;
      }
      setError(null);
      setHits(res.results ?? []);
    }, 300);
  }

  function submit() {
    if (picked.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await inviteFoundersAction(meetupId, picked);
      if (res.error) {
        setError(tr(res.error));
        return;
      }
      setSent(res.invited ?? 0);
      setPicked([]);
      setHits([]);
      setQ("");
    });
  }

  if (!open) {
    return (
      <div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" /> {tr("Invite founders")}
        </Button>
        {sent !== null && (
          <p className="mt-2 text-xs text-ink-muted">
            {tr("Invited {n} founders").replace("{n}", String(sent))}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={PANEL}>
      <div className={`${LABEL} mb-3`}>{tr("Invite founders")}</div>
      <Input
        fieldSize="sm"
        type="text"
        value={q}
        onChange={(e) => onType(e.target.value)}
        aria-label={tr("Search founders by name")}
        placeholder={tr("Search founders by name")}
      />

      {error && <p className="mt-2 text-xs text-danger-ink">{error}</p>}

      {q.trim() !== "" && (
        <div className="mt-3">
          {searching ? (
            <p className="text-xs text-ink-muted">{tr("Searching…")}</p>
          ) : hits.length === 0 ? (
            <p className="text-xs text-ink-muted">{tr("No founders found")}</p>
          ) : (
            <div className="divide-y divide-line">
              {hits.map((p) => {
                const on = picked.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2.5 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((s) =>
                          on ? s.filter((x) => x !== p.id) : [...s, p.id],
                        )
                      }
                      className="h-4 w-4 shrink-0 accent-navy"
                    />
                    <Avatar name={p.full_name} url={p.photo_url} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {p.full_name ?? tr("Founder")}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sent !== null && (
        <p className="mt-3 text-xs text-ink-muted">
          {tr("Invited {n} founders").replace("{n}", String(sent))}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending || picked.length === 0}
          onClick={submit}
        >
          {tr("Invite ({n})").replace("{n}", String(picked.length))}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {tr("Close")}
        </Button>
      </div>
    </div>
  );
}
