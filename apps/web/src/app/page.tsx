'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, ArrowRight, Github, CheckCircle,
  Network, Lock, Eye, Code2, BarChart3, Download,
  GitBranch, AlertTriangle, Zap, Terminal,
} from 'lucide-react';

const NAV_LINKS = ['Features', 'Pricing', 'Docs'];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 56, display: 'flex', alignItems: 'center',
      background: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      transition: 'all .2s',
    }}>
      <div className="container-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={14} color="#fff" strokeWidth={2.5}/>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--fg)', letterSpacing: '-0.02em' }}>ArchDefend</span>
          <span className="badge badge-accent" style={{ fontSize: 9 }}>Beta</span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              style={{ fontSize: 13, color: 'var(--fg-2)', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-2)')}>
              {l}
            </a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="/auth/login" className="btn btn-ghost btn-sm">Log in</a>
          <a href="/auth/signup" className="btn btn-primary btn-sm">Start free <ArrowRight size={11}/></a>
        </div>
      </div>
    </header>
  );
}

const TICKER_ITEMS = [
  'OWASP Top 10 Detection', 'Dependency Graph Analysis', 'AI Architecture Review',
  'Security Scoring', 'API Inventory Mapping', 'Production Readiness', 'Interview Q&A Generation',
];

function Ticker() {
  return (
    <div style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '10px 0', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 48, animation: 'ticker 30s linear infinite', width: 'max-content' }}>
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--accent)', fontSize: 14 }}>—</span>{t}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

const FEATURES = [
  { icon: Network, title: 'Architecture Mapping', desc: 'Auto-generates dependency graphs and service topology from your codebase. Visual and exportable.' },
  { icon: Lock, title: 'Security Intelligence', desc: 'OWASP Top 10, STRIDE threat modeling, CVE scanning. Real findings, not guesses.' },
  { icon: Code2, title: 'Code Audit', desc: 'Line-level analysis across 40+ languages. Finds vulnerabilities before your users do.' },
  { icon: BarChart3, title: 'Production Readiness', desc: 'Scores your repo on observability, error handling, scalability, and CI/CD maturity.' },
  { icon: Eye, title: 'API Inventory', desc: 'Complete map of every endpoint, auth method, and data exposure point in your system.' },
  { icon: Download, title: 'Export Reports', desc: 'One-click PDF and PPTX reports. Board-ready security briefings in seconds.' },
];

const STATS = [
  { value: '40+', label: 'Languages supported' },
  { value: '<60s', label: 'Analysis time' },
  { value: '99.1%', label: 'Uptime SLA' },
  { value: '10k+', label: 'Repos analyzed' },
];

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar/>

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        {/* Grid bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px', opacity: 0.4,
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
        }}/>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(232,103,58,0.12) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        <div className="container-app" style={{ position: 'relative', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, border: '1px solid var(--border-2)', background: 'var(--bg-1)', marginBottom: 28 }}>
              <Zap size={11} color="var(--accent)"/>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--fg-2)', letterSpacing: '0.04em' }}>AI-powered codebase intelligence</span>
            </div>

            <h1 style={{ fontSize: 'clamp(40px, 7vw, 76px)', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'var(--fg)', marginBottom: 24, letterSpacing: '-0.03em', lineHeight: 1.0 }}>
              Know exactly what's<br/>
              <span style={{ color: 'var(--accent)' }}>broken</span> in your repo.
            </h1>

            <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--fg-2)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
              Paste a GitHub URL. Get a full security audit, architecture map, and production readiness score in under a minute.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/auth/signup" className="btn btn-primary btn-lg">
                Analyze your repo <ArrowRight size={15}/>
              </a>
              <a href="/auth/login" className="btn btn-outline btn-lg">
                <Github size={15}/> Continue with GitHub
              </a>
            </div>

            <p style={{ marginTop: 20, fontSize: 12, color: 'var(--fg-3)' }}>
              Free tier — 20 credits, no card required
            </p>
          </motion.div>

          {/* Terminal mockup */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ marginTop: 64, maxWidth: 680, margin: '64px auto 0', textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                {['#f87171','#fbbf24','#4ade80'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }}/>)}
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>archdefend — analysis</span>
              </div>
              <div style={{ padding: 20, fontFamily: 'IBM Plex Mono', fontSize: 12, lineHeight: 2 }}>
                {[
                  { pre: '$ ', cmd: 'archdefend analyze github.com/acme/backend', color: 'var(--fg)' },
                  { pre: '✓ ', cmd: 'Cloning repository... (2.3s)', color: 'var(--success)' },
                  { pre: '✓ ', cmd: 'Parsing 847 files across 12 services', color: 'var(--success)' },
                  { pre: '⚠ ', cmd: '3 critical vulnerabilities found', color: 'var(--warning)' },
                  { pre: '✗ ', cmd: 'SQL injection risk in /api/users (line 142)', color: 'var(--error)' },
                  { pre: '✓ ', cmd: 'Architecture report ready → export PDF', color: 'var(--success)' },
                ].map((line, i) => (
                  <div key={i} style={{ color: i === 0 ? 'var(--fg-2)' : line.color }}>
                    <span style={{ color: 'var(--accent)', marginRight: 4 }}>{line.pre}</span>{line.cmd}
                  </div>
                ))}
                <div style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--accent)', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}/>
                <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Ticker/>

      {/* Stats */}
      <section style={{ padding: '72px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container-app">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
            {STATS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                style={{ textAlign: 'center', padding: '32px 24px', borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 8, letterSpacing: '0.02em' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '96px 0' }}>
        <div className="container-app">
          <div style={{ marginBottom: 56 }}>
            <span className="tag" style={{ color: 'var(--accent)' }}>Capabilities</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', marginTop: 12, maxWidth: 500 }}>
              Everything your security team needs
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 1, border: '1px solid var(--border)', borderRadius: 12 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                style={{ padding: 32, borderRight: (i + 1) % 2 !== 0 ? '1px solid var(--border)' : 'none', borderBottom: i < FEATURES.length - 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(232,103,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <f.icon size={16} color="var(--accent)"/>
                </div>
                <h3 style={{ fontSize: 15, fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.7 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '96px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container-app" style={{ textAlign: 'center' }}>
          <span className="tag" style={{ color: 'var(--accent)' }}>Get started</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', marginTop: 12, marginBottom: 16 }}>
            Analyze your first repo<br/>in 60 seconds
          </h2>
          <p style={{ fontSize: 15, color: 'var(--fg-2)', marginBottom: 36 }}>Free tier included. No credit card required.</p>
          <a href="/auth/signup" className="btn btn-primary btn-lg">
            Start for free <ArrowRight size={15}/>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 0' }}>
        <div className="container-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={11} color="#fff" strokeWidth={2.5}/>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: 'var(--fg-2)' }}>ArchDefend</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>© 2026 ArchDefend. Built for developers who care about security.</p>
        </div>
      </footer>
    </div>
  );
}
