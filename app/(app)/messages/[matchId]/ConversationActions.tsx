"use client";

import { useId, useState, useTransition } from "react";
import { Calendar, Video, X } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import { postScheduleNoticeAction } from "./scheduleNoticeAction";

type Props = {
  matchId: string;
  myName: string;
  otherName: string;
  otherEmail?: string | null;
};

export function ConversationActions({
  matchId,
  myName,
  otherName,
  otherEmail,
}: Props) {
  const tr = useT();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <a
          href="https://meet.google.com/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-white hover:border-navy text-xs text-ink tracking-wide transition-colors rounded-full"
        >
          <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
          {tr("Start Meet")}
        </a>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-white hover:border-navy text-xs text-ink tracking-wide transition-colors rounded-full"
        >
          <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
          {tr("Schedule call")}
        </button>
      </div>

      {scheduleOpen && (
        <ScheduleDialog
          matchId={matchId}
          myName={myName}
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
  myName,
  otherName,
  otherEmail,
  onClose,
}: {
  matchId: string;
  myName: string;
  otherName: string;
  otherEmail: string | null;
  onClose: () => void;
}) {
  const tr = useT();
  const titleId = useId();
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
      text: `Cofoundee · Co-founder intro call (${myName} ↔ ${otherName})`,
      details:
        `Intro call between ${myName} and ${otherName} via Cofoundee — ` +
        `the platform for Thai founders to meet their co-founder.\n\n` +
        `Tick "Google Meet" in the conferencing dropdown before saving — ` +
        `Google will generate the meeting link automatically and email ` +
        `both attendees.\n\n` +
        `Cofoundee: https://cofoundee.co`,
      dates: `${toGCalDate(startLocal)}/${toGCalDate(endLocal)}`,
      location: "Google Meet (set inside Calendar)",
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
    // <Dialog> also fixes what this scrim could not do on its own: it was
    // `px-4` only, so on a short screen (a phone in landscape) the panel's
    // top and bottom had no gutter and nothing scrolled. The primitive's
    // scrim is `p-4 overflow-y-auto`.
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      size="md"
      padding="responsive"
      surface="card"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-2">
            {tr("Schedule")}
          </div>
          <h2 id={titleId} className="text-d1">
            {tr("Co-founder intro call")}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {tr("with")} {otherName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-muted hover:text-navy p-1 -m-1"
          aria-label={tr("Close")}
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
              {tr("Date")}
            </label>
            <input
              id="date"
              type="date"
              value={date}
              min={formatDateInput(new Date())}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
            />
          </div>
          <div>
            <label
              htmlFor="time"
              className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
            >
              {tr("Time (Bangkok)")}
            </label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="duration"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Duration")}
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
          >
            <option value="15">{tr("15 minutes")}</option>
            <option value="30">{tr("30 minutes")}</option>
            <option value="45">{tr("45 minutes")}</option>
            <option value="60">{tr("1 hour")}</option>
            <option value="90">{tr("1.5 hours")}</option>
          </select>
        </div>

        <div className="bg-cream border-l-2 border-navy p-3 text-xs text-ink leading-relaxed rounded-xl">
          {tr("Opens Google Calendar with the event pre-filled.")}{" "}
          {otherEmail
            ? `${otherName} ${tr("will be added as an invitee.")} `
            : null}
          <strong className="text-navy">
            {tr('Tick "Google Meet" conferencing')}
          </strong>{" "}
          {tr(
            "inside Google Calendar before saving — Google generates the link automatically.",
          )}
        </div>

        {/* `px-4` rather than md's px-6: both buttons are flex-1, so the
            horizontal pad only shrinks the label's line box. cn() merges,
            so the smaller value now actually wins. */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4"
          >
            {tr("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1 px-4">
            {isPending ? tr("Posting…") : tr("Open Google Calendar")}
          </Button>
        </div>
      </form>
    </Dialog>
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
