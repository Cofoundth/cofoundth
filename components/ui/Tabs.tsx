"use client";

// Cofoundee — the in-page tab strip. CLIENT ("use client") because the button
// form needs an onChange handler; the LINK form takes only serialisable props,
// so a server page can render it exactly like any other client component.
//
// ── WHY ────────────────────────────────────────────────────────────────────
// Seven near-identical strips shipped (browse, matches, notifications, orgs,
// settings, admin, trends), five of them as a hand-typed `tabCls(active)`
// helper in a module const. NONE of them was accessible: no `aria-current` on
// the link strips, no tablist/tab/aria-selected on the button strips, so a
// screen reader read them as a plain row of links.
//
// ── THE CLASSES, VERBATIM ──────────────────────────────────────────────────
//   wrapper   flex items-center border-b border-line
//   tab       text-sm tracking-wide border-b-2 -mb-px transition-colors
//   active    border-navy text-navy font-medium
//   inactive  border-transparent text-ink-muted hover:text-navy
//
// `rounded-none` is LOAD-BEARING on the button form and must not be deleted as
// redundant: globals.css @layer base pills EVERY <button> (border-radius:
// 9999px), which arcs a 2px underline into a smile. Two of the three existing
// button strips already carry it; the link form does not need it because an
// <a> is not matched by that base rule.
//
// ── THE BUTTON FORM IS A REAL TABLIST, KEYBOARD AND ALL ────────────────────
// `role="tablist"` is a PROMISE, and announcing "tab, selected, 1 of 3" while
// ignoring the arrow keys that announcement tells the user to press is worse
// than the plain buttons this replaces — those promised nothing. So the button
// form implements the pattern, not just its roles:
//
//   ← / →      move focus to the previous / next tab, wrapping, and select it
//              (automatic activation: these strips swap content in place, and
//              every one of them is cheap to render)
//   Home/End   first / last tab
//   tabIndex   ROVING — only the selected tab is in the page Tab sequence, so
//              Tab enters the strip once and leaves it, instead of walking
//              through every tab one at a time
//
// `aria-controls` is the remaining SHOULD-level piece: pass `panelId` on an
// item and render that id with `role="tabpanel"`. It is optional because most
// strips here filter a list rather than own a labelled panel.
//
// The wrapper defaults to <div> for the button form and <nav> for the link
// form. A tablist is not a navigation landmark, and putting `role="tablist"`
// on a <nav> silently overrides the landmark; a strip of links genuinely is
// navigation. Pass `as` to override either way.
//
// ── DENSITY ────────────────────────────────────────────────────────────────
//   default   gap-1  + px-4 py-2   six of the seven strips
//   flush     gap-6  + pb-3        BrowseClient's idea-filter strip

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { cn } from "./cn";

export type TabItem = {
  key: string;
  /** Already translated. */
  label: string;
  /** Link tabs. Omit on every item to get button tabs. */
  href?: string;
  count?: number;
  /** Button tabs: the id of the `role="tabpanel"` this tab selects. */
  panelId?: string;
};

export type TabsDensity = "default" | "flush";

export type TabsProps = {
  items: TabItem[];
  /** The `key` of the active tab. */
  value: string;
  /** Button tabs. Omit when every item has an href. */
  onChange?: (key: string) => void;
  /** Defaults to "div" for button tabs and "nav" for link tabs. */
  as?: "nav" | "div";
  density?: TabsDensity;
  /** Caller spacing — the strips ship at mb-8 (x5), mb-5 (orgs), mb-4 (trends). */
  className?: string;
  /** Accessible name for the strip. */
  "aria-label"?: string;
};

const TAB_BASE = "text-sm tracking-wide border-b-2 -mb-px transition-colors";
const TAB_ACTIVE = "border-navy text-navy font-medium";
const TAB_INACTIVE = "border-transparent text-ink-muted hover:text-navy";

const DENSITY: Record<TabsDensity, { wrap: string; tab: string }> = {
  default: { wrap: "gap-1", tab: "px-4 py-2" },
  flush: { wrap: "gap-6", tab: "pb-3" },
};

// ← / → / Home / End, read off the DOM rather than a ref array so the handler
// stays independent of how many items rendered. `.click()` rather than calling
// onChange directly keeps focus movement and selection on one code path.
function onTabKeyDown(e: KeyboardEvent<HTMLElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  const tabs = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    ),
  );
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (tabs.length === 0 || current === -1) return;
  e.preventDefault();
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? tabs.length - 1
        : e.key === "ArrowLeft"
          ? (current - 1 + tabs.length) % tabs.length
          : (current + 1) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
}

export function Tabs({
  items,
  value,
  onChange,
  as,
  density = "default",
  className,
  "aria-label": ariaLabel,
}: TabsProps) {
  const d = DENSITY[density];
  const asButtons = !!onChange;
  const Tag = as ?? (asButtons ? "div" : "nav");

  return (
    <Tag
      className={cn("flex items-center border-b border-line", d.wrap, className)}
      role={asButtons ? "tablist" : undefined}
      aria-label={ariaLabel}
      onKeyDown={asButtons ? onTabKeyDown : undefined}
    >
      {items.map((item) => {
        const active = item.key === value;
        const cls = cn(TAB_BASE, d.tab, active ? TAB_ACTIVE : TAB_INACTIVE);
        const body = (
          <>
            {item.label}
            {item.count !== undefined && (
              <>
                {" "}
                <span className="text-xs text-ink-muted">({item.count})</span>
              </>
            )}
          </>
        );

        if (item.href && !asButtons) {
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cls}
            >
              {body}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={item.panelId}
            // Roving: the strip is ONE Tab stop. Arrow keys move within it.
            tabIndex={active ? 0 : -1}
            onClick={() => onChange?.(item.key)}
            className={cn(cls, "rounded-none")}
          >
            {body}
          </button>
        );
      })}
    </Tag>
  );
}
