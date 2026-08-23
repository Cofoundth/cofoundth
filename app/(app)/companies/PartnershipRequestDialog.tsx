"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Check, HandshakeIcon, X } from "lucide-react";
import { sendPartnershipRequestAction, type RequestState } from "./actions";
import type { CompanyProfile } from "./CompaniesClient";
import { Avatar } from "@/components/Avatar";
import { Button, Input, Textarea } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import { LONG_TEXT_MAX } from "@/lib/limits";

const INITIAL: RequestState = null;

// en / hintEN are dictionary keys; Thai comes from tr() at render.
const REQUEST_TYPES: {
  value: string;
  en: string;
  hintEN: string;
}[] = [
  {
    value: "integration",
    en: "Integration",
    hintEN: "API, SDK, or platform integration",
  },
  {
    value: "distribution",
    en: "Distribution",
    hintEN: "Selling, channel, or market access",
  },
  {
    value: "white_label",
    en: "White label",
    hintEN: "Use their product under your brand",
  },
  {
    value: "co_marketing",
    en: "Co-marketing",
    hintEN: "Joint campaigns, content, events",
  },
  {
    value: "vendor_supplier",
    en: "Vendor / supplier",
    hintEN: "Buying their service for your operation",
  },
  { value: "other", en: "Other", hintEN: "Custom partnership" },
];

type Props = {
  target: CompanyProfile;
  fromCompanyName: string | null;
  onClose: () => void;
};

export function PartnershipRequestDialog({
  target,
  fromCompanyName,
  onClose,
}: Props) {
  const tr = useT();
  const action = sendPartnershipRequestAction.bind(null, target.id);
  const [state, formAction, isPending] = useActionState<RequestState, FormData>(
    action,
    INITIAL,
  );
  const [requestType, setRequestType] = useState("integration");
  const [context, setContext] = useState("");

  // Ids for aria-labelledby. Generated rather than hard-coded so a second
  // dialog instance can never duplicate them.
  const baseId = useId();
  const eyebrowId = `${baseId}-eyebrow`;
  const titleId = `${baseId}-title`;
  const sentTitleId = `${baseId}-sent`;

  // Close on success
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 1400);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  // Escape-to-close now lives in <DialogShell> alongside the focus trap — one
  // keydown listener owns every dialog-level key.

  const contextRemaining = LONG_TEXT_MAX - context.length;
  const contextTooShort = context.length < 50;
  const contextTooLong = contextRemaining < 0;

  if (state?.ok) {
    return (
      <DialogShell onClose={onClose} labelledBy={sentTitleId}>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-gold-soft border border-line inline-flex items-center justify-center rounded-xl">
            <Check className="w-6 h-6 text-gold-ink" strokeWidth={1.5} />
          </div>
          <h2 id={sentTitleId} className="text-d1 mb-2">
            {tr("Request sent")}
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
            {tr(
              "{name} will get an email notification. We'll let you know when they respond.",
            ).replace("{name}", target.company_name)}
          </p>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell onClose={onClose} labelledBy={`${eyebrowId} ${titleId}`}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-start gap-3">
          <Avatar
            name={target.company_name}
            url={target.photo_url}
            size="md"
          />
          <div className="min-w-0">
            <div
              id={eyebrowId}
              className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-1 inline-flex items-center gap-1.5"
            >
              <HandshakeIcon className="w-3 h-3" />
              {tr("Partnership request")}
            </div>
            <div id={titleId} className="font-serif text-xl text-navy truncate">
              → {target.company_name}
            </div>
            {fromCompanyName && (
              <div className="text-xs text-ink-muted mt-0.5">
                {tr("From")}{" "}
                <span className="text-navy font-medium">{fromCompanyName}</span>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-muted hover:text-navy shrink-0"
          aria-label={tr("Close")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="request_type" value={requestType} />

        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
            {tr("Request type")}
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            {REQUEST_TYPES.map((rt) => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRequestType(rt.value)}
                className={`text-left p-3 border transition-colors ${
                  requestType === rt.value
                    ? "bg-cream border-navy"
                    : "bg-white border-line hover:border-navy"
                }`}
              >
                <div className="text-sm text-navy font-medium">
                  {tr(rt.en)}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {tr(rt.hintEN)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={5}
          maxLength={200}
          label={tr("Subject")}
          placeholder={tr('e.g. "Looking for logistics partner in Bangkok"')}
        />

        <div>
          <Textarea
            id="context"
            name="context"
            rows={6}
            required
            minLength={50}
            maxLength={LONG_TEXT_MAX}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            resize="y"
            label={tr("Context")}
            hint={
              <span
                className={`text-xs tabular-nums ${
                  contextTooLong || contextTooShort
                    ? "text-ink-muted"
                    : "text-gold-ink"
                }`}
              >
                {context.length} / {LONG_TEXT_MAX}
              </span>
            }
            placeholder={tr(
              "What you're looking for, why this company fits, and what you'd ideally agree on.",
            )}
          />
          {contextTooShort && context.length > 0 && (
            <p className="text-xs text-ink-muted mt-1">
              {tr("{n} more chars needed (50 min)").replace(
                "{n}",
                String(50 - context.length),
              )}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="deadline_at"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Deadline (optional)")}
          </label>
          <input
            id="deadline_at"
            name="deadline_at"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            className="px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
        </div>

        {state?.error && (
          <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800 rounded-xl">
            {state.error}
          </div>
        )}

        <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 text-ink hover:text-navy text-sm tracking-wide"
          >
            {tr("Cancel")}
          </button>
          <Button
            type="submit"
            disabled={isPending || contextTooShort || contextTooLong}
          >
            <HandshakeIcon className="w-4 h-4" />
            {isPending ? tr("Sending…") : tr("Send request")}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

// Tab-order members inside the panel. Deliberately excludes tabindex="-1" —
// the panel itself is programmatically focusable but must never sit in the
// Tab cycle.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function DialogShell({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  /** Space-separated ids of the elements that name this dialog. */
  labelledBy: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock the page behind the overlay, and hand focus back to whatever opened
  // the dialog on the way out. Mount-once on purpose: the success panel swaps
  // the *children*, not this shell, so the page never unlocks mid-flow.
  // paddingRight compensates for the scrollbar the lock removes, otherwise the
  // page underneath visibly jumps sideways as the dialog opens.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      opener?.focus?.();
    };
  }, []);

  // Pull focus in on open — and again when the dialog swaps content (the
  // labelling ids change with it) and the focused control was unmounted along
  // with the old content.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || panel.contains(document.activeElement)) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panel).focus();
  }, [labelledBy]);

  // Escape closes. Tab / Shift+Tab cycle within the panel instead of walking
  // into the page behind the overlay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto rounded-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* tabIndex -1 makes the panel a focus fallback for content with no
          controls (the "Request sent" panel). globals.css only rings
          a/button/input/textarea/select/summary on :focus-visible, so this
          adds no outline. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white border border-line p-6 lg:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
      >
        {children}
      </div>
    </div>
  );
}
