"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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

type CollapseState = { collapsed: boolean; toggle: () => void };

const CollapseContext = createContext<CollapseState | null>(null);

export function ConversationLayout({
  conversation,
  aside,
}: {
  conversation: ReactNode;
  aside: ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const toggle = useCallback(() => {
    setCollapsed(!snapshot());
  }, []);

  return (
    <CollapseContext.Provider value={{ collapsed, toggle }}>
      {/* 100dvh, not 100vh: on mobile Safari/Chrome `vh` is the *largest*
          viewport, so with the URL bar showing, the last 60-100px of this
          column — the composer — sat underneath the browser chrome and was
          unreachable. `dvh` tracks the visible viewport and keeps the composer
          on screen. */}
      <div className="max-w-[1120px] mx-auto h-[calc(100dvh-4rem)] lg:h-dvh grid xl:grid-cols-12">
        <div
          className={`flex flex-col h-full min-h-0 border-line ${
            collapsed ? "xl:col-span-12" : "xl:col-span-8 xl:border-r"
          }`}
        >
          {conversation}
        </div>

        {/* Desktop only, in both states: below xl the grid is one column and
            the panel has never shown, so the toggle is hidden there too. The
            column's border is `xl:border-r` for the same reason — a rule with
            nothing to its right is just a stray line. */}
        <aside
          id={PANEL_ID}
          className={
            collapsed
              ? "hidden"
              : "hidden xl:flex xl:col-span-4 flex-col bg-white overflow-y-auto p-6 rounded-xl"
          }
        >
          {aside}
        </aside>
      </div>
    </CollapseContext.Provider>
  );
}

// Lives in the conversation header next to ConversationActions — the right
// end of the conversation column, i.e. the edge the panel is attached to, so
// the control sits where the thing it controls does.
export function NextStepsToggle() {
  const tr = useT();
  const ctx = useContext(CollapseContext);
  if (!ctx) return null;

  const label = ctx.collapsed
    ? tr("Show quick replies")
    : tr("Hide quick replies");
  const Icon = ctx.collapsed ? PanelRightOpen : PanelRightClose;

  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-expanded={!ctx.collapsed}
      aria-controls={PANEL_ID}
      className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-white hover:border-navy text-xs text-ink tracking-wide transition-colors rounded-full"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
      {label}
    </button>
  );
}
