"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Link2, Send, Sparkles, Trophy } from "lucide-react";
import { createStatusAction, type StatusState } from "./actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: StatusState = null;

type Kind = "status" | "milestone" | "show_and_tell";

const KIND_OPTIONS: { value: Kind; en: string; icon: typeof Sparkles }[] = [
  { value: "status", en: "Working on", icon: Sparkles },
  { value: "milestone", en: "Milestone", icon: Trophy },
  { value: "show_and_tell", en: "Show & tell", icon: Link2 },
];

export function StatusComposer() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<StatusState, FormData>(
    createStatusAction,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<Kind>("status");
  const [content, setContent] = useState("");
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    if (!isPending && !state?.error && formRef.current) {
      formRef.current.reset();
      setContent("");
      setKind("status");
      setShowLink(false);
    }
  }, [isPending, state]);

  const remaining = 280 - content.length;
  const tooLong = remaining < 0;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-white border border-line p-4"
    >
      <input type="hidden" name="kind" value={kind} />

      {/* Kind tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {KIND_OPTIONS.map((k) => {
          const Icon = k.icon;
          const active = kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs tracking-wide border transition-colors ${
                active
                  ? "bg-navy border-navy text-white"
                  : "bg-white border-line text-ink hover:border-navy"
              }`}
            >
              <Icon className="w-3 h-3" strokeWidth={1.5} />
              {tr(k.en)}
            </button>
          );
        })}
      </div>

      <textarea
        name="content"
        rows={2}
        maxLength={320}
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          kind === "milestone"
            ? tr("What did you just hit? (revenue, customers, fundraise…)")
            : kind === "show_and_tell"
              ? tr("What did you just ship?")
              : tr("What are you working on?")
        }
        className="w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy resize-none"
      />

      {showLink && (
        <input
          name="link_url"
          type="url"
          placeholder="https://"
          className="mt-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy"
        />
      )}

      {state?.error && (
        <div className="mt-2 text-xs text-red-700">{state.error}</div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLink((v) => !v)}
            className={`inline-flex items-center gap-1 text-xs ${
              showLink ? "text-navy" : "text-ink-muted hover:text-navy"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            {showLink ? tr("Remove link") : tr("Add link")}
          </button>
          <span
            className={`text-xs tabular-nums ${
              tooLong ? "text-red-700" : "text-ink-muted"
            }`}
          >
            {remaining}
          </span>
        </div>
        <button
          type="submit"
          disabled={isPending || tooLong || content.trim().length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide"
        >
          <Send className="w-3.5 h-3.5" />
          {isPending ? tr("Posting…") : tr("Post")}
        </button>
      </div>
    </form>
  );
}
