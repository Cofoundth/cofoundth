import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Ship the CSP in report-only mode first to verify the policy + nonce
// propagation against real prod without risking a blank app, then flip to
// enforcing once the console is clean.
const CSP_REPORT_ONLY = false;

// Build a strict, nonce-based Content-Security-Policy. This is the defense that
// actually stops XSS (the precondition for token theft etc.) rather than just
// limiting its blast radius.
function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");
  const dev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    // Next's bootstrap <script> gets the nonce; 'strict-dynamic' lets it load
    // the rest of the chunks. 'unsafe-eval' only in dev (HMR / react-refresh).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Tailwind + Next inject inline style attributes that can't carry a nonce.
    // Style injection isn't a script-execution vector, so 'unsafe-inline' is OK.
    `style-src 'self' 'unsafe-inline'`,
    // Avatars / post images come from Supabase Storage, Google, LinkedIn, etc.
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // Server actions post to 'self'; the browser Supabase client (OAuth) talks
    // to the project's REST + realtime endpoints.
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ]
    .filter(Boolean)
    .join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Next reads the nonce from the request's CSP header and applies it to its
  // own scripts; x-nonce lets RSC read it via headers() if ever needed.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  let response: NextResponse;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = await updateSession(request, requestHeaders);
  }

  response.headers.set(
    CSP_REPORT_ONLY
      ? "content-security-policy-report-only"
      : "content-security-policy",
    csp,
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
