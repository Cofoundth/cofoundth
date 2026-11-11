// Suspense fallback for / alone: a blank block one viewport tall, and nothing
// drawn in it.
//
// / is two different pages depending on a read that has not finished when this
// renders: the maker shelf or the pitch landing (see ./page.tsx). Any skeleton
// drawn here is a guess about which one is coming, so a hero skeleton flashes
// before the deck on one arm and the deck's skeleton (../products/loading.tsx)
// before a hero on the other. Drawing nothing is the one face that is right on
// both, and the pitch arm is what production serves until the shelf reaches
// FRONT_DOOR_MIN_PRODUCTS.
//
// Drawing nothing is not the same as taking no room. This used to return null,
// on the theory that <main className="flex-1"> would hold the footer at the
// bottom meanwhile. It did not: the footer painted INSIDE the first viewport and
// then jumped when the page arrived. Measured as layout-shift entries on fresh
// loads, hadRecentInput false: the shelf arm 0.148 at 1280x800 (footer 427 ->
// 765, and the centred container 80 -> 73 as the scrollbar appeared) and 0.741
// at 375x812 (65 -> 719; the footer is 788px tall, so flex-1 had nothing left to
// give); the pitch arm 0.555 and 0.92. A block of `min-h-lvh` puts the footer
// below the first viewport, where its move is not seen, and makes the page
// scroll from the first paint, so the scrollbar no longer arrives late. `lvh`
// rather than `svh`: on a phone whose URL bar has already collapsed, the
// visible height is the LARGE viewport. Measured the same way with it: the pitch
// arm records no shift; the shelf arm 0.004 and 0.022, which is the footer
// rising into view from below the fold, because the shelf is shorter than a
// viewport. That remainder is the price of not guessing the arm.
//
// It has to exist rather than be left out: a route group's loading.tsx wraps
// every nested segment that lacks its own, so without this file / would inherit
// the hero skeleton in app/(marketing)/loading.tsx. That is also why ./page.tsx
// sits in a route group: loading.tsx scopes to a folder, and this must not apply
// to the other marketing routes.
//
// aria-hidden and empty: nothing to read, nothing to translate.
export default function Loading() {
  return <div aria-hidden="true" className="min-h-lvh" />;
}
