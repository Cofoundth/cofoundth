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
// `meetupsNew` and `productsNew` are the odd ones out: MARKERS, not surfaces.
// `companies` and `funding` decide whether a nav item exists at all; these only
// decorate an item that is already there with a "New" chip. Nothing is hidden
// when one is false — the link renders either way. Set each false once its
// surface has stopped being news (a few weeks after launch); a permanent "New"
// badge is just noise that teaches people to ignore the chip. Products lost its
// marker on 2026-11-12 (the deck became the page every member lands on, and a
// chip on your own landing is that noise) and got it back on 2026-11-19, the
// founder's call, for the relaunched shelf (the deck, Games/Apps, the product
// page): turn it off when that stops being news.
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
  productsNew: boolean;
  productDeckActions: boolean;
  guestProductLegalLinks: boolean;
  investorSignup: boolean;
} = {
  /** /orgs — the multi-user company directory, B2B connect/chat/deals. */
  companies: false,
  /** /funding — investor connections and funding talks, founder side. */
  funding: false,
  /** "New" chip on the Meetups nav item — a launch marker, not a surface. */
  meetupsNew: true,
  /** "New" chip on the Products nav item, every rail — a marker, not a surface. */
  productsNew: true,
  /** Visible Skip and Try controls on the swipe deck. */
  productDeckActions: false,
  /** Legal links under the public product shelf. */
  guestProductLegalLinks: false,
  /** The "Investor" option in the signup picker. Existing accounts unaffected. */
  investorSignup: false,
};
