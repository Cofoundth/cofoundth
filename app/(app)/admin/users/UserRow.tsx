"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import {
  adminSetUserSuspended,
  adminSetUserVerified,
  adminSetUserAdmin,
  adminDeleteUser,
} from "@/lib/admin-actions";

export type AdminUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  photoUrl: string | null;
  slug: string | null;
  onboarded: boolean;
  suspended: boolean;
  verified: boolean;
  isAdmin: boolean;
  isBot: boolean;
};

const btn =
  "px-2 py-1 text-[11px] border border-line text-ink hover:border-navy disabled:opacity-50 transition-colors";

function Badge({ tone, children }: { tone: "gold" | "red" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "gold"
      ? "border-gold text-gold"
      : tone === "red"
        ? "border-red-300 text-red-700"
        : "border-line text-ink-muted";
  return (
    <span className={`text-[9px] uppercase tracking-[0.12em] border px-1 py-0.5 ${cls}`}>
      {children}
    </span>
  );
}

export function UserRow({ user, selfId }: { user: AdminUser; selfId: string }) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSelf = user.id === selfId;
  const run = (fn: () => Promise<unknown>) => start(() => fn().then(() => {}));

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
      <Link href={`/profile/${user.slug ?? user.id}`} className="shrink-0">
        <Avatar name={user.fullName} url={user.photoUrl} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-navy font-medium flex items-center gap-2 flex-wrap">
          <span className="truncate">{user.fullName ?? "—"}</span>
          {user.isBot && (
            <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 bg-navy text-white">
              Bot
            </span>
          )}
          {user.isAdmin && <Badge tone="gold">Admin</Badge>}
          {user.verified && <Badge tone="gold">Verified</Badge>}
          {user.suspended && <Badge tone="red">Hidden</Badge>}
          {!user.onboarded && <Badge tone="muted">No profile</Badge>}
        </div>
        <div className="text-xs text-ink-muted truncate">{user.email ?? "—"}</div>
      </div>
      </div>

      {isSelf ? (
        <span className="text-xs text-ink-muted shrink-0">You</span>
      ) : (
        <div className="flex flex-wrap gap-1.5 sm:justify-end shrink-0">
          <button
            disabled={pending}
            onClick={() => run(() => adminSetUserSuspended(user.id, !user.suspended))}
            className={btn}
          >
            {user.suspended ? "Unhide" : "Hide"}
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => adminSetUserVerified(user.id, !user.verified))}
            className={btn}
          >
            {user.verified ? "Unverify" : "Verify"}
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => adminSetUserAdmin(user.id, !user.isAdmin))}
            className={btn}
          >
            {user.isAdmin ? "Remove admin" : "Make admin"}
          </button>
          {confirmDelete ? (
            <>
              <button
                disabled={pending}
                onClick={() => run(() => adminDeleteUser(user.id))}
                className="px-2 py-1 text-[11px] bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
              >
                Confirm delete
              </button>
              <button
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
                className={btn}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
              className="px-2 py-1 text-[11px] border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
