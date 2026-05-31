"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, HandshakeIcon, X } from "lucide-react";
import { sendPartnershipRequestAction, type RequestState } from "./actions";
import type { CompanyProfile } from "./CompaniesClient";
import { Avatar } from "@/components/Avatar";

const INITIAL: RequestState = null;

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
    hintEN: "Use their product under your brand",
    hintTH: "เอาของเขามาขายในแบรนด์เรา",
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
    th: "ผู้จัดหา (vendor)",
    hintEN: "Buying their service for your operation",
    hintTH: "ซื้อบริการเขามาใช้ในงานเรา",
  },
  { value: "other", en: "Other", th: "อื่นๆ", hintEN: "Custom partnership", hintTH: "ความร่วมมือแบบอื่น" },
];

type Props = {
  target: CompanyProfile;
  fromCompanyName: string | null;
  onClose: () => void;
  locale: "en" | "th";
};

export function PartnershipRequestDialog({
  target,
  fromCompanyName,
  onClose,
  locale,
}: Props) {
  const isTH = locale === "th";
  const action = sendPartnershipRequestAction.bind(null, target.id);
  const [state, formAction, isPending] = useActionState<RequestState, FormData>(
    action,
    INITIAL,
  );
  const [requestType, setRequestType] = useState("integration");
  const [context, setContext] = useState("");

  // Close on success
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 1400);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const contextRemaining = 2000 - context.length;
  const contextTooShort = context.length < 50;
  const contextTooLong = contextRemaining < 0;

  if (state?.ok) {
    return (
      <DialogShell onClose={onClose}>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-gold/10 border border-gold/40 inline-flex items-center justify-center">
            <Check className="w-6 h-6 text-gold" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl mb-2">
            {isTH ? "ส่งคำขอแล้ว" : "Request sent"}
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
            {isTH
              ? `เราส่งอีเมลแจ้ง ${target.company_name} แล้ว พอเขาตอบกลับจะรีบบอกเลย`
              : `${target.company_name} will get an email notification. We'll let you know when they respond.`}
          </p>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell onClose={onClose}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-start gap-3">
          <Avatar
            name={target.company_name}
            url={target.photo_url}
            size="md"
          />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1 inline-flex items-center gap-1.5">
              <HandshakeIcon className="w-3 h-3" />
              {isTH ? "คำขอความร่วมมือ" : "Partnership request"}
            </div>
            <div className="font-serif text-xl text-navy truncate">
              → {target.company_name}
            </div>
            {fromCompanyName && (
              <div className="text-xs text-ink-muted mt-0.5">
                {isTH ? "ในนาม" : "From"}{" "}
                <span className="text-navy font-medium">{fromCompanyName}</span>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-muted hover:text-navy shrink-0"
          aria-label={isTH ? "ปิด" : "Close"}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="request_type" value={requestType} />

        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
            {isTH ? "ประเภทคำขอ" : "Request type"}
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
                ? "เช่น \"หา partner logistics ในกรุงเทพ\""
                : 'e.g. "Looking for logistics partner in Bangkok"'
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
                contextTooLong || contextTooShort
                  ? "text-ink-muted"
                  : "text-gold"
              }`}
            >
              {context.length} / 2000
            </span>
          </div>
          <textarea
            id="context"
            name="context"
            rows={6}
            required
            minLength={50}
            maxLength={2000}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={
              isTH
                ? "เล่าหน่อยว่ากำลังหาอะไร ทำไมถึงคิดว่าบริษัทนี้น่าจะเหมาะ และอยากร่วมงานกันแบบไหน"
                : "What you're looking for, why this company fits, and what you'd ideally agree on."
            }
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-y"
          />
          {contextTooShort && context.length > 0 && (
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
            type="button"
            onClick={onClose}
            className="px-5 py-3 text-ink hover:text-navy text-sm tracking-wide"
          >
            {isTH ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={
              isPending || contextTooShort || contextTooLong
            }
            className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors"
          >
            <HandshakeIcon className="w-4 h-4" />
            {isPending
              ? isTH
                ? "กำลังส่ง…"
                : "Sending…"
              : isTH
                ? "ส่งคำขอ"
                : "Send request"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function DialogShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-line p-6 lg:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
