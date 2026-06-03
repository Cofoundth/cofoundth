"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, FileText, MessageSquareQuote, Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { QUICK_REPLY_EVENT } from "./MessageComposer";

type Social = {
  linkedin?: string | null;
  x?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

const TEMPLATES = [
  {
    label: "Propose a 30-min intro call",
    body: "Hey — would love to do a quick 30-min intro call. I'm free a few times this week. What works for you?",
  },
  {
    label: "Ask about timeline",
    body: "What's your timeline like? Are you actively looking to start something now, or exploring over the next few months?",
  },
  {
    label: "Ask about commitment",
    body: "What's your current situation — full-time available, or balancing this with something else? Just want to understand the level of commitment you're imagining.",
  },
  {
    label: "Discuss equity expectations",
    body: "Before we go deeper — what are your initial thoughts on equity split for a co-founder relationship? Just gauging alignment.",
  },
];

export function NextStepsPanel({ social }: { social?: Social }) {
  const tr = useT();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Build the quick-reply cards. Each is { label, body } already in the active
  // language. The "share my socials" card is only added when the user actually
  // has links, and pastes their REAL URLs (no placeholder).
  const socialLines = [
    social?.linkedin && `LinkedIn: ${social.linkedin}`,
    social?.x && `X: ${social.x}`,
    social?.instagram && `IG: ${social.instagram}`,
    social?.facebook && `Facebook: ${social.facebook}`,
  ].filter(Boolean) as string[];

  const cards: { label: string; body: string }[] = TEMPLATES.map((t) => ({
    label: tr(t.label),
    body: tr(t.body),
  }));
  if (socialLines.length) {
    cards.splice(1, 0, {
      label: tr("Share my socials"),
      body: `${tr("Here are my socials:")}\n${socialLines.join("\n")}`,
    });
  }

  function insert(idx: number, text: string) {
    window.dispatchEvent(new CustomEvent(QUICK_REPLY_EVENT, { detail: text }));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  return (
    <div className="space-y-6">
      {/* Conversation guide */}
      <div className="bg-white border border-line p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
          {tr("After mutual interest")}
        </div>
        <h3 className="font-serif text-lg text-navy mb-4">{tr("The path")}</h3>
        <ol className="space-y-3 text-sm text-ink">
          <li className="flex gap-3">
            <span className="font-serif text-base text-gold leading-none">
              I
            </span>
            <span className="leading-relaxed">
              {tr("Chat here. Use the prompts in the empty state as a guide.")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-serif text-base text-gold leading-none">
              II
            </span>
            <span className="leading-relaxed">
              {tr(
                "First 30-min intro call. Start Meet or schedule via Google Calendar (buttons above).",
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-serif text-base text-gold leading-none">
              III
            </span>
            <span className="leading-relaxed">
              {tr(
                "2–3 more calls. Discuss vision, values, working style, equity expectations.",
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-serif text-base text-gold leading-none">
              IV
            </span>
            <span className="leading-relaxed">
              {tr("Trial period (2–4 weeks): build something small together.")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-serif text-base text-gold leading-none">
              V
            </span>
            <span className="leading-relaxed">
              {tr("Ready to formalize?")}{" "}
              <Link
                href="/legal-templates"
                className="text-navy hover:text-gold inline-flex items-center gap-1"
              >
                <FileText className="w-3 h-3" /> {tr("Legal templates")}
              </Link>
            </span>
          </li>
        </ol>
      </div>

      {/* Quick-reply templates */}
      <div className="bg-white border border-line p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareQuote
            className="w-4 h-4 text-gold"
            strokeWidth={1.5}
          />
          <div className="text-xs uppercase tracking-[0.2em] text-gold">
            {tr("Quick replies")}
          </div>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          {tr("Tap to drop it into your message box — edit before sending.")}
        </p>
        <ul className="space-y-2">
          {cards.map((c, idx) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={() => insert(idx, c.body)}
                className="w-full text-left p-3 border border-line bg-white hover:border-navy transition-colors flex items-start gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-navy mb-1">
                    {c.label}
                  </div>
                  <div className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">
                    {c.body}
                  </div>
                </div>
                {copiedIdx === idx ? (
                  <Check className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-ink-muted group-hover:text-navy shrink-0 mt-0.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
