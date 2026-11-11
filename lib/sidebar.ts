// The desktop rail's state — one definition, shared by the server
// (components/AppShell.tsx reads the cookie so the FIRST paint is already the
// right width) and the client (components/SidebarState.tsx writes it).
//
// THREE CHROMES, picked by CSS breakpoints alone (app/globals.css,
// `rail-collapsed:`), so the server never has to guess a width:
//   below 768px (md)   the phone top bar + hamburger (MobileMenu); no rail
//   768px - 1279px     the 64px ICON RAIL, always. Its toggle opens the full
//                      256px rail as an OVERLAY drawer above the page — it
//                      pushes nothing, and it is not remembered
//   1280px (xl) and up the rail follows this cookie: 256px by default,
//                      collapsible to the 64px icon rail
//
// A cookie, not localStorage, because only a cookie reaches the server render.
// With localStorage the server would have to guess, and every collapsed member
// would see a 256px rail snap to 64px on each hard load. Expanded is the
// default and is stored as NO cookie, so there is one spelling of "collapsed"
// and nothing else to parse.
//
// NOT a "use client" module on purpose: AppSidebar and LanguageSwitcher are
// server components and import the class strings below. An export from a
// "use client" file reaches a server component as a client REFERENCE, not as
// the string, so the classes would silently vanish.
export const SIDEBAR_COOKIE = "cofoundee_sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";

// The id of the rail's <aside>: both toggles' aria-controls target, and the
// boundary the overlay's outside-click / focus-leave checks test against.
export const RAIL_ID = "app-rail";

// The label of a rail control while the rail is an icon rail: hidden until its
// trigger (the nearest `group/rail`) is hovered or keyboard-focused, then shown
// as a small overlay just beside the 64px rail.
//
// Put it on the element that IS the control's label (the nav item's text, the
// "Sign out" text), not on a copy: opacity-0 keeps it in the accessibility
// tree, so the control's accessible name is unchanged in both states and there
// is no second string to drift. When the rail is expanded none of these classes
// match and the element is plain inline text again.
//
// `fixed`, because the rail clips (overflow-clip) and an `absolute` tooltip
// beside it would be cut off at its edge. A fixed box is not clipped by those
// ancestors. left-18 = 72px: the 64px rail plus an 8px gap.
//
// VERTICAL POSITION IS MEASURED, not static. A fixed box with `top: auto` sits
// at its static position, which is right in an unscrolled column but NOT once
// the nav scrolls: Chrome keeps it where the row would be with scrollTop 0, so
// on a short window the label floated beside a different icon (86px off,
// measured). SidebarFrame (components/SidebarState.tsx) sets `--rail-tip-top`
// on the tip from the trigger's live rect on hover, focus and nav scroll; the
// `rail-tip` marker class is how it finds the tip. Until it is set, the
// variable is invalid, `top` falls back to auto, and the static position — the
// right answer whenever nothing has scrolled — still applies.
//
// Overlay surface per CLAUDE.md "Surfaces": rounded-xl, border-line, shadow-lg.
// text-sm (14px, line-height 1.43) — the functional-UI floor for translatable
// text, and Thai-safe on one line.
export const RAIL_TIP =
  "rail-tip rail-collapsed:fixed rail-collapsed:left-18 rail-collapsed:top-(--rail-tip-top) rail-collapsed:z-50 rail-collapsed:whitespace-nowrap rail-collapsed:px-3 rail-collapsed:py-1.5 rail-collapsed:rounded-xl rail-collapsed:border rail-collapsed:border-line rail-collapsed:bg-white rail-collapsed:shadow-lg rail-collapsed:text-sm rail-collapsed:font-normal rail-collapsed:text-ink rail-collapsed:pointer-events-none rail-collapsed:opacity-0 rail-collapsed:group-hover/rail:opacity-100 rail-collapsed:group-focus-visible/rail:opacity-100";

// The same overlay for a control that is icon-only in BOTH states (the
// toggles). Expanded it sits beside the 256px rail (left-66 = 264px), as an icon
// rail beside the 64px one. Hidden below md, where there is no rail. The
// toggles live in the rail's top block, which never scrolls, so the static
// position is always right for these.
export const RAIL_TIP_ALWAYS =
  "hidden md:block fixed left-66 rail-collapsed:left-18 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl border border-line bg-white shadow-lg text-sm font-normal text-ink pointer-events-none opacity-0 group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100";

// The legal trio, same hrefs and translation keys as the "Legal" column of
// components/marketing/MarketingFooter.tsx. The signed-in shell has no footer,
// so these ride at the bottom of the expanded rail / overlay and in the phone
// menu — on a PDPA-facing product a member must always have a path to them.
export const LEGAL_LINKS = [
  { label: "Privacy (PDPA)", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Code of Conduct", href: "/code-of-conduct" },
] as const;
