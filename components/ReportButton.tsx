"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { reportContentAction } from "@/lib/post-actions";
import { Button } from "@/components/ui";

/** The shortest reason a report takes: reportContentAction refuses less, and
 *  so does the reports table (reason_length, 0002). */
const MIN_REASON = 5;

// Flag a post, a product or a comment. Collapsed = a small "Report" link;
// expanded = a reason box. On success it collapses to a "Reported" note.
//
// A PRODUCT is reported as kind "post": it is a forum_posts row, and the
// admin reports page reads the row's own kind to label and link it as a
// product. Place it as a DIRECT child of a `flex-wrap` row (the feed card's
// footer, a product page's action row, a comment's footer): the reason box is
// `w-full`, so it wraps onto its own line under the row instead of squeezing
// it.
export function ReportButton({
  kind,
  targetId,
  className = "",
  size = "xs",
}: {
  kind: "post" | "comment";
  targetId: string;
  /** On the collapsed link and the "Reported" note only (e.g. `ml-auto` to
   *  push it to the end of its row); the open reason box is always full
   *  width. */
  className?: string;
  /** The ROW's type size, which the link matches: `xs` in the feed card's
   *  footer and under a comment (rows that run at 12px), `sm` in a post's or
   *  a product's action row, where Like and Share are 14px. */
  size?: "xs" | "sm";
}) {
  const tr = useT();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // FOCUS. Each of the three states replaces the element that had focus (the
  // link, the Cancel or Submit button) with a different one, and a removed
  // element takes focus with it — to <body>, where a keyboard or screen-reader
  // user loses their place. So focus is moved on purpose: into the reason box
  // when it opens, back to the Report link on Cancel, and onto the "Reported"
  // note once a report has gone in.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef<HTMLSpanElement>(null);
  const backToTrigger = useRef(false);
  useEffect(() => {
    if (done) doneRef.current?.focus();
    else if (open) boxRef.current?.focus();
    else if (backToTrigger.current) {
      backToTrigger.current = false;
      triggerRef.current?.focus();
    }
  }, [open, done]);

  const text = size === "sm" ? "text-sm" : "text-xs";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";
  const tooShort = reason.trim().length < MIN_REASON;

  if (done) {
    return (
      <span
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className={`${text} text-ink-muted ${className}`}
      >
        {tr("Reported")}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 ${text} text-ink-muted hover:text-danger-ink tracking-wide transition-colors ${className}`}
      >
        <Flag className={icon} aria-hidden="true" /> {tr("Report")}
      </button>
    );
  }

  return (
    // `basis-full` on a wrapper with NO max width is what makes it wrap: a
    // flex item capped at max-w-sm still fits beside a wide row, and then
    // squeezes it (measured on the product page, 2026-11-17). The cap
    // lives on the inner box.
    <div className="mt-2 w-full basis-full">
      <div className="max-w-sm space-y-2">
        <textarea
          ref={boxRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={tr("What’s wrong with this?")}
          aria-label={tr("What’s wrong with this?")}
          aria-describedby={tooShort ? hintId : undefined}
          className="w-full px-2 py-1.5 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy leading-relaxed resize-none"
        />
        {/* Why Submit is still off. A one-word reason — "spam", "สแปม" — is
            under the minimum, and a disabled button says nothing on its own. */}
        {tooShort && (
          <p id={hintId} className="text-xs text-ink-muted">
            {tr("At least 5 characters.")}
          </p>
        )}
        {error && (
          <div role="alert" className="text-xs text-danger-ink">
            {tr(error)}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => {
              backToTrigger.current = true;
              setError(null);
              setOpen(false);
            }}
            disabled={pending}
            className="px-2 py-1"
          >
            {tr("Cancel")}
          </Button>
          <Button
            size="xs"
            className="px-2 py-1"
            disabled={pending || tooShort}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await reportContentAction(
                  kind,
                  targetId,
                  reason,
                ).catch(() => ({ error: "Couldn't submit the report. Try again." }));
                if (res.error) setError(res.error);
                else setDone(true);
              })
            }
          >
            {pending ? tr("Submitting…") : tr("Submit report")}
          </Button>
        </div>
      </div>
    </div>
  );
}
