// Suspense fallback for /: the deck's own skeleton, because / is the maker
// shelf (./page.tsx), the same one /products shows. Re-exported from that
// route's file rather than copied, so the two cannot drift.
//
// It has to exist rather than be left out: a route group's loading.tsx wraps
// every nested segment that lacks its own, so without this file / would
// inherit the hero skeleton in app/(marketing)/loading.tsx. That is also why
// ./page.tsx sits in a route group: loading.tsx scopes to a folder, and this
// must not apply to the other marketing routes.
export { default } from "../products/loading";
