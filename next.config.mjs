/** @type {import('next').NextConfig} */
// One id per build. Baked into the client bundle and served by /api/version so open tabs can detect a new deploy.
const BUILD_ID = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT || String(Date.now());
const nextConfig = {
  generateBuildId: async () => BUILD_ID,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ["images.unsplash.com", "via.placeholder.com"],
  },
  async headers() {
    return [
      {
        // Pages and API: always revalidate so a new deploy is picked up on the next load (no hard refresh needed).
        // Hashed JS/CSS under /_next/static keep their immutable caching (new build = new filenames).
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }]
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
