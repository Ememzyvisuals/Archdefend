"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  Github, Shield, GitBranch, Cpu, BarChart3, FileText,
  Search, Lock, ArrowRight, Menu, X, Check, ChevronDown, Star
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuthStore } from "@/store/auth";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.14em] uppercase"
      style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)" }}>
      {children}
    </span>
  );
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className={className}>
      {children}
    </motion.div>
  );
}

// Problem cards like screenshots
const PROBLEMS = [
  {
    icon: "⏰",
    num: "01",
    title: "Architecture is invisible",
    desc: "New engineers waste weeks trying to understand how systems connect. No map, no guide, no answer.",
  },
  {
    icon: "📋",
    num: "02",
    title: "Documentation rots immediately",
    desc: "Every architecture doc becomes stale the moment code changes. Manual updates never keep pace.",
  },
  {
    icon: "🔍",
    num: "03",
    title: "Tech interviews expose blind spots",
    desc: "Defending your own architecture becomes impossible without a living source of truth.",
  },
  {
    icon: "📊",
    num: "04",
    title: "Security risks hide in plain sight",
    desc: "Dependency vulnerabilities, circular dependencies, and secrets slip through without detection.",
  },
];

// How it works steps
const HOW_STEPS = [
  {
    num: "01",
    icon: <Github size={20} />,
    title: "Connect your repository",
    desc: "Link your GitHub account and select any repository. ArchDefend clones and analyzes it automatically.",
  },
  {
    num: "02",
    icon: <Cpu size={20} />,
    title: "AI maps your architecture",
    desc: "Tree-sitter parses your codebase. NetworkX builds the dependency graph. AI explains what it means.",
  },
  {
    num: "03",
    icon: <FileText size={20} />,
    title: "Get actionable intelligence",
    desc: "Architecture maps, security scans, onboarding guides, and interview defense docs — all generated.",
  },
  {
    num: "04",
    icon: <Shield size={20} />,
    title: "Monitor and defend",
    desc: "Drift detection tracks changes over time. Security center alerts you to new risks. Stay protected.",
  },
];

// Features
const FEATURES = [
  {
    icon: <GitBranch size={18} />,
    title: "Multi-language parsing",
    desc: "Python, TypeScript, Rust, Go, Java, and more — analyzed with tree-sitter accuracy.",
  },
  {
    icon: <Search size={18} />,
    title: "Interactive architecture map",
    desc: "React Flow powered graph you can zoom, pan, filter, and explore. Every node tells a story.",
  },
  {
    icon: <FileText size={18} />,
    title: "7 report types",
    desc: "Architecture overview, onboarding guide, interview defense, security audit, tech debt analysis.",
  },
  {
    icon: <Shield size={18} />,
    title: "Security center",
    desc: "Detect secrets, circular deps, vulnerable patterns, and architecture smells automatically.",
  },
  {
    icon: <BarChart3 size={18} />,
    title: "Drift detection",
    desc: "Compare analyses over time. Know exactly what changed, when, and what the risk is.",
  },
  {
    icon: <Lock size={18} />,
    title: "RBAC workspaces",
    desc: "Invite your team. Owner, admin, member, viewer roles with granular permissions.",
  },
];

// Autopilot loop
const AUTOPILOT_STEPS = [
  { num: "1", icon: <Github size={16} />, title: "Connect repository", desc: "Link your GitHub repo in one click." },
  { num: "2", icon: <Cpu size={16} />, title: "AI analysis runs", desc: "ArchDefend maps your entire codebase." },
  { num: "3", icon: <FileText size={16} />, title: "Reports generated", desc: "Architecture docs created automatically." },
  { num: "4", icon: <Shield size={16} />, title: "Security monitored", desc: "Risks detected and tracked continuously." },
  { num: "5", icon: <BarChart3 size={16} />, title: "Team aligned", desc: "Everyone understands the architecture." },
];

// Pricing plans
const PLANS = [
  {
    id: "starter",
    icon: <GitBranch size={20} />,
    name: "Starter",
    desc: "Perfect for solo engineers and small projects.",
    price: 19,
    features: ["3 repositories", "30 analyses/month", "All report types", "GitHub integration", "Security scanning", "PDF & Markdown export"],
  },
  {
    id: "pro",
    icon: <Star size={20} />,
    name: "Pro",
    desc: "For growing teams who need real architecture intelligence.",
    price: 49,
    popular: true,
    features: ["20 repositories", "200 analyses/month", "All report types", "Team workspaces (5 members)", "Priority AI processing", "PPTX export", "Drift detection", "Priority support"],
  },
  {
    id: "enterprise",
    icon: <Shield size={20} />,
    name: "Enterprise",
    desc: "For large engineering teams with no limits.",
    price: 149,
    features: ["Unlimited repositories", "Unlimited analyses", "Unlimited team members", "RBAC permissions", "Custom AI prompts", "SSO (coming soon)", "SLA support", "Dedicated onboarding"],
  },
];

