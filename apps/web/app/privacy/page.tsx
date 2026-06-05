import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Privacy Policy | ArchDefend",
  description: "ArchDefend Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/"><Logo size={26} /></Link>
        <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: June 2025</p>

        {[
          {
            title: "1. What We Collect",
            body: `When you sign in with GitHub or Google, we receive your name, email address, and avatar. If you use GitHub, we also receive a temporary access token to clone and analyze repositories you explicitly connect. We collect usage data such as analyses run, reports generated, and feature interactions to improve the product.`
          },
          {
            title: "2. How We Use Your Data",
            body: `We use your GitHub access token solely to clone repositories you connect to ArchDefend. Repository clones are immediately deleted from our servers after analysis completes — we never store your raw source code. We use your email to send transactional notifications (analysis complete, security findings) and never for marketing without consent.`
          },
          {
            title: "3. What We Store",
            body: `We store: extracted architecture metadata (symbol names, file paths, dependency edges), AI-generated reports and summaries, security finding descriptions, and your account information. We do not store raw source code, credentials from your code, or any file contents.`
          },
          {
            title: "4. Third-Party Services",
            body: `We use Supabase (database hosting, EU-West region), Upstash Redis (caching), Groq and OpenRouter (AI processing — code summaries only, not raw code), and NOWPayments (crypto payment processing). Each provider has their own privacy policy.`
          },
          {
            title: "5. Data Retention",
            body: `Your account data is retained until you delete your account. Analysis metadata and reports are retained until you disconnect a repository or delete your account. Repository clones are deleted immediately after analysis — typically within minutes.`
          },
          {
            title: "6. Your Rights",
            body: `You can delete your account at any time from Settings → Danger Zone. Upon deletion, all your workspaces, repositories, analyses, and reports are permanently removed within 30 days. You can export your reports at any time in PDF or Markdown format before deletion.`
          },
          {
            title: "7. Security",
            body: `All data is encrypted in transit (TLS 1.3) and at rest. We use bcrypt for password hashing, JWT with short expiry for session tokens, and webhook signature verification for all GitHub and payment callbacks. We conduct regular dependency audits.`
          },
          {
            title: "8. Contact",
            body: `For privacy concerns or data deletion requests, contact us at: support@archdefend.app`
          },
        ].map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-base font-bold text-white mb-2">{section.title}</h2>
            <p className="text-sm text-white/45 leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>

      <footer className="text-center py-8 text-xs text-white/20"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        © Ememzyvisuals · Built by Ememzyvisuals
      </footer>
    </div>
  );
}
