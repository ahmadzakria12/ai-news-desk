import type { NextConfig } from "next";

/** Server-side only on Vercel: your Railway public URL (no trailing slash). Enables same-origin /api proxy. */
const backendProxy =
  (process.env.BACKEND_URL || process.env.RAILWAY_BACKEND_URL || "").trim().replace(/\/$/, "") ||
  "";

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendProxy) return [];
    return [
      { source: "/health", destination: `${backendProxy}/health` },
      { source: "/api/:path*", destination: `${backendProxy}/api/:path*` },
    ];
  },
};

export default nextConfig;
