// The three TEST accounts, and the one development-only allowance they get.
//
// test@test.com (founder), test2@test.com (founder) and user@user.com
// (explorer, admin) are real rows in the ONE database the dev server and
// cofoundee.co share. All three are `suspended = true`, so every public author
// gate — the shelf (lib/posts.ts publicProductAuthors), the public pages
// (lib/public-author.ts), a product's member view — hides what they write from
// real visitors. That is correct, and it stays correct in production.
//
// It also hides their PRODUCTS from the developer, which made the deck's review
// modal untestable against a real row: every product it could show was either
// a dev fixture (app/(marketing)/products/fixtures.ts, which cannot be saved)
// or nothing. So, in DEVELOPMENT ONLY, four surfaces additionally accept
// a PRODUCT (kind 'show_and_tell') whose author is one of these accounts:
//
//   · the shelf and the deck      getPublicProductsPage (lib/posts.ts)
//   · /products/<id>, signed out  getPublicPost (lib/public-post.ts)
//   · /products/<id>, signed in   its member gate (app/(marketing)/products/[id])
//   · the monthly draw            lib/draw-data.ts: a comment on such a product
//                                 counts toward a streak, and the product counts
//                                 on the "products you can comment on" check —
//                                 so /rewards can be tried end to end with real
//                                 rows (added 2026-11-18). The test accounts
//                                 themselves are still never IN a draw: they are
//                                 suspended, and outOfTheDraw() drops them.
//
// NOTHING ELSE WIDENS: not the sitemap, not the landing's "Happening now", not
// the community feed or search, not posts or milestones, not comments, not a
// hidden row. And in a production build there is nothing to widen:
// TEST_ACCOUNT_EMAILS is the empty array there, because NODE_ENV is inlined at
// build time and the literal below sits inside the dead arm of the ternary, and
// devTestAuthorIds() returns before it reads anything.
//
// Matched on profiles.email, which migration 0005 keeps in sync with
// auth.users.email by trigger. Server-only: it reads through the service role.

import { createAdminClient } from "@/lib/supabase/admin";

/** The test accounts, by sign-in email. Empty in a production build. */
export const TEST_ACCOUNT_EMAILS: readonly string[] =
  process.env.NODE_ENV !== "production"
    ? ["test@test.com", "test2@test.com", "user@user.com"]
    : [];

/**
 * Of `authorIds`, the ones that are test accounts. Always the empty Set in a
 * production build, without a query.
 *
 * FAILS CLOSED like the gates it extends: a failed read accepts nobody, so the
 * worst a broken query can do is put development back where it was.
 */
export async function devTestAuthorIds(
  authorIds: readonly string[],
): Promise<Set<string>> {
  if (process.env.NODE_ENV === "production") return new Set();
  if (!authorIds.length || !TEST_ACCOUNT_EMAILS.length) return new Set();
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id")
    .in("id", [...authorIds])
    .in("email", [...TEST_ACCOUNT_EMAILS]);
  if (error) {
    console.error("[test-accounts] lookup failed", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.id as string));
}
