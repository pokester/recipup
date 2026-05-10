import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
<<<<<<< ours
<<<<<<< ours
        source: "/logo-v2.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
=======
=======
>>>>>>> theirs
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Cache static assets aggressively.
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
          },
        ],
      },
    ];
  },
<<<<<<< ours
<<<<<<< ours
=======
  experimental: {
    optimizePackageImports: ["recharts"],
  },
>>>>>>> theirs
=======
  experimental: {
    optimizePackageImports: ["recharts"],
  },
>>>>>>> theirs
};

export default nextConfig;
