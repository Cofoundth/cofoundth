import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Avatar uploads run through a Server Action. The framework default is
      // 1MB, which rejects most photos before the action runs (a generic 400:
      // "An unexpected response was received from the server."). Keep this
      // above the 5MB cap enforced in components/avatar-actions.ts so a
      // legitimate 5MB image clears multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  // Baseline security headers (the low-risk, no-breakage set). A strict
  // nonce-based Content-Security-Policy — the real mitigation against
  // script-injection token theft — is a separate, tested rollout (it needs
  // per-request nonces wired through middleware) and is intentionally NOT here.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
