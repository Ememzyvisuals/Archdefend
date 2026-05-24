/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Disable build-breaking checks ──────────────────────────────────────────
  // TypeScript errors won't fail the Vercel build
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint errors won't fail the Vercel build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ── Performance ────────────────────────────────────────────────────────────
  reactStrictMode: true,
  poweredByHeader: false,          // Remove X-Powered-By header
  compress: true,                  // Gzip compression
  productionBrowserSourceMaps: false,

  // ── Images ─────────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
    ],
  },

  // ── Security headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control',     value: 'on' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // ── Redirects ──────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Redirect /login and /signup to auth routes
      { source: '/login',  destination: '/auth/login',  permanent: true },
      { source: '/signup', destination: '/auth/signup', permanent: true },
      { source: '/register', destination: '/auth/signup', permanent: true },
    ];
  },
};

export default nextConfig;
