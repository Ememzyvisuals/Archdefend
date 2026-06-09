/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE: output:"standalone" removed — it's for Docker/self-hosted only.
  // On Vercel it triggers a file-trace copy of (marketing)/page_client-reference-manifest.js
  // which Next.js 15.5 doesn't generate for route groups → ENOENT → build fails.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/login",  destination: "/", permanent: false },
      { source: "/signup", destination: "/", permanent: false },
    ];
  },
};

module.exports = nextConfig;
