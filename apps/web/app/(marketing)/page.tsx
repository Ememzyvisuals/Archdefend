// Server Component wrapper — intentionally no "use client" directive.
//
// WHY THIS EXISTS:
// Vercel CLI expects `page_client-reference-manifest.js` to exist inside
// `.next/server/app/(marketing)/` for every page in a route group.
// Next.js only generates that manifest when a SERVER component imports a
// CLIENT component — it records the client-component references so the
// server renderer can hand them off correctly.
//
// Previously, `page.tsx` itself was `"use client"` (the entire file was a
// client component). That means there is no server→client boundary inside
// this route, so Next.js never writes the manifest file. Then Vercel CLI
// tries to `lstat` it, finds nothing, and crashes the deployment.
//
// The fix: keep this file as a plain server component. All the interactive
// client logic lives in `_marketing-content.tsx` (prefixed with _ so
// Next.js does not treat it as a route). Importing it here creates the
// server→client boundary that triggers manifest generation.

import MarketingContent from "./_marketing-content";

export default function MarketingPage() {
  return <MarketingContent />;
}
