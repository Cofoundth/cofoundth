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
};

export default nextConfig;
