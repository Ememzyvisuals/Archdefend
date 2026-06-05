import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://archdefend.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ArchDefend – Architecture Intelligence For Real Engineering Teams",
    template: "%s | ArchDefend",
  },
  description:
    "Transform any GitHub repository into a living architecture intelligence platform. Understand, document, monitor, and defend your software architecture with AI.",
  keywords: [
    "architecture intelligence",
    "codebase analysis",
    "software architecture",
    "repository visualization",
    "GitHub architecture mapping",
    "dependency analysis",
    "engineering intelligence",
    "code understanding",
    "technical due diligence",
    "architecture monitoring",
    "AI code analysis",
    "architecture documentation",
  ],
  authors: [{ name: "Ememzyvisuals", url: APP_URL }],
  creator: "Ememzyvisuals",
  publisher: "Ememzyvisuals",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "ArchDefend",
    title: "ArchDefend – Architecture Intelligence For Real Engineering Teams",
    description: "Transform any GitHub repository into a living architecture intelligence platform.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ArchDefend - Architecture Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArchDefend – Architecture Intelligence For Real Engineering Teams",
    description: "Transform any GitHub repository into a living architecture intelligence platform.",
    images: ["/og-image.jpg"],
    creator: "@ememzyvisuals",
    site: "@ememzyvisuals",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ArchDefend",
              description: "Architecture Intelligence For Real Engineering Teams",
              url: APP_URL,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free tier available",
              },
              creator: {
                "@type": "Organization",
                name: "Ememzyvisuals",
                url: APP_URL,
              },
            }),
          }}
        />
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#111111",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  fontSize: "14px",
                },
                success: { iconTheme: { primary: "#10b981", secondary: "#111111" } },
                error: { iconTheme: { primary: "#ef4444", secondary: "#111111" } },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
