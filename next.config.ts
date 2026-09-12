import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      // ── Backend API proxy ────────────────────────────────────────────
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:4000"}/api/:path*`,
      },
      {
        source: "/healthz",
        destination: `${process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:4000"}/healthz`,
      },
      {
        source: "/readyz",
        destination: `${process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:4000"}/readyz`,
      },

      // ── Frontend dashboard rewrites ──────────────────────────────────
      // The root Next.js app picks up src/app/frontend/src/app/** as
      // /frontend/src/app/**  — rewrite the clean URLs to the actual paths.
      {
        source: "/dashboard",
        destination: "/frontend/src/app/dashboard",
      },
      {
        source: "/dashboard/:path*",
        destination: "/frontend/src/app/dashboard/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // / → /dashboard (the main entry point)
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};
export default config;