// FAQ
const FAQS = [
  { q: "How does ArchDefend analyze my code?", a: "We clone your repository server-side using your GitHub access token, parse it with tree-sitter for accurate symbol extraction, build a dependency graph with NetworkX, then use AI (Groq/OpenRouter) to generate intelligence. Your code is never stored permanently." },
  { q: "Which programming languages are supported?", a: "Python, JavaScript, TypeScript, Rust, Go, Java, Ruby, PHP, C#, C++, Swift, and Kotlin. We're adding more languages every month." },
  { q: "Can I use ArchDefend without GitHub?", a: "You can sign in with Google and explore the platform, but repository analysis requires GitHub connection to clone and analyze your code." },
  { q: "Can I change or cancel my plan anytime?", a: "Yes. You can upgrade, downgrade, or cancel at any time. Plans are billed monthly via NOWPayments crypto." },
  { q: "How is my data handled?", a: "Repository clones are deleted immediately after analysis. We store only extracted symbols, graph data, and AI-generated reports. We never sell your data." },
  { q: "How is ArchDefend different from other tools?", a: "We combine static analysis (tree-sitter), graph intelligence (NetworkX), and AI (Groq) into one platform with React Flow visualization. No other tool gives you onboarding guides, interview defense docs, and drift detection in one place." },
];

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isAuthenticated } = useAuthStore();

  const handleCTA = () => {
    if (isAuthenticated) {
      window.location.href = "/dashboard";
    } else {
      setAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
        <Logo size={28} />
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white/50 hover:text-white transition-colors">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-30 p-4 space-y-2"
          style={{ background: "#0f0f0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["#features", "#how-it-works", "#pricing", "#faq"].map((href) => (
            <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/06 transition-all capitalize">
              {href.replace("#", "").replace("-", " ")}
            </a>
          ))}
          <button onClick={handleCTA}
            className="w-full mt-2 btn-primary justify-center rounded-xl">
            Get started for free →
          </button>
        </motion.div>
      )}

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 text-center grid-bg">
        <div className="absolute inset-0 hero-gradient pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 65%)"
        }} />

        <AnimatedSection>
          <motion.div variants={fadeUp}>
            <SectionBadge>ARCHITECTURE INTELLIGENCE</SectionBadge>
          </motion.div>

          <motion.h1 variants={fadeUp} className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight">
            You ship.<br />
            <span className="text-white">We map the architecture.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-5 text-base text-white/45 max-w-sm mx-auto leading-relaxed">
            Transform any GitHub repository into a living architecture intelligence platform.
            Understand, document, and defend your codebase with AI.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3">
            <button onClick={handleCTA} className="btn-primary w-full max-w-xs justify-center text-base py-4 rounded-2xl">
              Get started for free →
            </button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-secondary w-full max-w-xs justify-center text-base py-4 rounded-2xl">
              ▶ See how it works
            </button>
          </motion.div>
        </AnimatedSection>

        {/* Feature pills */}
        <AnimatedSection className="mt-12">
          <div className="space-y-4">
            {[
              { icon: <GitBranch size={16} />, title: "Ship more, understand more", desc: "No more mystery code. ArchDefend maps every module, class, function, and API in your repo." },
              { icon: <Star size={16} />, title: "Your codebase becomes intelligence", desc: "We turn raw code into architecture maps, security reports, and onboarding guides." },
              { icon: <Shield size={16} />, title: "Build confidently. Grow securely.", desc: "Consistent architecture awareness builds better software and stronger engineering culture." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-start gap-4 text-left px-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-white/60">{item.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Problem ───────────────────────────────────────────────────────── */}
      <section className="px-5 py-20">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-10">
            <SectionBadge>THE PROBLEM</SectionBadge>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              Understanding code<br />is hard enough.
            </h2>
            <p className="mt-3 text-sm text-white/40">Most engineering teams have no living map of their architecture.</p>
          </motion.div>

          <div className="space-y-4">
            {PROBLEMS.map((p, i) => (
              <motion.div key={i} variants={fadeUp}
                className="arch-card p-0 overflow-hidden">
                <div className="h-28 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-4xl opacity-20">{p.icon}</span>
                </div>
                <div className="p-5 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-white">{p.title}</h3>
                    <span className="text-xs text-white/20 font-mono">{p.num}</span>
                  </div>
                  <div className="h-px bg-white/08 my-2" />
                  <p className="text-xs text-white/40 leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-10 text-center">
            <p className="text-sm text-white/30">That's where we come in</p>
            <ChevronDown className="mx-auto mt-2 text-white/20" size={20} />
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Solution ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-16" id="features">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-10">
            <SectionBadge>THE SOLUTION</SectionBadge>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              Architecture intelligence<br />for real teams.
            </h2>
            <p className="mt-3 text-sm text-white/40 max-w-xs mx-auto">
              ArchDefend fits your workflow so your team stays aligned and your architecture stays understood.
            </p>
          </motion.div>

          {/* Feature grid 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sounds like your code", desc: "Analysis that reflects your actual architecture, not generic patterns." },
              { label: "Ready in minutes", desc: "Connect GitHub, analyze, get reports. Under 5 minutes to first insight." },
              { label: "Stay aligned", desc: "Every engineer sees the same architecture map. No more knowledge silos." },
              { label: "Multi-project", desc: "Manage multiple repositories. One workspace. Full visibility." },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} className="arch-card p-4">
                <p className="text-xs font-semibold text-white mb-1">{f.label}</p>
                <p className="text-[11px] text-white/35 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Full feature list */}
          <div className="mt-6 space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <span className="text-brand-400">{f.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────────── */}
      <section className="px-5 py-16" id="how-it-works">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-10">
            <SectionBadge>HOW IT WORKS</SectionBadge>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              Simple setup.<br />Powerful impact.
            </h2>
            <p className="mt-3 text-sm text-white/40">Up and running in under a minute.</p>
          </motion.div>

          <div className="space-y-3">
            {HOW_STEPS.map((step, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="flex items-start gap-4 p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white/60">{step.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/25">{step.num}</span>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                    </div>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < HOW_STEPS.length - 1 && <div className="w-px h-4 bg-white/08 ml-9" />}
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Autopilot loop ────────────────────────────────────────────────── */}
      <section className="px-5 py-16">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-10">
            <SectionBadge>ALWAYS ON</SectionBadge>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              It monitors itself.<br />On autopilot.
            </h2>
            <p className="mt-3 text-sm text-white/40">
              Every commit triggers a fresh analysis. Architecture intelligence always up to date.
            </p>
          </motion.div>

          <div className="space-y-2">
            {AUTOPILOT_STEPS.map((step, i) => (
              <motion.div key={i} variants={fadeUp}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <span className="text-brand-400">{step.icon}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{step.num}. {step.title}</p>
                  <p className="text-[11px] text-white/40">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp}
            className="mt-6 flex items-center gap-2 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="glow-dot" />
            <p className="text-sm text-white/70">Your architecture intelligence updates automatically.</p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Pricing ───────────────────────────────────────────────────────── */}
      <section className="px-5 py-16" id="pricing">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-10">
            <SectionBadge>PRICING</SectionBadge>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              Simple pricing.<br />Built for engineers.
            </h2>
            <p className="mt-3 text-sm text-white/40">Choose the plan that fits your team.</p>
          </motion.div>

          <div className="space-y-4">
            {PLANS.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} className="relative">
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                      <Star size={10} /> MOST POPULAR
                    </span>
                  </div>
                )}
                <div className={`arch-card p-6 ${plan.popular ? "border-brand-500/30" : ""}`}
                  style={plan.popular ? { borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.04)" } : {}}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white/70">{plan.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-white/40 mt-1">{plan.desc}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-sm text-white/40 mb-1">/mo</span>
                  </div>
                  <button onClick={handleCTA}
                    className={`w-full mt-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                      plan.popular
                        ? "bg-white text-black hover:bg-white/92"
                        : "bg-white/05 text-white border border-white/10 hover:bg-white/08"
                    }`}>
                    Try for free
                  </button>
                  <div className="mt-5 pt-5 space-y-2.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {plan.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2.5">
                        <Check size={14} className="text-white/30 flex-shrink-0" />
                        <span className="text-xs text-white/60">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="px-5 py-16" id="faq">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={fadeUp}
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                  <div className="w-6 h-6 rounded-full border border-white/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-white/50 text-sm leading-none">{openFaq === i ? "−" : "+"}</span>
                  </div>
                </button>
                {openFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}>
                    <p className="px-5 pb-4 text-xs text-white/45 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-20 text-center">
        <AnimatedSection>
          <motion.div variants={fadeUp}>
            <SectionBadge>GET STARTED</SectionBadge>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              Start understanding<br />your architecture today.
            </h2>
            <p className="mt-3 text-sm text-white/40">
              Connect your GitHub repository. Let ArchDefend reveal what's really there.
            </p>
            <button onClick={handleCTA}
              className="mt-8 btn-primary justify-center text-base py-4 px-8 rounded-2xl">
              Get started for free →
            </button>
            <p className="mt-3 text-xs text-white/25">Cancel anytime</p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-5 py-10" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mb-8">
          <Logo size={24} />
          <p className="mt-3 text-xs text-white/35 max-w-xs leading-relaxed">
            Architecture Intelligence For Real Engineering Teams.
          </p>
          <div className="flex gap-2 mt-4">
            <a href="https://github.com/ememzyvisuals" target="_blank" rel="noopener"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Github size={14} className="text-white/50" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-white/50 tracking-widest uppercase mb-3">PRODUCT</p>
            <div className="space-y-2">
              {[["#how-it-works", "How it works"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
                <a key={href} href={href} className="block text-sm text-white/35 hover:text-white/70 transition-colors">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 tracking-widest uppercase mb-3">LEGAL</p>
            <div className="space-y-2">
              {[["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"]].map(([href, label]) => (
                <a key={href} href={href} className="block text-sm text-white/35 hover:text-white/70 transition-colors">{label}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
          <p className="text-xs text-white/20">© Ememzyvisuals. All rights reserved.</p>
          <p className="text-xs text-white/20">Built by Ememzyvisuals</p>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
