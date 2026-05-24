import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://archdefend.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/auth/login', '/auth/signup'],
        disallow: ['/dashboard', '/api/', '/auth/callback', '/billing/'],
      },
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Twitterbot', allow: '/' },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
