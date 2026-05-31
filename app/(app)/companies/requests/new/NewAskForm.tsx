"use client";

import { useActionState, useState } from "react";
import { HandshakeIcon } from "lucide-react";
import { createAskAction, type AskState } from "../actions";

const INITIAL: AskState = null;

const REQUEST_TYPES: {
  value: string;
  en: string;
  th: string;
  hintEN: string;
  hintTH: string;
}[] = [
  {
    value: "integration",
    en: "Integration",
    th: "Integration",
    hintEN: "API, SDK, or platform integration",
    hintTH: "ต่อ API, SDK หรือเชื่อมระบบกัน",
  },
  {
    value: "distribution",
    en: "Distribution",
    th: "การจัดจำหน่าย",
    hintEN: "Selling, channel, or market access",
    hintTH: "ช่องทางขาย หรือพาเข้าตลาด",
  },
  {
    value: "white_label",
    en: "White label",
    th: "White-label",
    hintEN: "Using your product under their brand (or vice versa)",
    hintTH: "เอาของเรามาขายในแบรนด์เขา หรือกลับกัน",
  },
  {
    value: "co_marketing",
    en: "Co-marketing",
    th: "Co-marketing",
    hintEN: "Joint campaigns, content, events",
    hintTH: "ทำแคมเปญ คอนเทนต์ อีเวนต์ร่วมกัน",
  },
  {
    value: "vendor_supplier",
    en: "Vendor / supplier",
    th: "ผู้จัดหา",
    hintEN: "Looking for a service provider",
    hintTH: "หาคนให้บริการ",
  },
  {
    value: "other",
    en: "Other",
    th: "อื่นๆ",
    hintEN: "Custom partnership",
    hintTH: "ความร่วมมือแบบอื่น",
  },
];

export function NewAskForm({ locale }: { locale: "en" | "th" }) {
  const isTH = locale === "th";
  const [state, formAction, isPending] = useActionState<AskState, FormData>(
    createAskAction,
    INITIAL,
  );
  const [requestType, setRequestType] = useState("integration");
  const [context, setContext] = useState("");

  const remaining = 2000 - context.length;
  const tooShort = context.length < 50;
  const tooLong = remaining < 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="request_type" value={requestType} />

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
          {isTH ? "ประเภทพาร์ตเนอร์ที่หา" : "Partner type"}
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
                {isTH ? rt.th : rt.en}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {isTH ? rt.hintTH : rt.hintEN}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {isTH ? "หัวข้อ" : "Subject"}
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={5}
          maxLength={200}
          placeholder={
            isTH
              ? "เช่น \"หา partner logistics ครอบคลุมภาคเหนือ\""
              : 'e.g. "Logistics partner covering Northern Thailand"'
          }
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="context"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            {isTH ? "รายละเอียด" : "Context"}
          </label>
          <span
            className={`text-xs tabular-nums ${
              tooLong || tooShort ? "text-ink-muted" : "text-gold"
            }`}
          >
            {context.length} / 2000
          </span>
        </div>
        <textarea
          id="context"
          name="context"
          rows={8}
          required
          minLength={50}
          maxLength={2000}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={
            isTH
              ? "เล่าหน่อยว่าธุรกิจทำอะไร ทำไมถึงอยากได้ partner แบบนี้ งานมีประมาณไหน timeline เป็นยังไง และมีเงื่อนไขอะไรที่สำคัญ"
              : "Describe your business, why you need this kind of partner, expected volume, timeline, and any key conditions."
          }
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-y"
        />
        {tooShort && context.length > 0 && (
          <p className="text-xs text-ink-muted mt-1">
            {isTH
              ? `เพิ่มอีก ${50 - context.length} ตัวอักษร (ขั้นต่ำ 50)`
              : `${50 - context.length} more chars needed (50 min)`}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="deadline_at"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {isTH ? "กำหนดเส้นตาย (ไม่บังคับ)" : "Deadline (optional)"}
        </label>
        <input
          id="deadline_at"
          name="deadline_at"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          className="px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending || tooShort || tooLong}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors"
        >
          <HandshakeIcon className="w-4 h-4" />
          {isPending
            ? isTH
              ? "กำลังโพสต์…"
              : "Posting…"
            : isTH
              ? "โพสต์คำขอ"
              : "Post ask"}
        </button>
      </div>
    </form>
  );
}
