"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui";
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

// px-2 py-1 / 11px is off both scales (the smallest Button size is
// px-3 py-1.5 / text-xs); per the sweep's rule the exact pixels stay as a
// className and cn() merges them over the size. Neither button sits in a
// <form>, so Button's implicit type="button" changes nothing.
const DENSE = "px-2 py-1 text-[11px]";

function Badge({ tone, children }: { tone: "gold" | "red" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "gold"
      ? "border-line text-gold-ink"
      : tone === "red"
        ? "border-danger-line text-danger-ink"
        : "border-line text-ink-muted";
  return (
    <span className={`text-xs uppercase tracking-[0.12em] border rounded-full px-1 py-0.5 ${cls}`}>
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
            <span className="text-xs uppercase tracking-[0.12em] px-1.5 py-0.5 bg-navy text-white">
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
          <Button
            variant="secondary"
            size="xs"
            className={DENSE}
            disabled={pending}
            onClick={() => run(() => adminSetUserSuspended(user.id, !user.suspended))}
          >
            {user.suspended ? "Unhide" : "Hide"}
          </Button>
          <Button
            variant="secondary"
            size="xs"
            className={DENSE}
            disabled={pending}
            onClick={() => run(() => adminSetUserVerified(user.id, !user.verified))}
          >
            {user.verified ? "Unverify" : "Verify"}
          </Button>
          <Button
            variant="secondary"
            size="xs"
            className={DENSE}
            disabled={pending}
            onClick={() => run(() => adminSetUserAdmin(user.id, !user.isAdmin))}
          >
            {user.isAdmin ? "Remove admin" : "Make admin"}
          </Button>
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                size="xs"
                className={DENSE}
                disabled={pending}
                onClick={() => run(() => adminDeleteUser(user.id))}
              >
                Confirm delete
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className={DENSE}
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="danger-outline"
              size="xs"
              className={DENSE}
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
