"use client";

import { useMemo, useState } from "react";
import { UserRow, type AdminUser } from "./UserRow";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "hidden", label: "Hidden" },
  { key: "admin", label: "Admins" },
  { key: "verified", label: "Verified" },
  { key: "no_profile", label: "No profile" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function UsersAdmin({
  users,
  selfId,
}: {
  users: AdminUser[];
  selfId: string;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const query = q.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (
          query &&
          !`${u.fullName ?? ""} ${u.email ?? ""}`
            .toLowerCase()
            .includes(query)
        )
          return false;
        switch (filter) {
          case "active":
            return u.onboarded && !u.suspended;
          case "hidden":
            return u.suspended;
          case "admin":
            return u.isAdmin;
          case "verified":
            return u.verified;
          case "no_profile":
            return !u.onboarded;
          default:
            return true;
        }
      }),
    [users, query, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="flex-1 px-3 py-2 border border-line bg-white text-sm text-ink focus:outline-none focus:border-navy"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs border transition-colors ${
                filter === f.key
                  ? "bg-navy border-navy text-white"
                  : "bg-white border-line text-ink hover:border-navy"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-muted">{filtered.length} shown</p>
      <div className="bg-white border border-line divide-y divide-line">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            No users match.
          </div>
        ) : (
          filtered.map((u) => <UserRow key={u.id} user={u} selfId={selfId} />)
        )}
      </div>
    </div>
  );
}
