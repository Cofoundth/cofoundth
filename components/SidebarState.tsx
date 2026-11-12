"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { ChevronsLeft } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import {
  RAIL_ID,
  RAIL_TIP_ALWAYS,
  SIDEBAR_COLLAPSED,
  SIDEBAR_COOKIE,
} from "@/lib/sidebar";

// The desktop rail's state, on the client. Two independent pieces:
//
//   collapsed  1280px and up only. The member's choice, kept in a cookie
//              (lib/sidebar.ts) so the server paints the right width first.
//   overlay    768-1279px only. Whether the icon rail's toggle has opened the
//              full rail as a drawer over the page. Never remembered: every
//              page load starts with it closed, which is also what the
//              server renders, and every navigation closes it.
//
// Which of the two a given screen uses is decided by CSS breakpoints alone
// (the `rail-collapsed:` variant in app/globals.css), so nothing here measures
// the viewport before first paint.
//
// The cookie IS the collapsed store. useSyncExternalStore reads it directly,
// which covers the three ways a shell can mount:
//   - hydration: the server snapshot (the cookie AppShell read) is used, so
//     the markup matches exactly — no hydration mismatch, no flash;
//   - a soft navigation that mounts a fresh shell (app <-> marketing are two
//     layouts, each rendering AppShell): the live cookie is read;
//   - back/forward restoring a cached RSC payload rendered BEFORE a toggle:
//     the payload's prop is stale, but getSnapshot reads the cookie, so the
//     rail still comes back at the width the member last chose.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCollapsed(): boolean {
  return document.cookie
    .split("; ")
    .includes(`${SIDEBAR_COOKIE}=${SIDEBAR_COLLAPSED}`);
}

function writeCollapsed(collapsed: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // Expanded is the default and is stored as no cookie at all.
  document.cookie = collapsed
    ? `${SIDEBAR_COOKIE}=${SIDEBAR_COLLAPSED}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
    : `${SIDEBAR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  for (const listener of listeners) listener();
}

// The two media ranges the rail has state in. Same numbers as the variant in
// app/globals.css (48rem = md, 80rem = xl).
const OVERLAY_RANGE = "(width >= 48rem) and (width < 80rem)";
const WIDE_RANGE = "(width >= 80rem)";

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
  overlayOpen: boolean;
  toggleOverlay: () => void;
  overlayToggleRef: RefObject<HTMLButtonElement | null>;
};

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  overlayOpen: false,
  toggleOverlay: () => {},
  overlayToggleRef: { current: null },
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// Keyboard shortcut guard: never steal Ctrl/Cmd+B from someone typing — it is
// "bold" in every rich editor — and never act where there is no rail.
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable]") !== null
  );
}

// Nor while a modal is open (components/ui/Dialog.tsx, the unsend confirm in
// MessageThread — both mark their panel aria-modal). The dialog owns the
// keyboard and the rail sits behind its scrim: at 768-1279 the shortcut opened
// the drawer UNDER the dialog and moved focus out of the modal onto a link no
// one could see (Enter there left the page mid-wizard); from 1280 it flipped
// the rail behind the modal and wrote the cookie.
function isModalOpen() {
  return document.querySelector('[aria-modal="true"]') !== null;
}

// A click that navigates THIS tab — Next's Link applies the same test
// (isModifiedEvent) before it soft-navigates. A modified click, a target other
// than _self or a download leaves the page, and so the drawer, where it was.
function navigatesInPlace(e: MouseEvent, link: HTMLAnchorElement) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return false;
  const target = link.getAttribute("target");
  return (!target || target === "_self") && !link.hasAttribute("download");
}

// Places an icon-rail tooltip (RAIL_TIP, lib/sidebar.ts) level with its
// trigger, from the trigger's LIVE rect. The tooltip is `fixed`, and a fixed
// box left at `top: auto` stays at its static position — the row's position
// with the nav unscrolled — so on a short window, once the nav had scrolled,
// labels floated beside the wrong icon. Only tips that are actually fixed
// right now (icon rail) are touched; on the expanded rail they are plain text.
function placeRailTips(trigger: Element) {
  const tips = trigger.querySelectorAll<HTMLElement>(".rail-tip");
  if (!tips.length) return;
  const box = trigger.getBoundingClientRect();
  for (const tip of tips) {
    if (getComputedStyle(tip).position !== "fixed") continue;
    const top = Math.round(box.top + box.height / 2 - tip.offsetHeight / 2);
    tip.style.setProperty("--rail-tip-top", `${top}px`);
  }
}

