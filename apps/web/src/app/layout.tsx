import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

// ── Fonts ────────────────────────────────────────────────────────────────────
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

// ── Site config ───────────────────────────────────────────────────────────────
// Reads from env so it works on Vercel preview URLs and custom domains
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://archdefend.vercel.app';
const SITE_NAME = 'ArchDefend';
const SITE_DESCRIPTION =
  'Paste any GitHub URL. Get dependency graphs, security audits, production readiness scores, and interview-ready documentation in 90 seconds. Free to start.';

// ── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

// ── Metadata (drives all SEO, OG, Twitter previews) ─────────────────────────
export const metadata: Metadata = {
  // ── metadataBase: makes all relative URLs absolute ──────────────────────────
  // This is what generates correct OG image URLs on Vercel preview deployments
  metadataBase: new URL(SITE_URL),

  // ── Titles ──────────────────────────────────────────────────────────────────
  title: {
    default: `${SITE_NAME} — AI Codebase Intelligence`,
    // Each page can set its own title: export const metadata = { title: 'Pricing' }
    // Results in: "Pricing | ArchDefend"
    template: `%s | ${SITE_NAME}`,
  },

  // ── Core meta ───────────────────────────────────────────────────────────────
  description: SITE_DESCRIPTION,
  keywords: [
    'AI code analysis',
    'repository analysis tool',
    'software architecture AI',
    'codebase intelligence',
    'dependency graph generator',
    'AI security audit',
    'code review AI',
    'GitHub repository analyzer',
    'production readiness checker',
    'interview preparation developer',
    'architecture documentation generator',
    'code understanding AI',
    'software architecture visualization',
    'technical debt analyzer',
    'developer tools AI',
  ],

  // ── Canonical & author ───────────────────────────────────────────────────────
  authors: [{ name: 'EMEMZYVISUALS DIGITALS', url: 'https://github.com/ememzyvisuals' }],
  creator: 'EMEMZYVISUALS DIGITALS',
  publisher: 'EMEMZYVISUALS DIGITALS',
  applicationName: SITE_NAME,
  category: 'Developer Tools',
  classification: 'Software, Developer Tools, AI',
  referrer: 'strict-origin-when-cross-origin',

  // ── Open Graph ── controls preview on WhatsApp, LinkedIn, Slack, Discord ───
  // WhatsApp reads: og:title, og:description, og:image
  // Discord reads: og:title, og:description, og:image, og:type
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI Codebase Intelligence`,
    description: SITE_DESCRIPTION,
    images: [
      {
        // This image appears when you paste the link on WhatsApp, Slack, Discord, LinkedIn
        // Place og.png (1200×630) in /public/
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'ArchDefend — AI Codebase Intelligence. Paste a GitHub URL, get architecture maps in 90 seconds.',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter / X card ── controls preview on X (Twitter) ────────────────────
  // summary_large_image = big card with image that shows on X feed
  twitter: {
    card: 'summary_large_image',
    site: '@ememzyvisuals',
    creator: '@ememzyvisuals',
    title: `${SITE_NAME} — AI Codebase Intelligence`,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],  // same 1200×630 image
  },

  // ── Robots ──────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Favicon + icons ─────────────────────────────────────────────────────────
  // These appear in the browser tab, bookmarks, and mobile home screen
  icons: {
    // Standard favicon (32×32 PNG or ICO)
    icon: [
      { url: '/favicon.ico',          sizes: 'any' },
      { url: '/icon-16.png',          sizes: '16x16',  type: 'image/png' },
      { url: '/icon-32.png',          sizes: '32x32',  type: 'image/png' },
      { url: '/icon-192.png',         sizes: '192x192',type: 'image/png' },
    ],
    // Apple touch icon (appears when user saves to iOS home screen)
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    // Other
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#000000' },
    ],
  },

  // ── PWA manifest ────────────────────────────────────────────────────────────
  manifest: '/site.webmanifest',

  // ─── Google Search Console verification ────────────────────────────────────
  // HOW TO ADD YOUR GOOGLE VERIFICATION CODE:
  // 1. Go to https://search.google.com/search-console
  // 2. Add property → URL prefix → https://archdefend.vercel.app
  // 3. Choose "HTML tag" verification method
  // 4. Copy the content value from: <meta name="google-site-verification" content="XXXXX"/>
  // 5. Paste it in NEXT_PUBLIC_GOOGLE_VERIFICATION in your Vercel environment variables
  // 6. OR replace the string below directly:
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || '',
    // yandex: 'your-yandex-verification',  // optional
    // bing: 'your-bing-verification',       // optional
  },

  // ── Alternate languages (for future i18n) ───────────────────────────────────
  alternates: {
    canonical: SITE_URL,
  },
};

// ── JSON-LD Structured Data ──────────────────────────────────────────────────
// This tells Google exactly what ArchDefend is → eligible for rich results
// Test at: https://search.google.com/test/rich-results
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    // SoftwareApplication schema
    {
      '@type': 'SoftwareApplication',
      name: 'ArchDefend',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier with 20 analysis credits',
      },
      featureList: [
        'GitHub repository analysis',
        'Dependency graph visualization',
        'AI security vulnerability detection',
        'Production readiness scoring',
        'PDF and PPTX export',
        'Interview preparation questions',
      ],
      author: {
        '@type': 'Organization',
        name: 'EMEMZYVISUALS DIGITALS',
        url: 'https://github.com/ememzyvisuals',
        sameAs: [
          'https://github.com/ememzyvisuals',
          'https://x.com/ememzyvisuals',
          'https://www.kaggle.com/ememzyvisuals',
        ],
      },
    },
    // WebSite schema → enables Google Sitelinks search box
    {
      '@type': 'WebSite',
      name: 'ArchDefend',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/analyze?repo={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    // Organization schema
    {
      '@type': 'Organization',
      name: 'EMEMZYVISUALS DIGITALS',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-192.png`,
      },
      sameAs: [
        'https://github.com/ememzyvisuals',
        'https://x.com/ememzyvisuals',
        'https://www.kaggle.com/ememzyvisuals',
      ],
    },
    // FAQPage schema → Google may show your FAQ directly in search results
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is ArchDefend?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ArchDefend is an AI-powered codebase intelligence platform. Paste any GitHub repository URL and get dependency graphs, security audits, production readiness scores, and interview-ready documentation in under 90 seconds.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does ArchDefend execute cloned repository code?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Never. ArchDefend performs purely static analysis — reading and parsing source files only. Cloned repositories run in isolated sandboxes with zero execution permissions.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I analyze private GitHub repositories?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Connect your GitHub account via OAuth and ArchDefend can clone private repositories you have access to.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is ArchDefend free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ArchDefend offers a free tier with 20 analysis credits. No credit card required. Credits never expire.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which programming languages does ArchDefend support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ArchDefend currently supports Python, TypeScript, JavaScript, Go, Rust, Java, Kotlin, C#, Ruby, PHP, Swift, Scala, Elixir, and C/C++ — 14 languages via AST grammar parsing.',
          },
        },
      ],
    },
  ],
};

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data — renders server-side, crawlers read it immediately */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* DNS prefetch for performance → faster API calls */}
        
        <link rel="dns-prefetch" href="//github.com"/>
        <link rel="dns-prefetch" href="//fonts.googleapis.com"/>

        {/* Preconnect for critical third parties */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      </head>
      <body
        style={{
          fontFamily: 'var(--font-inter, Inter, -apple-system, BlinkMacSystemFont, sans-serif)',
          background: '#000000',
          color: '#ededed',
          margin: 0,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0a0a0a',
              border: '1px solid #222',
              color: '#ededed',
              fontSize: 13,
            },
          }}
        />
      </body>
    </html>
  );
}
