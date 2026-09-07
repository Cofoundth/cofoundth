// The ONE definition of which surfaces the soft launch shows.
//
// These flags hide ENTRY POINTS — nav items, dashboard blocks, a tab — and
// nothing else. The routes stay live and reachable by direct URL on purpose:
// there are real organizations, org_deals and investor_deals rows in
// production, and lib/notifications.ts deep-links "deal_proposed" to
// /orgs/<slug> and "funding_proposed" to /funding/<id>. Hiding a doorway is
// reversible; 404ing a route breaks a notification someone already received.
//
// INVESTOR navigation is deliberately exempt. An investor account IS the
// funding surface — INVESTOR_HOME is "/funding" (lib/investor-routes.ts) and
// the middleware bounces investors there — so removing Funding from their nav
// would strand them on a page they cannot navigate to.
//
// Flipping a flag to true restores that surface everywhere at once, in its
// original position. That is the whole reason this is one imported module
// rather than a boolean repeated in four files: the copies cannot drift.
//
// `meetupsNew` is the odd one out: it is a MARKER, not a surface. The other two
// decide whether a nav item exists at all; this one only decorates an item that
// is already there with a "New" chip for the soft launch. Nothing is hidden when
// it is false — the Meetups link renders either way. Set it false once Meetups
// has stopped being news (a few weeks after launch); a permanent "New" badge is
// just noise that teaches people to ignore the chip.
//
// Typed as `boolean` rather than inferred as literal `false`/`true` so both
// branches of every call site keep type-checking whichever way a flag points.
export const FEATURES: {
  companies: boolean;
  funding: boolean;
  meetupsNew: boolean;
} = {
  /** /orgs — the multi-user company directory, B2B connect/chat/deals. */
  companies: false,
  /** /funding — investor connections and funding talks, founder side. */
  funding: false,
  /** "New" chip on the Meetups nav item — a launch marker, not a surface. */
  meetupsNew: true,
};
