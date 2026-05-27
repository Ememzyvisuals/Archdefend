'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Search, GitBranch, Network, Lock, Eye,
  Download, BarChart3, Code2, History, Settings, LogOut,
  CheckCircle, AlertTriangle, ArrowRight, ChevronRight,
  FileCode, Layers, Globe, Cpu, Clock, RefreshCw, X,
  ChevronDown, Copy, Check, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore, useAnalysisStore, useUIStore } from '@/store';
import { api, ArchDefendAPI } from '@/lib/api';
import type { AnalysisReport, SecurityFinding, InterviewQuestion } from '@/types';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'overview',   label: 'Overview',      icon: BarChart3  },
  { id: 'graph',      label: 'Dependency Graph', icon: Network },
  { id: 'security',   label: 'Security',      icon: Lock       },
  { id: 'api',        label: 'API Inventory', icon: Code2      },
  { id: 'interview',  label: 'Interview Prep',icon: Eye        },
  { id: 'export',     label: 'Export',        icon: Download   },
];


function ProgressToast({ message, progress }: { message: string; progress: number }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, width: 320, background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '14px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>Analyzing repository…</span>
        <span className="text-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{progress}%</span>
      </div>
      <div style={{ height: 2, background: 'var(--bg-3)', borderRadius: 1, overflow: 'hidden', marginBottom: 8 }}>
        <motion.div style={{ height: '100%', background: 'var(--accent)', borderRadius: 1 }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}/>
      </div>
      <p style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'JetBrains Mono, monospace' }}>{message}</p>
    </div>
  );
}

// ─── New Analysis Input ────────────────────────────────────────────────────────

