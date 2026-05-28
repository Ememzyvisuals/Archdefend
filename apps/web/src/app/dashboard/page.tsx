'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Search, GitBranch, Network, Lock, Eye, CreditCard, Github,
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
                            <pre style={{ padding: '10px 14px', fontSize: 12, color: '#ef4444', background: 'var(--bg-1)', margin: 0, overflow: 'auto' }}>{f.snippet}</pre>
                          </div>
                        )}
                        {f.remediation && (
                          <div style={{ padding: '10px 14px', background: 'rgba(0,179,65,0.06)', border: '1px solid rgba(0,179,65,0.15)', borderRadius: 6 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>REMEDIATION</p>
                            <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.65 }}>{f.remediation}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── API Inventory tab ────────────────────────────────────────────────────────

function APITab({ routes }: { routes: any[] }) {
  const METHOD_COLORS: Record<string, string> = { GET: 'var(--success)', POST: 'var(--accent)', PUT: 'var(--warning)', DELETE: 'var(--error)', PATCH: '#a855f7', ANY: 'var(--fg-4)' };

  if (!routes.length) {
    return (
      <div className="empty-state">
        <Code2 size={28} style={{ color: 'var(--fg-4)', marginBottom: 12 }}/>
        <h3>No API routes detected</h3>
        <p>Supports FastAPI, Flask, Express, Django, Next.js, Spring, Rails, and more.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{routes.length} endpoints discovered</span>
      </div>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 80 }}>Method</th>
            <th>Path</th>
            <th style={{ width: 120 }}>Framework</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((r, i) => (
            <tr key={i}>
              <td><span className="text-mono" style={{ fontSize: 11, fontWeight: 700, color: METHOD_COLORS[r.method] ?? 'var(--fg-3)' }}>{r.method}</span></td>
              <td className="text-mono" style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{r.path}</td>
              <td style={{ fontSize: 12, color: 'var(--fg-3)' }}>{r.framework}</td>
              <td className="text-mono" style={{ fontSize: 11, color: 'var(--fg-4)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Interview tab ────────────────────────────────────────────────────────────

function InterviewTab({ questions }: { questions: InterviewQuestion[] }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const cats = ['all', ...new Set(questions.map(q => q.category))];
  const filtered = filter === 'all' ? questions : questions.filter(q => q.category === filter);

  const copyQA = async (q: InterviewQuestion, i: number) => {
    await navigator.clipboard.writeText(`Q: ${q.question}\n\nA: ${q.expected_answer}`);
    setCopied(i); setTimeout(() => setCopied(null), 2000);
  };

  const diffColors: Record<string, string> = { medium: 'var(--warning)', hard: '#f97316', expert: 'var(--error)' };

  if (!questions.length) {
    return (
      <div className="empty-state">
        <Eye size={28} style={{ color: 'var(--fg-4)', marginBottom: 12 }}/>
        <h3>No interview questions generated</h3>
        <p>Enable Interview Prep when starting an analysis.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`btn btn-sm ${filter === c ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }}>{c}
          </button>
        ))}
      </div>
      {filtered.map((q, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--border)', background: expanded === i ? 'var(--bg-1)' : 'var(--bg)' }}>
          <button onClick={() => setExpanded(expanded === i ? null : i)}
            style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 24px', cursor: 'pointer', textAlign: 'left' }}>
            <span className="text-mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2, minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>{q.category}</span>
                <span className="text-mono" style={{ fontSize: 10, color: diffColors[q.difficulty] ?? 'var(--fg-3)', fontWeight: 600 }}>{q.difficulty?.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.5 }}>{q.question}</p>
            </div>
            <motion.div animate={{ rotate: expanded === i ? 180 : 0 }} transition={{ duration: 0.15 }} style={{ color: 'var(--fg-4)', flexShrink: 0 }}>
              <ChevronDown size={13}/>
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded === i && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0 24px 20px 56px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Answer</span>
                    <button onClick={() => copyQA(q, i)} className="btn btn-ghost btn-sm">
                      {copied === i ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy Q&A</>}
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.75 }}>{q.expected_answer}</p>
                  {q.follow_up && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 6 }}>
                      <p style={{ fontSize: 11, color: 'var(--fg-4)', marginBottom: 4 }}>Follow-up</p>
                      <p style={{ fontSize: 13, color: 'var(--fg-3)', fontStyle: 'italic' }}>"{q.follow_up}"</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Export tab ───────────────────────────────────────────────────────────────

function ExportTab({ analysisId, report }: { analysisId: string; report: AnalysisReport }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (fmt: 'pdf' | 'pptx' | 'markdown') => {
    if (fmt === 'pptx' && user?.plan === 'free') { toast.error('PPTX requires Pro plan'); return; }
    setLoading(fmt);
    try { await api.downloadExport(analysisId, fmt); toast.success(`${fmt.toUpperCase()} downloaded`); }
    catch { toast.error('Export failed'); }
    finally { setLoading(null); }
  };

  const formats = [
    { id: 'pdf' as const, label: 'PDF Report', icon: FileCode, desc: 'Architecture, security findings, interview Q&A, recommendations', free: true },
    { id: 'pptx' as const, label: 'PPTX Slides', icon: Layers, desc: 'Presentation deck for architecture reviews and technical discussions', free: false, credits: 5 },
    { id: 'markdown' as const, label: 'Markdown Docs', icon: Code2, desc: 'GitHub wiki-ready documentation with API inventory and security notes', free: true },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {formats.map(f => {
          const Icon = f.icon;
          const isPro = !f.free && user?.plan === 'free';
          return (
            <div key={f.id} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={15} style={{ color: 'var(--fg-2)' }}/>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{f.label}</span>
                </div>
                {f.free ? <span className="badge badge-success" style={{ fontSize: 10 }}>Free</span>
                         : <span className="badge badge-neutral text-mono" style={{ fontSize: 10 }}>{f.credits}cr</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.6, marginBottom: 16 }}>{f.desc}</p>
              <button onClick={() => download(f.id)} disabled={loading === f.id || isPro}
                className={isPro ? 'btn btn-secondary' : 'btn btn-secondary'}
                style={{ width: '100%', justifyContent: 'center', opacity: isPro ? 0.5 : 1 }}>
                {loading === f.id
                  ? <span className="w-3 h-3 border-2 border-fg/20 border-t-fg rounded-full animate-spin"/>
                  : isPro ? <><Lock size={11}/> Pro required</>
                  : <><Download size={11}/> Download {f.id.toUpperCase()}</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Report summary */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Report includes</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { l: 'Repository', v: report.repo_name ?? '—' },
            { l: 'Files',      v: String(report.file_count ?? 0) },
            { l: 'Security',   v: `${report.security_findings?.length ?? 0} findings` },
            { l: 'API Routes', v: String(report.api_inventory?.length ?? 0) },
          ].map(s => (
            <div key={s.l}>
              <p style={{ fontSize: 11, color: 'var(--fg-4)', marginBottom: 3 }}>{s.l}</p>
              <p className="text-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Sidebar nav items ─────────────────────────────────────────────────────────

const MAIN_NAV = [
  { id: 'overview',  label: 'Overview',         icon: BarChart3  },
  { id: 'analyses',  label: 'Analyses',          icon: GitBranch  },
  { id: 'billing',   label: 'Billing',           icon: CreditCard },
  { id: 'settings',  label: 'Account settings',  icon: Settings   },
];

const REPORT_NAV = [
  { id: 'overview',  label: 'Overview',          icon: BarChart3  },
  { id: 'graph',     label: 'Dependency Graph',  icon: Network    },
  { id: 'security',  label: 'Security',          icon: Lock       },
  { id: 'api',       label: 'API Inventory',     icon: Code2      },
  { id: 'interview', label: 'Interview Prep',    icon: Eye        },
  { id: 'export',    label: 'Export',            icon: Download   },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  page, setPage, inReport, reportTab, setReportTab,
}: {
  page: string; setPage: (p: string) => void;
  inReport: boolean; reportTab: string; setReportTab: (t: string) => void;
}) {
  const { user, logout } = useAuthStore();

  function NavBtn({ id, label, icon: Icon, active, onClick }: any) {
    return (
      <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 16px', background: active ? 'var(--accent)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: active ? '#fff' : 'var(--fg-2)', fontSize: 13, fontWeight: active ? 500 : 400,
        transition: 'background .12s, color .12s',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; }}}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--fg-2)'; }}}>
        <Icon size={15} style={{ flexShrink: 0 }}/>{label}
      </button>
    );
  }

  return (
    <aside style={{ width: 224, flexShrink: 0, background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Logo */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={14} style={{ color: 'var(--bg)' }} strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>ArchDefend</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--fg-4)', paddingLeft: 36 }}>AI codebase intelligence</p>
      </div>

      {/* Main nav */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
        <div style={{ padding: '4px 16px 6px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Client portal</span>
        </div>
        {MAIN_NAV.map(item => (
          <NavBtn key={item.id} {...item} active={page === item.id && !inReport} onClick={() => setPage(item.id)}/>
        ))}

        {/* Report nav — only shown when a report is active */}
        {inReport && (
          <>
            <div style={{ padding: '12px 16px 6px', marginTop: 4, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Report</span>
            </div>
            {REPORT_NAV.map(item => (
              <NavBtn key={item.id} {...item} active={inReport && reportTab === item.id} onClick={() => { setPage('report'); setReportTab(item.id); }}/>
            ))}
          </>
        )}
      </div>

      {/* User */}
      <div style={{ borderTop: '1px solid var(--border)', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-2)', flexShrink: 0 }}/>
            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)', fontSize: 13, flexShrink: 0 }}>{(user?.email || 'U')[0].toUpperCase()}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.github_username || user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button onClick={logout} title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-4)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color .12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--error)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-4)'; }}>
            <LogOut size={14}/>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ title }: { title: string }) {
  return (
    <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', background: 'var(--bg-1)', flexShrink: 0 }}>
      <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>ArchDefend portal</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{title}</p>
      <a href="mailto:support@archdefend.io" style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>Contact support</a>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ tag, title, sub, action }: { tag: string; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div style={{ padding: '28px 28px 0', marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>{tag}</p>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em', marginBottom: 4 }}>{title}</h1>
          <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>{sub}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

// ─── Overview page ─────────────────────────────────────────────────────────────

function OverviewPage({ onStart, onLoadReport }: { onStart: (url: string) => void; onLoadReport: (id: string) => void }) {
  const { user } = useAuthStore();
  const { history, isAnalyzing, activeStatus } = useAnalysisStore();
  const [url, setUrl] = useState('');

  const credits = user?.credits ?? 0;
  const creditPct = Math.min(100, (credits / 20) * 100);

  const submit = () => {
    if (!url.trim() || !url.includes('github.com')) { toast.error('Enter a valid GitHub URL'); return; }
    onStart(url.trim());
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <PageHeader
        tag="Overview"
        title={`Welcome${user?.github_username ? ', ' + user.github_username : ''}.`}
        sub="Analyze a GitHub repository to get architecture maps, security findings, and full reports."
        action={<a href="/pricing" style={{ display:'inline-flex', alignItems:'center', height:36, padding:'0 16px', borderRadius:6, background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>Buy credits</a>}
      />

      <div style={{ padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Analyze input */}
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>New Analysis</h2>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 16 }}>Paste a GitHub repo URL. Each analysis costs 5–10 credits.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--fg-4)', pointerEvents:'none' }}/>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="https://github.com/owner/repository" className="input text-mono"
                  style={{ paddingLeft: 32, fontSize: 12 }} disabled={isAnalyzing}/>
              </div>
              <button onClick={submit} disabled={!url.trim() || isAnalyzing} className="btn btn-primary"
                style={{ height: 38, padding: '0 18px', opacity: (!url.trim() || isAnalyzing) ? 0.5 : 1, display:'flex', alignItems:'center', gap:6 }}>
                {isAnalyzing
                  ? <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin .6s linear infinite' }}/>
                  : <><span>Analyze</span><ArrowRight size={13}/></>}
              </button>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['vercel/next.js','tiangolo/fastapi','expressjs/express','django/django'].map(r => (
                <button key={r} onClick={() => setUrl(`https://github.com/${r}`)} disabled={isAnalyzing}
                  className="btn btn-secondary btn-sm text-mono" style={{ fontSize:11 }}>{r}</button>
              ))}
            </div>
            <AnimatePresence>
              {isAnalyzing && activeStatus && (
                <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ marginTop:16 }}>
                  <ProgressToast message={activeStatus.message} progress={activeStatus.progress}/>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent analyses */}
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 22 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:15, fontWeight:600, color:'var(--fg)' }}>Recent activity</h2>
              <span style={{ fontSize:11, color:'var(--fg-4)', fontFamily:'JetBrains Mono, monospace' }}>{history.length} analyses</span>
            </div>
            {history.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <GitBranch size={32} style={{ margin:'0 auto 12px', color:'var(--fg-4)', display:'block' }}/>
                  <p style={{ fontSize:14, color:'var(--fg-3)', marginBottom:4 }}>No analyses yet</p>
                  <p style={{ fontSize:12, color:'var(--fg-4)' }}>Paste a GitHub URL above to run your first analysis.</p>
                </div>
              )
              : history.slice(0, 6).map((a: any) => (
                <div key={a.id}
                  onClick={() => a.status === 'completed' && onLoadReport(a.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:8, background:'var(--bg-2)', marginBottom:4, cursor: a.status === 'completed' ? 'pointer' : 'default', transition:'background .12s' }}
                  onMouseEnter={e => { if (a.status === 'completed') (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'; }}>
                  <GitBranch size={13} style={{ color:'var(--fg-4)', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'var(--fg)', fontFamily:'JetBrains Mono, monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {a.repo_name || a.repo_url?.split('/').slice(-2).join('/')}
                    </div>
                    <div style={{ fontSize:11, color:'var(--fg-4)', marginTop:1 }}>
                      {new Date(a.created_at).toLocaleDateString()} · {a.credits_used} credits
                      {a.status === 'completed' && <span style={{ color:'var(--accent)', marginLeft:8 }}>Click to view →</span>}
                    </div>
                  </div>
                  <StatusBadge status={a.status}/>
                </div>
              ))
            }
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Credits */}
          <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h3 style={{ fontSize:13, fontWeight:600, color:'var(--fg)' }}>Credits</h3>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:'JetBrains Mono, monospace', padding:'2px 8px', borderRadius:100,
                background: credits > 5 ? 'rgba(0,179,65,0.1)' : 'rgba(220,0,0,0.1)',
                color: credits > 5 ? 'var(--success)' : 'var(--error)',
                border: `1px solid ${credits > 5 ? 'rgba(0,179,65,0.2)' : 'rgba(220,0,0,0.2)'}` }}>
                {credits > 0 ? 'Active' : 'Empty'}
              </span>
            </div>
            <div style={{ fontSize:40, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.04em', lineHeight:1, marginBottom:4 }}>{credits}</div>
            <div style={{ fontSize:12, color:'var(--fg-4)', marginBottom:12 }}>credits remaining · <span style={{ textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace' }}>{user?.plan || 'free'}</span> plan</div>
            <div style={{ height:5, background:'var(--bg-3)', borderRadius:3, marginBottom:14, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${creditPct}%`, background: creditPct > 50 ? 'var(--success)' : creditPct > 20 ? 'var(--warning)' : 'var(--error)', borderRadius:3, transition:'width .4s' }}/>
            </div>
            <div style={{ fontSize:12, color:'var(--fg-4)', marginBottom:14 }}>Free tier: 20 credits · 5–10 per analysis</div>
            <a href="/pricing" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:36, borderRadius:6, background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
              Buy more credits
            </a>
          </div>

          {/* Account summary */}
          <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:20 }}>
            <h3 style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:14 }}>Account</h3>
            {[
              { label: 'Email',    value: user?.email || '—' },
              { label: 'GitHub',   value: user?.github_username ? `@${user.github_username}` : 'Not linked' },
              { label: 'Plan',     value: (user?.plan || 'free').toUpperCase() },
              { label: 'Verified', value: user?.is_verified ? 'Yes' : 'No' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--fg-4)' }}>{row.label}</span>
                <span style={{ color:'var(--fg-2)', fontFamily:'JetBrains Mono, monospace', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', maxWidth:140, textAlign:'right' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height:28 }}/>
    </div>
  );
}

// ─── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    completed: { bg:'rgba(0,179,65,0.1)',   color:'var(--success)', border:'rgba(0,179,65,0.2)' },
    failed:    { bg:'rgba(220,0,0,0.1)',    color:'var(--error)',   border:'rgba(220,0,0,0.2)' },
    pending:   { bg:'rgba(245,166,35,0.1)', color:'var(--warning)', border:'rgba(245,166,35,0.2)' },
    analyzing: { bg:'rgba(0,112,243,0.1)',  color:'var(--accent)',  border:'rgba(0,112,243,0.2)' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:600, fontFamily:'JetBrains Mono, monospace', whiteSpace:'nowrap', background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {status}
    </span>
  );
}

// ─── Analyses page ─────────────────────────────────────────────────────────────

function AnalysesPage({ onLoadReport }: { onLoadReport: (id: string) => void }) {
  const { history } = useAnalysisStore();
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <PageHeader tag="Analyses" title="Your analysis history." sub="All repository analyses run on your account. Click a completed row to view its report."/>
      <div style={{ padding:'0 28px' }}>
        {history.length === 0 ? (
          <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:48, textAlign:'center' }}>
            <History size={36} style={{ margin:'0 auto 14px', color:'var(--fg-4)', display:'block' }}/>
            <p style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:6 }}>No analyses yet</p>
            <p style={{ fontSize:13, color:'var(--fg-3)' }}>Go to Overview and paste a GitHub URL to get started.</p>
          </div>
        ) : (
          <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 140px 110px 70px', padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-2)' }}>
              {['Repository','Date','Status','Credits'].map(h => (
                <span key={h} style={{ fontSize:11, fontWeight:600, color:'var(--fg-4)', letterSpacing:'0.04em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace' }}>{h}</span>
              ))}
            </div>
            {history.map((a: any, i: number) => (
              <div key={a.id}
                onClick={() => a.status === 'completed' && onLoadReport(a.id)}
                style={{ display:'grid', gridTemplateColumns:'1fr 140px 110px 70px', padding:'12px 16px', borderBottom: i < history.length-1 ? '1px solid var(--border)' : 'none', alignItems:'center', cursor: a.status === 'completed' ? 'pointer' : 'default', transition:'background .12s' }}
                onMouseEnter={e => { if (a.status === 'completed') (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)', fontFamily:'JetBrains Mono, monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {a.repo_name || a.repo_url?.split('/').slice(-2).join('/')}
                  </div>
                  <div style={{ fontSize:11, color:'var(--fg-4)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.repo_url}</div>
                </div>
                <span style={{ fontSize:12, color:'var(--fg-3)' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                <StatusBadge status={a.status}/>
                <span style={{ fontSize:12, color:'var(--fg-3)', fontFamily:'JetBrains Mono, monospace' }}>{a.credits_used}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ height:28 }}/>
    </div>
  );
}

// ─── Billing page ─────────────────────────────────────────────────────────────

function BillingPage() {
  const { user } = useAuthStore();
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <PageHeader tag="Billing" title="Your plan and credits." sub="Manage your subscription and purchase additional analysis credits."/>
      <div style={{ padding:'0 28px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:860 }}>
        {/* Current plan */}
        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Current plan</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:20 }}>Your active subscription tier.</p>
          <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:11, color:'var(--fg-4)', marginBottom:4 }}>Plan</div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.02em', textTransform:'uppercase' }}>{user?.plan || 'Free'}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'Credits remaining', value:`${user?.credits ?? 0}` },
              { label:'Credits per free tier', value:'20' },
              { label:'Cost per analysis', value:'5–10 credits' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--fg-3)' }}>{row.label}</span>
                <span style={{ color:'var(--fg)', fontFamily:'JetBrains Mono, monospace', fontWeight:500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade */}
        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Upgrade</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:20 }}>Get more credits and unlock advanced features.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { name:'Starter', price:'$9/mo', credits:'100 credits', features:['100 analyses/mo','PDF & PPTX export','Priority support'] },
              { name:'Pro',     price:'$29/mo', credits:'500 credits', features:['500 analyses/mo','All export formats','Team access','API access'] },
            ].map(plan => (
              <div key={plan.name} style={{ background:'var(--bg-2)', border:'1px solid var(--border-2)', borderRadius:8, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>{plan.name}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'JetBrains Mono, monospace' }}>{plan.price}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--fg-3)', marginBottom:10 }}>{plan.credits}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--fg-2)', marginBottom:4 }}>
                    <CheckCircle size={11} style={{ color:'var(--success)', flexShrink:0 }}/>{f}
                  </div>
                ))}
                <a href="/pricing" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:34, borderRadius:6, background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:600, textDecoration:'none', marginTop:12 }}>
                  Upgrade to {plan.name}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Payment history */}
        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:24, gridColumn:'1/-1' }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Payment history</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:16 }}>Your past payments and credit purchases.</p>
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--fg-4)' }}>
            <CreditCard size={28} style={{ margin:'0 auto 10px', display:'block', opacity:0.3 }}/>
            <p style={{ fontSize:13 }}>No payments yet.</p>
          </div>
        </div>
      </div>
      <div style={{ height:28 }}/>
    </div>
  );
}

// ─── Settings page ─────────────────────────────────────────────────────────────

function SettingsPage() {
  const { user, logout, refreshUser } = useAuthStore();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [statusNotifs, setStatusNotifs] = useState(true);

  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <PageHeader tag="Account settings" title="Keep your account details clear." sub="Review and manage your account information, security, and notification preferences."/>
      <div style={{ padding:'0 28px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:860 }}>

        {/* Profile */}
        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Profile information</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:20 }}>Basic account information used across the portal.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Username', value: user?.github_username || '—' },
              { label:'Email',    value: user?.email || '—' },
              { label:'Role',     value: 'User' },
              { label:'Status',   value: user?.is_active ? 'Active' : 'Inactive' },
            ].map(f => (
              <div key={f.label} style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:'var(--fg-4)', marginBottom:4 }}>{f.label}</div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => refreshUser().then(() => toast.success('Profile refreshed'))}
            style={{ display:'flex', alignItems:'center', gap:6, marginTop:16, height:34, padding:'0 14px', borderRadius:6, border:'1px solid var(--border-2)', background:'transparent', color:'var(--fg-2)', fontSize:12, cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <RefreshCw size={12}/> Refresh profile
          </button>
        </div>

        {/* Security */}
        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Security</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:20 }}>Session and authentication actions.</p>
          <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Password changes</div>
            <div style={{ fontSize:12, color:'var(--fg-3)', lineHeight:1.5 }}>
              {user?.github_username
                ? 'Your account uses GitHub OAuth — no password is set. Sign in via GitHub.'
                : 'Self-service password reset is coming soon. Contact support for help.'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {user?.github_username && (
              <a href={`https://github.com/${user.github_username}`} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:6, height:36, padding:'0 14px', borderRadius:6, border:'1px solid var(--border-2)', background:'transparent', color:'var(--fg-2)', fontSize:12, textDecoration:'none' }}>
                <Github size={13}/> View GitHub profile
              </a>
            )}
            <button onClick={() => { logout(); toast.success('Signed out'); }}
              style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 14px', borderRadius:6, border:'1px solid var(--border-2)', background:'transparent', color:'var(--fg-2)', fontSize:12, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--error)'; (e.currentTarget as HTMLElement).style.color = 'var(--error)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--fg-2)'; }}>
              <LogOut size={12}/> Sign out
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Notification preferences</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:20 }}>Control what emails you receive from ArchDefend.</p>
          {[
            { label:'Analysis complete emails',  desc:'Get notified by email when an analysis finishes.',  value:emailNotifs,  set:setEmailNotifs },
            { label:'Service update emails',     desc:'Receive updates about new features and changes.',   value:statusNotifs, set:setStatusNotifs },
          ].map((n, i) => (
            <div key={n.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)', marginBottom:2 }}>{n.label}</div>
                <div style={{ fontSize:12, color:'var(--fg-3)' }}>{n.desc}</div>
              </div>
              <button onClick={() => n.set(!n.value)}
                style={{ width:36, height:20, borderRadius:10, background: n.value ? 'var(--accent)' : 'var(--bg-3)', border: `1px solid ${n.value ? 'var(--accent)' : 'var(--border-3)'}`, position:'relative', cursor:'pointer', flexShrink:0, transition:'background .2s' }}>
                <div style={{ position:'absolute', top:2, left: n.value ? 17 : 2, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left .2s' }}/>
              </button>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div style={{ background:'var(--bg-1)', border:'1px solid rgba(220,0,0,0.2)', borderRadius:10, padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--error)', marginBottom:4 }}>Danger zone</h3>
          <p style={{ fontSize:13, color:'var(--fg-3)', marginBottom:16 }}>Irreversible actions — proceed with caution.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:12, background:'var(--bg-2)', borderRadius:8, border:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>Delete account</div>
                <div style={{ fontSize:12, color:'var(--fg-3)' }}>Permanently delete your account and all data.</div>
              </div>
              <a href="mailto:support@archdefend.io?subject=Account deletion request"
                style={{ display:'inline-flex', alignItems:'center', height:34, padding:'0 14px', borderRadius:6, background:'rgba(220,0,0,0.08)', border:'1px solid rgba(220,0,0,0.2)', color:'var(--error)', fontSize:12, fontWeight:500, textDecoration:'none', whiteSpace:'nowrap', marginLeft:12 }}>
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
      <div style={{ height:28 }}/>
    </div>
  );
}

// ─── Dashboard root ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { token, user, refreshUser } = useAuthStore();
  const { activeAnalysisId, activeReport, isAnalyzing, startAnalysis, history, setHistory, setReport, setActiveAnalysis } = useAnalysisStore();
  const { activeTab, setActiveTab } = useUIStore();
  const [page, setPage] = useState<string>('overview');

  // Re-inject token into API client on mount (handles page reload case)
  useEffect(() => {
    if (token) { api.setToken(token); refreshUser(); }
    if (token) api.getAnalysisHistory().then((d: any) => setHistory(d.analyses)).catch(() => {});
  }, [token]);

  // Load a past report by analysis ID
  const loadReport = useCallback(async (id: string) => {
    try {
      toast.loading('Loading report…', { id: 'load-report' });
      const report = await api.getAnalysisReport(id);
      setActiveAnalysis(id);
      setReport(report);
      setActiveTab('overview');
      setPage('report');
      toast.success('Report loaded', { id: 'load-report' });
    } catch {
      toast.error('Failed to load report', { id: 'load-report' });
    }
  }, [setReport, setActiveAnalysis, setActiveTab]);

  const handleStart = useCallback(async (url: string) => {
    try {
      setPage('report');
      setActiveTab('overview');
      await startAnalysis(url);
      toast.success('Analysis complete');
      api.getAnalysisHistory().then((d: any) => setHistory(d.analyses)).catch(() => {});
      refreshUser(); // refresh credits
    } catch (err: any) {
      toast.error(err?.message || 'Analysis failed');
      setPage('overview');
    }
  }, [startAnalysis, setActiveTab, setHistory, refreshUser]);

  const [GraphViewer, setGraphViewer] = useState<any>(null);
  useEffect(() => {
    import('@/components/graph/GraphViewer').then(m => setGraphViewer(() => m.GraphViewer));
  }, []);

  const inReport = page === 'report' && !!activeAnalysisId;

  const topBarTitles: Record<string, string> = {
    overview: 'Overview',
    analyses: 'Analyses',
    billing:  'Billing',
    settings: 'Account settings',
    report:   'Report',
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <Sidebar page={page} setPage={setPage} inReport={inReport} reportTab={activeTab} setReportTab={setActiveTab}/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar title={topBarTitles[page] || 'Dashboard'}/>

        <main style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', background:'var(--bg-1)' }}>

          {page === 'overview' && <OverviewPage onStart={handleStart} onLoadReport={loadReport}/>}
          {page === 'analyses' && <AnalysesPage onLoadReport={loadReport}/>}
          {page === 'billing'  && <BillingPage/>}
          {page === 'settings' && <SettingsPage/>}

          {page === 'report' && (
            <>
              {isAnalyzing && !activeReport && (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ textAlign:'center' }}>
                    <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
                      style={{ display:'inline-block', width:28, height:28, border:'2px solid var(--border-3)', borderTopColor:'var(--accent)', borderRadius:'50%', marginBottom:16 }}/>
                    <p style={{ fontSize:14, color:'var(--fg-3)', marginBottom:8 }}>Analyzing repository…</p>
                    {activeStatus && <ProgressToast message={activeStatus.message} progress={activeStatus.progress}/>}
                  </div>
                </div>
              )}
              {activeReport && activeAnalysisId && (
                <>
                  <ReportHeader report={activeReport} analysisId={activeAnalysisId}/>
                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.12 }}>
                      {activeTab === 'overview'  && <OverviewTab  report={activeReport}/>}
                      {activeTab === 'graph'     && GraphViewer && (
                        <div style={{ height:'calc(100vh - 140px)' }}>
                          <GraphViewer nodes={activeReport.dependency_graph?.nodes ?? []} edges={activeReport.dependency_graph?.edges ?? []}/>
                        </div>
                      )}
                      {activeTab === 'security'  && <SecurityTab  findings={activeReport.security_findings ?? []}/>}
                      {activeTab === 'api'       && <APITab       routes={activeReport.api_inventory ?? []}/>}
                      {activeTab === 'interview' && <InterviewTab questions={activeReport.interview_questions ?? []}/>}
                      {activeTab === 'export'    && <ExportTab    analysisId={activeAnalysisId} report={activeReport}/>}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
