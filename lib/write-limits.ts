// What migrations 0083/0084 refuse, as the sentences a member reads.
//
// 0083 caps how often one account writes (forum_posts and forum_comments) and
// raises `rate_limited` (P0001) past the cap. 0084 makes the cap count WRITES,
// in a log members cannot touch, so deleting a post or a comment does not hand
// its slot back. Every window is ROLLING (the last 24 hours, the last hour,
// the last 10 minutes), which is why no sentence below promises a time of day.
// Without this module every writer
// would show its generic "Couldn't post. Try again." — advice that cannot
// work, because trying again is exactly what the limit refuses — or, on the
// one path that returns the database message as-is, the bare word
// "rate_limited".
//
// The NUMBERS are the migration's, written out in each sentence because the
// English string is the translation key (lib/i18n.ts): a sentence built from
// a constant would change its key with the constant and silently lose its
// Thai. Changing a limit means changing the guards' take_write_slot() calls
// (latest definition: 0084), this file and the Thai in lib/translations.json,
// together.
//
// A plain module, not "use server": action files may only export async
// functions, and three of them read these.

/** migration 0083's CHECK on forum_posts.link_url. */
export const MAX_LINK_LENGTH = 2048;

export const LINK_TOO_LONG = "That link is too long.";

/** One sentence per limit in 0083/0084. */
export const RATE_LIMITED = {
  /** 5 products per author in any 24 hours. */
  product: "You can add up to 5 products in 24 hours. Try again later.",
  /** 10 posts or milestones per author in any hour. */
  post: "You can post up to 10 times an hour. Try again a little later.",
  /** 10 comments per author in any 10 minutes. */
  comment: "You’re commenting very fast. Wait a few minutes and try again.",
} as const;

/** Whether a PostgREST error is 0083's per-account limit. */
export function isRateLimited(
  error: { message?: string | null } | null | undefined,
): boolean {
  return error?.message === "rate_limited";
}
