// Cofoundee's own booking link, used to schedule the in-person contract signing
// once a B2B deal is confirmed. This is a SINGLE link (ours) — companies never
// supply their own. It's a public URL, so it's safe to ship; override it via
// NEXT_PUBLIC_COFOUNDEE_CALENDLY_URL in Vercel env without a code change.
export const COFOUNDEE_CALENDLY_URL =
  process.env.NEXT_PUBLIC_COFOUNDEE_CALENDLY_URL ??
  "https://calendly.com/chayanon-rodw/new-meeting";
