// Whose name and photo may be attached to a post on a PUBLIC page.
//
// One predicate, because three public surfaces ask the same question about a
// post's author and must not answer it three ways:
//
//   · /p/<id>                — the post's own author, and every commenter in
//                              its preview (app/(marketing)/p/[id]/page.tsx)
//   · the landing's "Happening now" — the milestone authors it credits by name
//                              (app/(marketing)/(home)/PitchLanding.tsx)
//
// It lived inside the /p/<id> page until the landing needed it too; a second
// hand-written copy would have been the drift this module exists to stop.
//
// WHAT IT CHECKS, and what dropping each one costs:
//   · not `suspended`, not `is_bot` — a moderated member's post stays public
//     with their name and photo attached, and a seeded bot profile's would
//     too. Same flags lib/public-profile.ts uses.
//   · `account_type` in PUBLIC_AUTHOR_ROLES — an allowlist, so `investor` is
//     out. See below.
//   · NOT `profile_complete`. That one IS purely the directory allowlist
//     (public-profile.ts rule 5): a post is not a directory entry, it is
//     something that exists, written by whoever wrote it, and an unfinished
//     profile is no reason to 404 their own permalink.
//
// The shelf (lib/posts.ts publicProductAuthors) answers a NARROWER question —
// founders only, because a product is maker signal — and says why there.

/**
 * Roles whose NAME AND PHOTO may be attached to a publicly readable post.
 *
 * An ALLOWLIST, not `account_type !== "investor"`: a role added later is
 * excluded until somebody decides otherwise, which is the same fail-closed
 * posture as /p/<id>'s getPublicPost() and lib/public-profile.ts.
 *
 * `investor` is the one exclusion and it is not a style preference.
 * lib/public-profile.ts rule 5 states it outright — "an INVESTOR's presence on
 * the platform is confidential" — and these pages publish a name, a photo and
 * (on /p/<id>) an og:image card to anonymous traffic. Not a live leak when this
 * landed (6 investor rows, 0 of them authoring a publicly readable post) — it
 * is a latent one, closed before the traffic arrives rather than after.
 *
 * `explorer` IS allowed, and that is the half of rule 5 that does NOT transfer.
 * It keeps explorers out of the DIRECTORY because an explorer is not a
 * directory entry, not because their presence is secret. A post is something
 * they wrote and can already share; 404ing their own permalink would be a
 * different bug.
 */
export const PUBLIC_AUTHOR_ROLES = ["founder", "explorer"] as const;

/** Whether this author may be credited on a public page. SELECT ALL THREE of
 *  `suspended`, `is_bot` and `account_type`: a missing `account_type` fails,
 *  but a missing `suspended` or `is_bot` reads as "not set" and passes, so a
 *  flag left out of the select is a hole, not a refusal. */
export function isPubliclyAttributable(a: {
  suspended?: unknown;
  is_bot?: unknown;
  account_type?: unknown;
}): boolean {
  return (
    a.suspended !== true &&
    a.is_bot !== true &&
    (PUBLIC_AUTHOR_ROLES as readonly string[]).includes(
      a.account_type as string,
    )
  );
}
