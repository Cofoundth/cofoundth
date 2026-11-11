// The ONE check a "next" destination passes before anything follows it.
//
// `?next=` arrives from the query string, a hidden form field or an OAuth /
// email-confirmation round trip, so it is attacker-controlled every time. A
// redirect that follows it unchecked is an open redirect on our own domain: a
// link that reads "cofoundee.co/login" and drops the visitor on a look-alike
// sign-in page somewhere else.
//
// Every reader goes through safeNextPath() — app/auth/callback/route.ts, the
// sign-in and sign-up actions, onboarding's page and its finish, and
// app/dev/login/route.ts. Writing the parameter is lib/auth-href.ts's job;
// this file only decides whether to follow it. Each reader supplies its own
// fallback, so "anything else" keeps landing exactly where it did before.
//
// No imports and no "use client": server routes, server actions and the
// client signup page all call it.
//
// THE RULES — all of them, on the value as given AND on every percent-decoded
// layer of it, because a browser, a proxy or a second hop may decode before
// it resolves (`/%2F%2Fevil.com` is `//evil.com` one decode later):
//
//   · starts with exactly one "/"  — a path on this origin. "//evil.com" and
//     "/\evil.com" are protocol-relative URLs to another host, and a browser
//     reads "\" as "/".
//   · no "\" anywhere              — the same trick further in.
//   · no ":" anywhere              — no scheme ("javascript:", "https:",
//     "data:"), in any layer. No route in this app has a colon in its path or
//     its query, so refusing every colon costs nothing real and leaves no
//     "is this colon a scheme?" judgement to get wrong.
//   · no control characters        — C0, DEL and C1. The URL parser deletes
//     tab, CR and LF before it resolves, which turns "/\t/evil.com" into
//     "//evil.com".
//   · RESOLVED, it stays home      — the layer is resolved the way a browser
//     resolves it (WHATWG URL, against a sentinel origin), and the result must
//     keep that origin AND have a pathname that does not start with "//" or
//     "/\". The character rules above only see the first two characters, and
//     dot segments are resolved AFTER them: "/..//evil.com", "/.//evil.com",
//     "/a/..//evil.com" and "/%2e%2e//evil.com" all begin with one slash and
//     all resolve to the pathname "//evil.com". Followed as a redirect, a
//     pathname like that is re-read by the client as a protocol-relative URL
//     to evil.com; that was a working open redirect through the sign-in and
//     onboarding actions until this check ran on the resolved form.
//   · at most 2048 characters, and it must stop changing within 4 decodes.
//
// And ONE rule on the value as given only, not on its decoded layers:
//
//   · printable ASCII               — no code unit above 0x7E. A server
//     action's redirect() puts the value in a response header
//     (x-action-redirect), and a header cannot carry it: anything above 0xFF
//     ("/∕∕evil.com", U+2215; a raw Thai "/p/ก") made signInAction and
//     saveOnboardingAction answer 500 and land on the error page, and Latin-1
//     ("/café") went out as mojibake ("/cafÃ©") and landed on a 404. Every
//     link this app writes percent-encodes its path and query, so a raw
//     non-ASCII character only arrives in a hand-made link. The decoded
//     layers are exempt on purpose: "/founders/%E0%B8%A5…" is a real encoded
//     Thai path, and it decodes to Thai.
//
// It returns the value exactly as given, never a "cleaned" version — a
// normaliser is one more parser that can disagree with the browser's. A value
// that only resolves safely after the URL parser has rewritten it is refused,
// not rewritten.

const MAX_LENGTH = 2048;
const MAX_DECODES = 4;
const SENTINEL = "http://next.invalid";

/** `value` if it is a same-origin path that is safe to redirect to, else null. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > MAX_LENGTH) return null;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7e) return null; // the raw value only, see above
  }

  let layer = value;
  for (let i = 0; ; i++) {
    if (!isPlainPath(layer) || !resolvesHome(layer)) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(layer);
    } catch {
      return null; // a malformed escape is not a path we wrote
    }
    if (decoded === layer) break;
    if (i === MAX_DECODES) return null;
    layer = decoded;
  }
  return value;
}

function isPlainPath(s: string): boolean {
  if (s[0] !== "/" || s[1] === "/" || s[1] === "\\") return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c <= 0x1f || (c >= 0x7f && c <= 0x9f)) return false;
    if (c === 0x5c /* \ */ || c === 0x3a /* : */) return false;
  }
  return true;
}

/** Resolved against the sentinel, `s` is still on it, at a path that cannot
 *  be read as protocol-relative. */
function resolvesHome(s: string): boolean {
  let url: URL;
  try {
    url = new URL(s, SENTINEL);
  } catch {
    return false;
  }
  return (
    url.origin === SENTINEL &&
    !url.pathname.startsWith("//") &&
    !url.pathname.startsWith("/\\")
  );
}
