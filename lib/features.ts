// The ONE definition of which surfaces the soft launch shows.
//
// These flags hide ENTRY POINTS — nav items, page blocks, a tab — and
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
// `meetupsNew` is the odd one out: a MARKER, not a surface. `companies` and
// `funding` decide whether a nav item exists at all; this one only decorates an
// item that is already there with a "New" chip for the soft launch. Nothing is
// hidden when it is false — the Meetups link renders either way. Set it false
// once Meetups has stopped being news (a few weeks after launch); a permanent
// "New" badge is just noise that teaches people to ignore the chip. (Products
// had the same marker until 2026-11-12, when the deck became the page every
// member lands on — a chip on your own landing is that noise.)
//
// `investorSignup` is a third kind again: not a surface and not a marker, but a
// DOORWAY ONTO A ROLE. False removes the "Investor" option from the signup
// picker (components/auth/SignupForm.tsx) and makes the signup action and the
// OAuth callback refuse that value — and that is ALL it does. There are real
// investor accounts in production, created over months, and they keep working
// exactly as before: the 'investor' value stays in the account_type CHECK,
// /investor and /funding stay live, INVESTOR_HOME still points at /funding, and
// every investor route and write gate in lib/roles.ts is untouched. Hiding the
// way IN is not the same as removing the role — read the paragraph above about
// 404ing a route someone already has a notification for, and note that these
// members cannot re-signup to recover anything.
//
// Flip it true if investor self-signup is wanted again; nothing else has to
// move. The pivot to very-early-stage makers is why it is false — the picker
// now offers founder and explorer, and an investor is onboarded by hand.
//
// Typed as `boolean` rather than inferred as literal `false`/`true` so both
// branches of every call site keep type-checking whichever way a flag points.
export const FEATURES: {
  companies: boolean;
  funding: boolean;
  meetupsNew: boolean;
  investorSignup: boolean;
} = {
  /** /orgs — the multi-user company directory, B2B connect/chat/deals. */
  companies: false,
  /** /funding — investor connections and funding talks, founder side. */
  funding: false,
  /** "New" chip on the Meetups nav item — a launch marker, not a surface. */
  meetupsNew: true,
  /** The "Investor" option in the signup picker. Existing accounts unaffected. */
  investorSignup: false,
};