function AnalysisInput({ onStart }: { onStart: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [opts, setOpts] = useState({ security: true, interview: true });
  const { isAnalyzing, activeStatus } = useAnalysisStore();

  const submit = () => {
    if (!url.trim()) { toast.error('Enter a GitHub repository URL'); return; }
    if (!url.includes('github.com')) { toast.error('Only GitHub repositories are supported'); return; }
    onStart(url.trim());
  };

  const examples = ['vercel/next.js', 'tiangolo/fastapi', 'django/django', 'expressjs/express'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', marginBottom: 8 }}>
            Analyze a repository
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>
            Paste a GitHub URL to get architecture analysis, security findings, and exports.
          </p>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }}>
              <Search size={13}/>
            </span>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="https://github.com/owner/repository"
              className="input input-lg text-mono" style={{ paddingLeft: 32, width: '100%', fontSize: 13 }}
              disabled={isAnalyzing}/>
          </div>
          <button onClick={submit} disabled={!url.trim() || isAnalyzing} className="btn btn-primary"
            style={{ height: 40, padding: '0 20px', opacity: (!url.trim() || isAnalyzing) ? 0.5 : 1 }}>
            {isAnalyzing
              ? <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"/>
              : <><span>Analyze</span><ArrowRight size={13}/></>}
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
          {[{ k: 'security', l: 'Security Analysis', d: '+5cr' }, { k: 'interview', l: 'Interview Prep', d: '+5cr' }].map(o => (
            <label key={o.k} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <div onClick={() => setOpts(p => ({ ...p, [o.k]: !p[o.k as keyof typeof p] }))}
                style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${opts[o.k as keyof typeof opts] ? 'var(--accent)' : 'var(--border-3)'}`, background: opts[o.k as keyof typeof opts] ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', cursor: 'pointer' }}>
                {opts[o.k as keyof typeof opts] && <Check size={9} style={{ color: 'white' }}/>}
              </div>
              <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{o.l}</span>
              <span className="text-mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{o.d}</span>
            </label>
          ))}
        </div>

        {/* Divider */}
        <div className="divider" style={{ marginBottom: 24 }}/>

        {/* Example repos */}
        <p style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 12 }}>Try with a popular repository:</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {examples.map(r => (
            <button key={r} onClick={() => setUrl(`https://github.com/${r}`)} disabled={isAnalyzing}
              className="btn btn-secondary btn-sm text-mono" style={{ fontSize: 11 }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Progress toast */}
      <AnimatePresence>
        {isAnalyzing && activeStatus && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <ProgressToast message={activeStatus.message} progress={activeStatus.progress}/>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Report header ────────────────────────────────────────────────────────────

function ReportHeader({ report, analysisId }: { report: AnalysisReport; analysisId: string }) {
  const { setActiveTab } = useUIStore();
  return (
    <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Dashboard</span>
        <ChevronRight size={12} style={{ color: 'var(--fg-4)' }}/>
        <span style={{ fontSize: 12, color: 'var(--fg)', fontFamily: 'JetBrains Mono, monospace' }}>
          {report.repo_name || analysisId.slice(0, 8)}
        </span>
        <span className="badge badge-success" style={{ marginLeft: 4 }}>
          <span className="status-dot status-dot-success" style={{ width: 5, height: 5 }}/>
          complete
        </span>
      </div>

      {/* Tab nav */}
      <div className="tab-nav" style={{ gap: 0, borderBottom: 'none' }}>
        {NAV.map(item => {
          const { activeTab } = useUIStore();
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`tab-item ${activeTab === item.id ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={13}/>{item.label}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, paddingBottom: 6 }}>
          <button onClick={() => api.downloadExport(analysisId, 'pdf')} className="btn btn-secondary btn-sm">
            <Download size={11}/> PDF
          </button>
          <button onClick={() => setActiveTab('export')} className="btn btn-secondary btn-sm">
            All exports
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ report }: { report: AnalysisReport }) {
  const { setActiveTab } = useUIStore();
  const criticals = report.security_findings?.filter(f => f.severity === 'critical') ?? [];
  const highs = report.security_findings?.filter(f => f.severity === 'high') ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Score row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1 }}>
        {[
          { label: 'Scalability',       value: `${report.scalability_score ?? '—'}/100`, sub: 'architecture score' },
          { label: 'Production Ready',  value: `${report.production_readiness_score ?? '—'}/100`, sub: 'readiness score' },
          { label: 'Security Findings', value: String(report.security_findings?.length ?? 0), sub: `${criticals.length} critical, ${highs.length} high` },
          { label: 'Files Analyzed',    value: String(report.file_count ?? 0), sub: Object.keys(report.language_stats ?? {}).slice(0,3).join(', ') },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
            style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono, monospace' }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
        {/* Architecture summary */}
        <div style={{ background: 'var(--bg)', padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Architecture Summary</h3>
          <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.7 }}>
            {report.architecture_summary || 'No summary generated.'}
          </p>
        </div>

        {/* Tech stack */}
        <div style={{ background: 'var(--bg)', padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Tech Stack</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(report.tech_stack ?? []).map(t => (
              <span key={t} className="badge badge-neutral text-mono" style={{ fontSize: 11 }}>{t}</span>
            ))}
            {!report.tech_stack?.length && <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>Not detected</span>}
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Languages</h3>
            {Object.entries(report.language_stats ?? {}).slice(0, 5).map(([lang, count]) => {
              const total = Object.values(report.language_stats ?? {}).reduce((a, b) => a + b, 0);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="text-mono" style={{ fontSize: 11, color: 'var(--fg-3)', width: 80, flexShrink: 0 }}>{lang}</span>
                  <div style={{ flex: 1, height: 3, background: 'var(--bg-3)', borderRadius: 1.5, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: 'var(--fg-3)', borderRadius: 1.5 }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}/>
                  </div>
                  <span className="text-mono" style={{ fontSize: 11, color: 'var(--fg-4)', width: 28, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical security alert */}
      {criticals.length > 0 && (
        <div style={{ background: 'rgba(220,0,0,0.04)', border: '1px solid rgba(220,0,0,0.15)', borderRadius: 0, padding: '16px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={14} style={{ color: 'var(--error)', flexShrink: 0 }}/>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)' }}>{criticals.length} critical security issue{criticals.length !== 1 ? 's' : ''} found</span>
              <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 8 }}>{criticals.map(f => f.id).join(', ')}</span>
            </div>
          </div>
          <button onClick={() => setActiveTab('security')} className="btn btn-danger btn-sm">View findings</button>
        </div>
      )}

      {/* Recommendations */}
      {(report.recommendations?.length ?? 0) > 0 && (
        <div style={{ background: 'var(--bg)', padding: '24px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 16 }}>Recommendations</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {report.recommendations!.slice(0, 5).map((r, i) => {
              const pColors: Record<string, string> = { critical: 'var(--error)', high: 'var(--warning)', medium: 'var(--fg-2)', low: 'var(--fg-3)' };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: pColors[r.priority] ?? 'var(--fg-4)', flexShrink: 0, marginTop: 6 }}/>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{r.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>{r.description}</p>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: 10, flexShrink: 0 }}>{r.effort}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Security tab ─────────────────────────────────────────────────────────────

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;
const SEV_COLORS: Record<string, string> = { critical: 'var(--error)', high: 'var(--warning)', medium: '#f5a623', low: 'var(--success)', info: 'var(--accent)' };

function SecurityTab({ findings }: { findings: SecurityFinding[] }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = Object.fromEntries(SEV_ORDER.map(s => [s, findings.filter(f => f.severity === s).length]));
  const filtered = filter === 'all' ? [...findings].sort((a, b) => SEV_ORDER.indexOf(a.severity as any) - SEV_ORDER.indexOf(b.severity as any)) : findings.filter(f => f.severity === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <button onClick={() => setFilter('all')}
          className={`btn btn-sm ${filter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}>
          All <span className="text-mono" style={{ fontSize: 10, marginLeft: 4 }}>{findings.length}</span>
        </button>
        {SEV_ORDER.map(sev => counts[sev] > 0 && (
          <button key={sev} onClick={() => setFilter(filter === sev ? 'all' : sev)}
            className={`btn btn-sm ${filter === sev ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ color: filter !== sev ? SEV_COLORS[sev] : undefined }}>
            <span style={{ textTransform: 'capitalize' }}>{sev}</span>
            <span className="text-mono" style={{ fontSize: 10, marginLeft: 4 }}>{counts[sev]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: 12 }}/>
          <h3>{findings.length === 0 ? 'No security issues found' : `No ${filter} issues`}</h3>
          <p>{findings.length === 0 ? 'Static analysis found no vulnerabilities in this codebase.' : 'Try a different filter above.'}</p>
        </div>
      ) : (
        <div>
          {filtered.map((f, i) => {
            const id = `${f.id}-${i}`;
            const isOpen = expanded === id;
            return (
              <div key={id} style={{ borderBottom: '1px solid var(--border)', background: isOpen ? 'var(--bg-1)' : 'var(--bg)' }}>
                <button onClick={() => setExpanded(isOpen ? null : id)}
                  style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_COLORS[f.severity] ?? 'var(--fg-4)', flexShrink: 0 }}/>
                  <span className="badge" style={{ fontSize: 10, background: 'transparent', border: `1px solid ${SEV_COLORS[f.severity]}`, color: SEV_COLORS[f.severity], padding: '1px 6px', minWidth: 52, justifyContent: 'center', flexShrink: 0 }}>
                    {f.severity.toUpperCase()}
                  </span>
                  <span className="text-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>{f.id}</span>
                  <span className="text-mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{f.file}{f.line ? `:${f.line}` : ''}</span>
                  {f.cwe && <span className="badge badge-neutral text-mono" style={{ fontSize: 10 }}>{f.cwe}</span>}
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.15 }} style={{ color: 'var(--fg-4)', flexShrink: 0 }}>
                    <ChevronDown size={13}/>
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 24px 20px 52px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65 }}>{f.description}</p>
                        {f.snippet && (
                          <div className="code-block">
                            <div className="code-block-header">{f.file}{f.line ? `:${f.line}` : ''}</div>
                      