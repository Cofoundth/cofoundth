import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  // When proxy.ts injects a per-request nonce (for the CSP), carry the modified
  // request headers onto every NextResponse so Next sees the nonce and stamps
  // its own <script> tags with it.
  const nextOptions = requestHeaders
    ? { request: { headers: requestHeaders } }
    : { request };
  let response = NextResponse.next(nextOptions);
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next(nextOptions);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          }),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
