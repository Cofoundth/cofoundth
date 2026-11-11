"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Check } from "lucide-react";
import { setActiveOrgAction } from "@/app/(app)/orgs/active-org-actions";
import { useT } from "@/lib/i18n-client";
import { RAIL_TIP } from "@/lib/sidebar";

// Shown only when the user belongs to more than one company — lets them pick
// which company they're acting as (connect / propose / chat sender).
//
// `rail` is the rail's copy. On the full rail (and the overlay drawer) it is the
// same <select>. On the 64px icon rail a select cannot shrink to an icon, and
// its native list would drop down from x=12, over the rail itself. So the icon
// rail swaps it (pure CSS, `rail-collapsed:`) for a 40px briefcase tile that
// opens a small list BESIDE the rail. Both paths call the same `choose()`. The
// rail's bottom block never scrolls, so the list's static position holds.
export function OrgSwitcher({
  orgs,
  activeId,
  rail = false,
}: {
  orgs: { id: string; name: string }[];
  activeId: string;
  rail?: boolean;
}) {
  const router = useRouter();
  const tr = useT();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (orgs.length < 2) return null;

  const label = tr("Acting as company");
  const activeName = orgs.find((o) => o.id === activeId)?.name ?? "";

  function choose(next: string) {
    start(async () => {
      await setActiveOrgAction(next);
      router.refresh();
    });
  }

  const select = (
    <select
      value={activeId}
      disabled={pending}
      onChange={(e) => choose(e.target.value)}
      className={`text-xs px-2 py-1 border border-line bg-white text-ink focus:outline-none focus:border-navy disabled:opacity-50 max-w-[10rem] rounded-full ${
        rail ? "rail-collapsed:hidden" : ""
      }`}
      aria-label={label}
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );

  if (!rail) return select;

  return (
    <div ref={rootRef}>
      {select}
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        aria-label={`${label}: ${activeName}`}
        aria-expanded={open}
        aria-controls={panelId}
        className="group/rail hidden rail-collapsed:flex items-center justify-center w-10 h-10 text-ink-muted hover:text-navy transition-colors disabled:opacity-50"
      >
        {/* Not Building2: that is the Companies nav item's icon, and both
            show in the same 64px column whenever FEATURES.companies is on. */}
        <BriefcaseBusiness aria-hidden="true" className="w-5 h-5" strokeWidth={1.5} />
        {!open && (
          <span aria-hidden="true" className={`hidden rail-collapsed:block ${RAIL_TIP}`}>
            {activeName}
          </span>
        )}
      </button>
      {open && (
        // Beside the rail (left-18 = 72px) and opening UPWARD from the tile:
        // `fixed` with top AUTO sits at its static position, directly under
        // the tile, and -translate-y-full lifts it by its own height so its
        // bottom lines up with the tile's. `fixed` because the rail clips.
        // Overlay surface: rounded-xl, border-line, shadow-lg.
        <div
          id={panelId}
          className="hidden rail-collapsed:block fixed left-18 z-50 -translate-y-full w-64 p-2 bg-white border border-line rounded-xl shadow-lg"
        >
          <p className="px-2 pt-1 pb-2 text-xs text-ink-muted">{label}</p>
          <ul className="space-y-0.5">
            {orgs.map((o) => {
              const isActive = o.id === activeId;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setOpen(false);
                      triggerRef.current?.focus();
                      if (!isActive) choose(o.id);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                      isActive
                        ? "bg-gold text-navy font-medium"
                        : "text-ink hover:bg-cream hover:text-navy"
                    }`}
                  >
                    <span className="min-w-0 truncate">{o.name}</span>
                    {isActive && (
                      <Check aria-hidden="true" className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
