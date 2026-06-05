import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Terms of Service | ArchDefend",
  description: "ArchDefend Terms of Service.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/"><Logo size={26} /></Link>
        <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: June 2025</p>

        {[
          {
            title: "1. Acceptance",
            body: `By using ArchDefend ("the Service"), you agree to these Terms. If you do not agree, do not use the Service. These Terms apply to all users including free and paid plan subscribers.`
          },
          {
            title: "2. Description of Service",
            body: `ArchDefend is a software architecture intelligence platform that analyzes GitHub repositories using static analysis and AI to generate architecture maps, reports, and security findings. The Service is provided by Ememzyvisuals.`
          },
          {
            title: "3. Your Account",
            body: `You must provide accurate account information. You are responsible for maintaining the security of your account credentials and for all activity under your account. You must not share accounts or credentials with others.`
          },
          {
            title: "4. Acceptable Use",
            body: `You may only analyze repositories you own or have explicit permission to analyze. You must not use the Service to analyze repositories containing illegal content, to attempt to extract other users' data, to reverse-engineer the Service, or to circumvent usage limits. Abuse will result in immediate account termination.`
          },
          {
            title: "5. GitHub Access",
            body: `When you connect GitHub, you grant ArchDefend a temporary, revocable token to read repository contents for analysis. We only access repositories you explicitly connect. You can revoke access at any time from your GitHub settings (Settings → Applications → Authorized OAuth Apps).`
          },
          {
            title: "6. Payments and Subscriptions",
            body: `Paid plans are billed monthly via NOWPayments in cryptocurrency. Payments are non-refundable except where required by law. Plans auto-expire after one billing period unless renewed. Ememzyvisuals reserves the right to change pricing with 30 days notice.`
          },
          {
            title: "7. Service Availability",
            body: `ArchDefend is provided on a best-effort basis. We do not guarantee 100% uptime, especially on free tier infrastructure. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.`
          },
          {
            title: "8. Intellectual Property",
            body: `The ArchDefend platform, code, design, and brand are owned by Ememzyvisuals. AI-generated reports produced from your repositories are owned by you. You retain all rights to your source code — we never claim ownership of anything from your repositories.`
          },
          {
            title: "9. Limitation of Liability",
            body: `ArchDefend is provided "as is" without warranties. Ememzyvisuals is not liable for any indirect, incidental, or consequential damages arising from use of the Service, including but not limited to data loss, revenue loss, or security incidents in your codebase.`
          },
          {
            title: "10. Contact",
            body: `Questions about these Terms: support@archdefend.app`
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
