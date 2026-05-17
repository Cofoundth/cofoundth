"use client";

import { useState, useTransition } from "react";
import { Calendar, Video, X } from "lucide-react";
import { postScheduleNoticeAction } from "./scheduleNoticeAction";

type Props = {
  matchId: string;
  otherName: string;
  otherEmail?: string | null;
};

export function ConversationActions({
  matchId,
  otherName,
  otherEmail,
}: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <a
          href="https://meet.google.com/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-white hover:border-navy text-xs text-ink tracking-wide transition-colors"
        >
          <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
          Start Meet
        </a>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-white hover:border-navy text-xs text-ink tracking-wide transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
          Schedule call
        </button>
      </div>

      {scheduleOpen && (
        <ScheduleDialog
          matchId={matchId}
          otherName={otherName}
          otherEmail={otherEmail ?? null}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </>
  );
}

function ScheduleDialog({
  matchId,
  otherName,
  otherEmail,
  onClose,
}: {
  matchId: string;
  otherName: string;
  otherEmail: string | null;
  onClose: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(16, 0, 0, 0);

  const [date, setDate] = useState(formatDateInput(tomorrow));
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState("30");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const startLocal = new Date(`${date}T${time}:00+07:00`);
    const endLocal = new Date(
      startLocal.getTime() + parseInt(duration, 10) * 60_000,
    );

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Co-founder intro call: ${otherName}`,
      details:
        `Co-founder intro call via Cofoundee.\n\n` +
        `When you save this event, tick "Google Meet" in the conferencing ` +
        `dropdown — Google will generate the meeting link automatically.`,
      dates: `${toGCalDate(startLocal)}/${toGCalDate(endLocal)}`,
    });
    if (otherEmail) params.append("add", otherEmail);

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;

    // Post a chat message so the other founder sees the proposal instantly,
    // then open Google Calendar in a new tab.
    const noticeForm = new FormData();
    noticeForm.append("matchId", matchId);
    noticeForm.append("date", date);
    noticeForm.append("time", time);
    noticeForm.append("duration", duration);

    startTransition(async () => {
      try {
        await postScheduleNoticeAction(noticeForm);
      } catch (err) {
        console.error("[postScheduleNotice] failed", err);
      }
      window.open(url, "_blank", "noopener,noreferrer");
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-line max-w-md w-full p-6 lg:p-8"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
              Schedule
            </div>
            <h2 className="text-2xl">Co-founder intro call</h2>
            <p className="text-sm text-ink-muted mt-1">with {otherName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-navy p-1 -m-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="date"
                className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
              >
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label
                htmlFor="time"
                className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
              >
                Time (Bangkok)
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="duration"
              className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
            >
              Duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
            </select>
          </div>

          <div className="bg-cream border-l-2 border-gold p-3 text-xs text-ink leading-relaxed">
            Opens Google Calendar with the event pre-filled.{" "}
            {otherEmail ? `${otherName} will be added as an invitee. ` : null}
            <strong className="text-navy">
              Tick &ldquo;Google Meet&rdquo; conferencing
            </strong>{" "}
            inside Google Calendar before saving &mdash; Google generates the
            link automatically.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-3 border border-line bg-white hover:border-navy disabled:opacity-60 text-ink text-sm tracking-wide transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-3 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors"
            >
              {isPending ? "Posting…" : "Open Google Calendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toGCalDate(d: Date): string {
  // Google Calendar expects YYYYMMDDTHHmmssZ in UTC
  return (
    d.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, 15) + "Z"
  );
}