// The root of the signed-in shell. Everything rail-specific is CSS keyed off
// this element's data-sidebar / data-overlay attributes (the `rail-collapsed:`
// and `rail-overlay:` variants in app/globals.css), so server components in
// the rail never need to know the state — only the handful of client controls
// that change a label read it.
export function SidebarFrame({
  initialCollapsed,
  className,
  children,
}: {
  initialCollapsed: boolean;
  className?: string;
  children: ReactNode;
}) {
  const collapsed = useSyncExternalStore(
    subscribe,
    readCollapsed,
    () => initialCollapsed,
  );
  const toggle = useCallback(() => writeCollapsed(!readCollapsed()), []);

  // ANY navigation closes the overlay, and it STAYS closed: however the page
  // changed — a rail link, a link on the page, the browser's Back or Forward —
  // the pathname did, and the render that sees the new one resets the state
  // (react.dev "adjusting some state when a prop changes", as NotificationBell
  // does), so the new page never paints with the drawer over it. The previous
  // version only HID the drawer while the path differed and kept it open in
  // state, so coming back to the page it was opened on brought it back unasked
  // and pulled focus into it. A link to the page already showing changes no
  // pathname; the overlay effect below closes on that click instead.
  const pathname = usePathname();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayPath, setOverlayPath] = useState(pathname);
  if (overlayPath !== pathname) {
    setOverlayPath(pathname);
    setOverlayOpen(false);
  }
  const overlayToggleRef = useRef<HTMLButtonElement | null>(null);

  /** `returnFocus`: put focus back on the overlay toggle (Escape, the
   *  backdrop). False when focus is already going somewhere the member chose
   *  — a link, a control outside the rail. */
  const closeOverlay = useCallback((returnFocus = false) => {
    setOverlayOpen(false);
    if (returnFocus) overlayToggleRef.current?.focus();
  }, []);
  const toggleOverlay = useCallback(() => setOverlayOpen((o) => !o), []);

  // Ctrl/Cmd+B: the persistent collapse from 1280px, the overlay below it.
  useEffect(() => {
    const overlayRange = window.matchMedia(OVERLAY_RANGE);
    const wideRange = window.matchMedia(WIDE_RANGE);
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      // The letter, or — on a non-Latin layout such as Thai Kedmanee, where
      // that key types a Thai character — the physical B key.
      const isB =
        e.key.toLowerCase() === "b" ||
        (e.code === "KeyB" && !/^[a-z]$/i.test(e.key));
      if (!isB || e.repeat || e.defaultPrevented) return;
      if (isTypingTarget(e.target) || isModalOpen()) return;
      if (wideRange.matches) {
        e.preventDefault();
        toggle();
      } else if (overlayRange.matches) {
        e.preventDefault();
        toggleOverlay();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, toggleOverlay]);

  // While the overlay is open: focus moves into it, Escape closes it and puts
  // focus back on the toggle, focus leaving the rail closes it, and so does
  // the window leaving the 768-1279 range (at 1280 the same rail is the
  // persistent one; below 768 it does not exist).
  //
  // So does a click on ANY link in it — the brand mark, a nav item, the
  // avatar, a legal link, an item in the bell's panel — the page already
  // showing included, which is the one navigation the pathname reset above
  // cannot see. One listener on the rail rather than an onClick per link:
  // most of those links are server-rendered and could not take one, and the
  // ones that did (only the nav items, once) left the others open.
  useEffect(() => {
    if (!overlayOpen) return;
    const rail = document.getElementById(RAIL_ID);
    rail?.querySelector<HTMLElement>("nav a")?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) closeOverlay(true);
    }
    function onFocusIn(e: FocusEvent) {
      if (e.target instanceof Node && !rail?.contains(e.target))
        closeOverlay(false);
    }
    function onClick(e: MouseEvent) {
      const link =
        e.target instanceof Element
          ? e.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || !navigatesInPlace(e, link)) return;
      closeOverlay(false);
      // Focus stays on the link the member chose — unless the icon rail does
      // not show it (the legal trio) or it unmounted (an item in the bell's
      // panel), which would drop focus to <body>. By the next frame the
      // closed rail has rendered.
      requestAnimationFrame(() => {
        if (!link.getClientRects().length) overlayToggleRef.current?.focus();
      });
    }
    const range = window.matchMedia(OVERLAY_RANGE);
    function onRange() {
      if (!range.matches) closeOverlay(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    rail?.addEventListener("click", onClick);
    range.addEventListener("change", onRange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      rail?.removeEventListener("click", onClick);
      range.removeEventListener("change", onRange);
    };
  }, [overlayOpen, closeOverlay]);

  // Icon-rail tooltips follow their trigger (see placeRailTips). Hover and
  // keyboard focus place the tip before it becomes visible — both events fire
  // before the :hover / :focus-visible paint — and a scroll of the nav moves
  // the tip of whatever is still hovered or focused.
  useEffect(() => {
    const TRIGGER = ".group\\/rail";
    function onEnter(e: Event) {
      const trigger =
        e.target instanceof Element ? e.target.closest(TRIGGER) : null;
      if (trigger && document.getElementById(RAIL_ID)?.contains(trigger))
        placeRailTips(trigger);
    }
    function onScroll() {
      document
        .getElementById(RAIL_ID)
        ?.querySelectorAll(`${TRIGGER}:hover, ${TRIGGER}:focus-visible`)
        .forEach(placeRailTips);
    }
    document.addEventListener("pointerover", onEnter);
    document.addEventListener("focusin", onEnter);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerover", onEnter);
      document.removeEventListener("focusin", onEnter);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      toggle,
      overlayOpen,
      toggleOverlay,
      overlayToggleRef,
    }),
    [collapsed, toggle, overlayOpen, toggleOverlay],
  );

  return (
    <SidebarContext value={value}>
      <div
        data-sidebar={collapsed ? "collapsed" : "expanded"}
        data-overlay={overlayOpen ? "open" : undefined}
        className={className}
      >
        {/* The overlay's click-outside. It covers everything but the rail
            (same z-50, and the rail comes later in the DOM, so it paints on
            top). Not a button: a mouse press would focus it, and the
            focus-leaves-the-rail close would fire before this click could put
            focus back on the toggle.

            The phone menu's tint (bg-navy/20), and like it NO blur: the
            founder dropped the blur from both (2026-11-12). Frosting the page
            hid the page the member was navigating from; the tint alone still
            says the page is inactive and that a click on it closes the drawer.

            An OVERLAY at these widths, never a push: a 256px rail taking
            width below 1280 squeezed the viewport-keyed card grids (3-up
            columns of 219px at 1024, see CLAUDE.md, Layout), and it would
            reflow the whole page for a menu that closes on the next
            navigation. From 1280 the rail is persistent and does take width. */}
        {overlayOpen && (
          <div
            aria-hidden="true"
            onClick={() => closeOverlay(true)}
            className="hidden md:block xl:hidden fixed inset-0 z-50 bg-navy/20"
          />
        )}
        {children}
      </div>
    </SidebarContext>
  );
}

