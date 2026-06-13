"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Trash2, UserPlus } from "lucide-react";
import {
  inviteMemberAction,
  revokeInviteAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "../actions";
import { useT } from "@/lib/i18n-client";

export type PanelMember = {
  userId: string;
  name: string;
  role: "owner" | "admin" | "member";
};
export type PanelInvite = { id: string; email: string; role: string };

export function ManagePanel({
  orgId,
  members,
  invites,
  myUserId,
}: {
  orgId: string;
  members: PanelMember[];
  invites: PanelInvite[];
  myUserId: string;
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function run(fn: () => Promise<{ error?: string } | { ok?: boolean }>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) {
        setMsg({ kind: "err", text: res.error });
      } else {
        router.refresh();
      }
    });
  }

  function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setMsg(null);
    startTransition(async () => {
      const res = await inviteMemberAction(orgId, value, role);
      if (res?.error) {
        setMsg({ kind: "err", text: res.error });
      } else {
        setEmail("");
        setMsg({ kind: "ok", text: "Invitation sent." });
        router.refresh();
      }
    });
  }

  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <div className="bg-white border border-line p-6 space-y-6">
      <h2 className="font-serif text-xl text-navy">{tr("Manage team")}</h2>

      {/* Invite */}
      <form onSubmit={sendInvite} className="space-y-3">
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
          {tr("Invite a teammate")}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr("teammate@email.com")}
            className="flex-1 px-4 py-2.5 border border-line bg-white text-ink focus:outline-none focus:border-navy"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "admin")}
            className="px-3 py-2.5 border border-line bg-white text-ink focus:outline-none focus:border-navy"
          >
            <option value="member">{tr("Member")}</option>
            <option value="admin">{tr("Admin")}</option>
          </select>
          <button
            type="submit"
            disabled={pending || !email.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {tr("Invite")}
          </button>
        </div>
        {msg && (
          <p
            className={`text-xs ${msg.kind === "ok" ? "text-gold" : "text-red-700"}`}
          >
            {tr(msg.text)}
          </p>
        )}
      </form>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
            {tr("Pending invites")}
          </p>
          <ul className="divide-y divide-line border border-line">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="inline-flex items-center gap-2 text-sm text-ink min-w-0">
                  <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <span className="truncate">{inv.email}</span>
                  <span className="text-[10px] uppercase tracking-wider text-ink-muted border border-line px-1.5 py-0.5">
                    {inv.role}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => revokeInviteAction(inv.id))}
                  className="text-xs text-ink-muted hover:text-red-700 disabled:opacity-50"
                >
                  {tr("Revoke")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Members */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
          {tr("Members")}
        </p>
        <ul className="divide-y divide-line border border-line">
          {members.map((m) => {
            const isSelf = m.userId === myUserId;
            const isOwner = m.role === "owner";
            const lockOwner = isOwner && ownerCount <= 1;
            return (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-sm text-ink truncate">
                  {m.name}
                  {isSelf && (
                    <span className="text-ink-muted"> ({tr("you")})</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner ? (
                    <span className="text-[10px] uppercase tracking-wider text-gold border border-gold/40 px-1.5 py-0.5">
                      {tr("owner")}
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          updateMemberRoleAction(
                            orgId,
                            m.userId,
                            e.target.value as "admin" | "member",
                          ),
                        )
                      }
                      className="text-xs px-2 py-1 border border-line bg-white text-ink focus:outline-none focus:border-navy"
                    >
                      <option value="member">{tr("Member")}</option>
                      <option value="admin">{tr("Admin")}</option>
                    </select>
                  )}
                  {!lockOwner && (
                    <button
                      type="button"
                      disabled={pending}
                      title={tr("Remove")}
                      onClick={() =>
                        run(() => removeMemberAction(orgId, m.userId))
                      }
                      className="text-ink-muted hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
