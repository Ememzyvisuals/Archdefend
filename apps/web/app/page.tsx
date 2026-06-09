// Server Component — no "use client".
// The (marketing) route group has been removed because it caused
// Vercel CLI to look for page_client-reference-manifest.js at
// .next/server/app/(marketing)/page_client-reference-manifest.js,
// which Next.js never writes there. Root-level server component
// importing a client component generates the manifest at
// .next/server/app/page_client-reference-manifest.js — the right place.
import MarketingContent from "./_marketing-content";

export default function Page() {
  return <MarketingContent />;
}
