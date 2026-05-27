"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  ExternalLink,
  HandshakeIcon,
  MessageSquare,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import {
  acceptPartnershipAction,
  declinePartnershipAction,
  withdrawPartnershipAction,
} from "./partnership-actions";

const TYPE_LABEL: Record<string, { en: string; th: string }> = {
  integration: { en: "Integration", th: "Integration" },
  distribution: { en: "Distribution", th: "การจัดจำหน่าย" },
  white_label: { en: "White label", th: "White-label" },
  co_marketing: { en: "Co-marketing", th: "Co-marketing" },
  vendor_supplier: { en: "Vendor", th: "Vendor" },
  other: { en: "Other", th: "อื่นๆ" },
};

const STATUS_LABEL: Record<string, { en: string; th: string; tone: string }> = {
  open: { en: "Open", th: "รอตอบ", tone: "border-gold text-gold" },
  accepted: {
    en: "Accepted",
    th: "ตอบรับแล้ว",
    tone: "border-gold bg-gold text-white",
  },
  declined: { en: "Declined", th: "ปฏิเสธ", tone: "border-line text-ink-muted" },
  withdrawn: {
    en: "Withdrawn",
    th: "ยกเลิกแล้ว",
    tone: "border-line text-ink-muted",
  },
};

export type PartnershipRow = {
  id: string;
  request_type: string;
  subject: string;
  context: string;
  status: "open" | "accepted" | "declined" | "withdrawn";
  deadline_at: string | null;
  created_at: string;
  response_note: string | null;
  direction: "received" | "sent";
  matchId: string | null;
  counterparty: {
    id: string;
    slug: string | null;
    company_name: string;
    representative: string;
    photo_url: string | null;
  } | null;
};

type Props = {
  row: PartnershipRow;
  locale: "en" | "th";
};

export function PartnershipCard({ row, locale }: Props) {
  const isTH = locale === "th";
  const [responseNote, setResponseNote] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [, startTransition] = useTransition();

  const status = STATUS_LABEL[row.status];
  const type = TYPE_LABEL[row.request_type] ?? TYPE_LABEL.other;

  const profileHref = row.counterparty
    ? `/profile/${row.counterparty.slug ?? row.counterparty.id}`
    : "#";

  return (
    <div
      className={`bg-white border p-5 ${
        row.status === "accepted"
          ? "border-gold/40"
          : row.status === "open"
            ? "border-gold/30"
            : "border-line"
      }`}
    >
      <div className="flex items-start gap-4">
        <Link href={profileHref} className="shrink-0">
          <Avatar
            name={row.counterparty?.company_name}
            url={row.counterparty?.photo_url}
            size="md"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-ink-muted flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 text-gold">
                  <HandshakeIcon className="w-3 h-3" strokeWidth={1.5} />
                  {type[isTH ? "th" : "en"]}
                </span>
                <span>·</span>
                <span>
                  {row.direction === "received"
                    ? isTH
                      ? "จาก"
                      : "from"
                    : isTH
                      ? "ส่งถึง"
                      : "to"}{" "}
                  <Link
                    href={profileHref}
                    className="text-navy hover:text-gold font-medium"
                  >
                    {row.counterparty?.company_name ?? "—"}
                  </Link>
                </span>
                <span>·</span>
                <span>
                  {new Date(row.created_at).toLocaleDateString(
                    isTH ? "th-TH" : "en-GB",
                    { day: "numeric", month: "short" },
                  )}
                </span>
              </div>
              <h3 className="font-serif text-lg text-navy leading-tight">
                {row.subject}
              </h3>
            </div>
            <span
              className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border shrink-0 ${status.tone}`}
            >
              {status[isTH ? "th" : "en"]}
            </span>
          </div>

          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-3">
            {row.context}
          </p>

          {row.deadline_at && (
            <div className="text-xs text-ink-muted mb-3 inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              {isTH ? "กำหนดเส้นตาย" : "Deadline"}:{" "}
              {new Date(row.deadline_at).toLocaleDateString(
                isTH ? "th-TH" : "en-GB",
                { day: "numeric", month: "short", year: "numeric" },
              )}
            </div>
          )}

          {row.response_note && (
            <div className="mt-3 mb-3 p-3 bg-cream border-l-2 border-line">
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">
                {isTH ? "ข้อความตอบกลับ" : "Response"}
              </div>
              <p className="text-sm text-ink leading-relaxed italic">
                &ldquo;{row.response_note}&rdquo;
              </p>
            </div>
          )}

          {/* Action row */}
          {row.status === "open" && row.direction === "received" && (
            <div className="mt-4 pt-3 border-t border-line">
              {showResponse ? (
                <div className="space-y-3">
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder={
                      isTH
                        ? "ข้อความตอบกลับ (ไม่บังคับ) — บอกว่าทำไมตอบรับหรือปฏิเสธ"
                        : "Optional note — let them know why you're accepting or declining."
                    }
                    className="w-full px-3 py-2 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      action={(fd) => {
                        fd.set("response_note", responseNote);
                        startTransition(async () => {
                          await acceptPartnershipAction(row.id, fd);
                        });
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isTH ? "ตอบรับและเปิดแชต" : "Accept & open chat"}
                      </button>
                    </form>
                    <form
                      action={(fd) => {
                        fd.set("response_note", responseNote);
                        startTransition(async () => {
                          await declinePartnershipAction(row.id, fd);
                        });
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-line hover:border-navy text-ink hover:text-navy text-sm tracking-wide"
                      >
                        <X className="w-3.5 h-3.5" />
                        {isTH ? "ปฏิเสธ" : "Decline"}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponse(false);
                        setResponseNote("");
                      }}
                      className="text-xs text-ink-muted hover:text-navy ml-1"
                    >
                      {isTH ? "ยกเลิก" : "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowResponse(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isTH ? "ตอบกลับ" : "Respond"}
                  </button>
                </div>
              )}
            </div>
          )}

          {row.status === "open" && row.direction === "sent" && (
            <form
              action={() => {
                startTransition(async () => {
                  await withdrawPartnershipAction(row.id);
                });
              }}
              className="mt-4 pt-3 border-t border-line"
            >
              <button
                type="submit"
                className="text-xs text-ink-muted hover:text-red-700"
              >
                {isTH ? "ยกเลิกคำขอ" : "Withdraw request"}
              </button>
            </form>
          )}

          {row.status === "accepted" && row.matchId && (
            <Link
              href={`/messages/${row.matchId}`}
              className="mt-4 pt-3 border-t border-line inline-flex items-center gap-1.5 text-sm text-navy hover:text-gold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {isTH ? "เปิดการสนทนา" : "Open conversation"}
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
