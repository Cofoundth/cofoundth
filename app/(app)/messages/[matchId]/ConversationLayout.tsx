"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useT } from "@/lib/i18n-client";

// The chat page is a Server Component (it does all the Supabase reads), so the
// only client state here is "is the right-hand panel showing". The two
// server-rendered subtrees arrive as props and are placed inside this grid —
// the interleaving pattern from
// node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
// — which keeps the data fetching on the server.

const STORAGE_KEY = "cofoundee:messages:next-steps-collapsed";

// The toggle's aria-controls has to name a node that is really in the DOM, so
// the aside stays mounted when collapsed and is hidden by class.
const PANEL_ID = "conversation-next-steps";

// ---------------------------------------------------------------------------
// The preference is a per-device convenience living OUTSIDE React, so it is
// modelled as an external store rather than state-plus-an-effect. That is what
// keeps the first client render identical to the server's: React renders
// `serverSnapshot()` (open) during hydration and only swaps in the stored value
// afterwards, so there is nothing to mismatch. localStorage is read lazily and
// cached, because useSyncExternalStore requires a snapshot that is stable
// between calls.
//
// The cached value is also the source of truth when storage is unavailable
// (private mode, blocked cookies): the toggle still works for the page view,
// it just does not survive a reload.
// ---------------------------------------------------------------------------
let collapsedCache: boolean | null = null;
const listeners = new Set<() => void>();

function snapshot(): boolean {
  if (collapsedCache === null) {
    try {
      collapsedCache = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      collapsedCache = false;
    }
  }
  return collapsedCache;
}

function serverSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function setCollapsed(next: boolean): void {
  collapsedCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage blocked — the in-memory cache above still drives this page view.
  }
  for (const l of listeners) l();
}

export function ConversationLayout({
  conversation,
  aside,
}: {
  conversation: ReactNode;
  aside: ReactNode;
}) {
  const tr = useT();
  const collapsed = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const toggle = useCallback(() => {
    setCollapsed(!snapshot());
  }, []);
  const label = collapsed ? tr("Show quick replies") : tr("Hide quick replies");
  const Icon = collapsed ? PanelRightOpen : PanelRightClose;

  return (
    <>
      {/* 100dvh, not 100vh: on mobile Safari/Chrome `vh` is the *largest*
          viewport, so with the URL bar showing, the last 60-100px of this
          column — the composer — sat underneath the browser chrome and was
          unreachable. `dvh` tracks the visible viewport and keeps the composer
          on screen. */}
      {/* FULL-BLEED, deliberately. Chat is exempt from the two page widths
          (CLAUDE.md: "Reading/article, chat — exempt"), and capping the whole
          view at 1120 left the white header, the cream thread and the panel
          floating as an island with cream gutters either side. The SURFACES
          now fill the content area; the CONTENT inside them is capped at 1120
          (header row, thread, composer) so line lengths are unchanged. */}
      <div className="relative h-[calc(100dvh-4rem)] lg:h-dvh flex">
        <div
          className={`flex flex-1 min-w-0 flex-col h-full min-h-0 border-line ${
            collapsed ? "" : "xl:border-r"
          }`}
        >
          {conversation}
        </div>

        {/* Desktop only, in both states: below xl the panel has never shown,
            so the toggle is hidden there too. The column's border is
            `xl:border-r` for the same reason — a rule with nothing to its
            right is just a stray line. A FIXED 360px beats a fraction: on a
            wide monitor a 4/12 panel would grow to 480px of quick replies
            while the conversation is what deserves the room. No radius now
            that it runs to the edge of the viewport. */}
        <aside
          id={PANEL_ID}
          className={
            collapsed
              ? "hidden"
              : "hidden xl:flex xl:w-[360px] shrink-0 flex-col bg-white overflow-y-auto p-6"
          }
        >
          {aside}
        </aside>

        {/* ON THE SEAM, not in the header: an unlabelled icon in a row of
            action buttons says nothing about WHAT it acts on. Straddling the
            divider it points at the panel it opens — the handle every editor
            puts there. The 12px overlap lands inside the panel's p-6 padding,
            so it never sits on content. */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={PANEL_ID}
          aria-label={label}
          title={label}
          className={`hidden xl:grid absolute top-1/2 z-20 h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink-muted shadow-xs transition-colors hover:border-navy hover:text-navy ${
            collapsed ? "right-3" : "right-[360px] translate-x-1/2"
          }`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}