// The rail's toggle, as TWO buttons of which CSS shows one: below 1280px it
// opens/closes the overlay drawer, from 1280px it collapses/expands the
// persistent rail. They are separate because their aria-expanded differs
// (the overlay always starts closed; the persistent rail starts at the
// cookie), and the server cannot know the width to pick one value.
// One chevron, turned round by CSS whenever the icon rail is showing.
export function SidebarToggle() {
  const { collapsed, toggle, overlayOpen, toggleOverlay, overlayToggleRef } =
    useSidebar();
  const tr = useT();
  const overlayLabel = overlayOpen
    ? tr("Collapse sidebar")
    : tr("Expand sidebar");
  const railLabel = collapsed ? tr("Expand sidebar") : tr("Collapse sidebar");
  const base =
    "group/rail shrink-0 items-center justify-center w-9 h-9 text-ink-muted hover:text-navy hover:bg-cream transition-colors";
  const chevron = (
    <ChevronsLeft
      aria-hidden="true"
      className="w-5 h-5 rail-collapsed:rotate-180"
      strokeWidth={1.5}
    />
  );
  return (
    <>
      <button
        ref={overlayToggleRef}
        type="button"
        onClick={toggleOverlay}
        aria-label={overlayLabel}
        aria-expanded={overlayOpen}
        aria-controls={RAIL_ID}
        aria-keyshortcuts="Control+B Meta+B"
        className={`flex xl:hidden ${base}`}
      >
        {chevron}
        <span aria-hidden="true" className={RAIL_TIP_ALWAYS}>
          {overlayLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-label={railLabel}
        aria-expanded={!collapsed}
        aria-controls={RAIL_ID}
        aria-keyshortcuts="Control+B Meta+B"
        className={`hidden xl:flex ${base}`}
      >
        {chevron}
        <span aria-hidden="true" className={RAIL_TIP_ALWAYS}>
          {railLabel}
        </span>
      </button>
    </>
  );
}
