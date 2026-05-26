'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowRight, Github, CheckCircle, ChevronDown,
  Network, Lock, Eye, Code2, BarChart3, Download,
  GitBranch, AlertTriangle, FileCode, Layers, Globe,
} from 'lucide-react';

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center transition-colors duration-200 ${scrolled ? 'border-b' : ''}`}
      style={{ background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', borderColor: 'var(--border)' }}>
      <div className="container-app flex items-center justify-between w-full">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--fg)' }}>
            <Shield size={13} style={{ color: 'var(--bg)' }} strokeWidth={2.5}/>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--fg)' }}>ArchDefend</span>
          <span className="badge badge-neutral ml-0.5" style={{ fontSize: 10 }}>Beta</span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {['Features', 'Pricing', 'Docs'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="text-sm transition-colors duration-100" style={{ color: 'var(--fg-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-3)')}>{l}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="/auth/login" className="btn btn-ghost btn-sm">Log in</a>
          <a href="/auth/signup" className="btn btn-primary btn-sm">Sign up <ArrowRight size={12}/></a>
        </div>
      </div>
    </header>
  );
}

// ─── Mini graph for hero ────────────────────────────────────────────────────────
const GN = [
  { id: 'gw',   label: 'Gateway',  x: 32,  y: 38,  c: '#ededed' },
  { id: 'auth', label: 'Auth',     x: 148, y: 8,   c: '#0070f3' },
  { id: 'db',   label: 'Postgres', x: 264, y: 28,  c: '#00b341' },
  { id: 'cache',label: 'Cache',    x: 264, y: 90,  c: '#f5a623' },
  { id: 'wkr',  label: 'Worker',   x: 148, y: 90,  c: '#a1a1a1' },
  { id: 'llm',  label: 'LLM',      x: 348, y: 58,  c: '#0070f3' },
];
const GE = [['gw','auth'],['gw','wkr'],['auth','db'],['wkr','cache'],['wkr','db'],['db','llm']];
const GM = Object.fromEntries(GN.map(n => [n.id, n]));

function HeroGraph() {
  const [active, setActive] = useState<string|null>(null);
  return (
    <svg viewBox="0 0 420 136" className="w-full" style={{ height: 136 }}>
      {GE.map(([f,t],i) => {
        const fn=GM[f],tn=GM[t], hot=active===f||active===t;
        return <line key={i} x1={fn.x+52} y1={fn.y+11} x2={tn.x} y2={tn.y+11}
          stroke={hot?'#333':'#1a1a1a'} strokeWidth={hot?1.5:1} strokeDasharray={hot?'4 3':undefined}/>;
      })}
      {GN.map((n,i) => {
        const hot=active===n.id;
        return <g key={n.id} onMouseEnter={()=>setActive(n.id)} onMouseLeave={()=>setActive(null)} style={{cursor:'pointer'}}>
          <rect x={n.x} y={n.y} width={66} height={22} rx={4}
            fill={hot?'#111':'#0a0a0a'} stroke={hot?'#333':'#1a1a1a'} strokeWidth={1}/>
          <circle cx={n.x+9} cy={n.y+11} r={2.5} fill={n.c}/>
          <text x={n.x+17} y={n.y+15} fontSize="8.5" fontFamily="JetBrains Mono,monospace" fill={hot?n.c:'#444'}>{n.label}</text>
        </g>;
      })}
    </svg>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────────
function Hero() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(() => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setTimeout(() => { window.location.href = `/analyze?repo=${encodeURIComponent(url.trim())}`; }, 600);
  }, [url, loading]);

  return (
    <section className="relative pt-14 overflow-hidden" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '48px 48px', opacity: 0.3,
      }}/>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.04), transparent)',
      }}/>

      <div className="container-app w-full py-24 grid lg:grid-cols-2 gap-16 items-center relative">
        {/* Left */}
        <div>
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.35}}>
            <div className="flex items-center gap-2 mb-8">
              <span className="badge badge-neutral">
                <span className="status-dot status-dot-live"/>
                New — v1.0 now available
              </span>
            </div>

            <h1 style={{ fontSize:'clamp(36px,5vw,58px)', fontWeight:700, letterSpacing:'-0.035em', lineHeight:1.05, color:'var(--fg)', marginBottom:20 }}>
              AI codebase<br/>intelligence.
            </h1>

            <p style={{ fontSize:16, color:'var(--fg-2)', lineHeight:1.65, marginBottom:36, maxWidth:440 }}>
              Paste a GitHub URL. Get dependency graphs, security audits,
              production readiness scores, and interview documentation in 90 seconds.
            </p>
          </motion.div>

          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:0.1}}>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <div className="relative flex-1">
                <Github size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--fg-3)' }}/>
                <input type="url" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()}
                  placeholder="https://github.com/owner/repository"
                  className="input input-lg text-mono w-full" style={{ paddingLeft: 36, fontSize:13 }}/>
              </div>
              <button onClick={analyze} disabled={!url.trim()||loading} className="btn btn-primary btn-lg"
                style={{ opacity: !url.trim()||loading ? 0.5 : 1 }}>
                {loading
                  ? <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
                  : <><span>Analyze</span><ArrowRight size={13}/></>}
              </button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {['Free to start','No credit card','Private repos','PDF & PPTX export'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-xs" style={{ color:'var(--fg-3)' }}>
                  <CheckCircle size={11} style={{ color:'var(--success)' }}/>{t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right — real product preview */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.15}}>
          <div className="card overflow-hidden" style={{ boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 64px rgba(0,0,0,0.8)' }}>
            {/* Browser chrome */}
            <div style={{ background:'var(--bg-2)', borderBottom:'1px solid var(--border)', padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <div className="flex gap-1.5">
                {['#ff5f56','#ffbd2e','#27c93f'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}
              </div>
              <div style={{ flex:1, background:'var(--bg-3)', borderRadius:4, padding:'3px 10px', display:'flex', alignItems:'center', gap:6 }}>
                <Lock size={9} style={{ color:'var(--fg-3)' }}/>
                <span className="text-mono" style={{ fontSize:11, color:'var(--fg-3)' }}>archdefend.io/dashboard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="status-dot status-dot-live"/>
                <span style={{ fontSize:10, color:'var(--success)', fontFamily:'JetBrains Mono,monospace' }}>LIVE</span>
              </div>
            </div>

            <div style={{ padding:20 }}>
              {/* Repo header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <GitBranch size={13} style={{ color:'var(--fg-3)' }}/>
                  <span className="text-mono" style={{ fontSize:12, color:'var(--fg)', fontWeight:600 }}>vercel / next.js</span>
                  <span className="badge badge-neutral" style={{ fontSize:10 }}>main</span>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {['PDF','PPTX','MD'].map(f=>(
                    <span key={f} className="badge badge-cyan" style={{ fontSize:10 }}>{f}</span>
                  ))}
                </div>
              </div>

              {/* Scores row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                {[['87','Scalability','var(--cyan)'],['94','Readiness','var(--success)'],['72','Security','var(--warning)'],['847','Files','var(--fg-2)']].map(([v,l,c])=>(
                  <div key={l} style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:18, fontWeight:700, color:c as string, lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:10, color:'var(--fg-3)', marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Graph */}
              <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 12px', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span className="text-mono" style={{ fontSize:10, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Dependency Graph</span>
                  <span style={{ fontSize:10, color:'var(--fg-3)' }}>2,341 nodes · 8,920 edges</span>
                </div>
                <HeroGraph/>
              </div>

              {/* Security findings */}
              <div>
                <span className="text-mono" style={{ fontSize:10, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>Security — 3 findings</span>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[['MED','cors-wildcard','var(--warning)'],['LOW','debug-mode','var(--success)'],['MED','http-not-https','var(--warning)']].map(([s,l,c])=>(
                    <div key={l} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'var(--bg-2)', border:'1px solid var(--border-2)', borderRadius:4, fontSize:10, fontFamily:'JetBrains Mono,monospace', color:c as string }}>
                      <AlertTriangle size={8}/>{s} · {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating status badges */}
          <motion.div animate={{y:[0,-6,0]}} transition={{duration:4,repeat:Infinity,ease:'easeInOut'}}
            className="absolute right-0 card" style={{ top:40, right:-12, padding:'8px 12px', display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,0.6)', whiteSpace:'nowrap', borderRadius:8 }}>
            <CheckCircle size={13} style={{ color:'var(--success)' }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)' }}>Analysis complete</div>
              <div style={{ fontSize:10, color:'var(--fg-3)', fontFamily:'JetBrains Mono,monospace' }}>73s · 847 files</div>
            </div>
          </motion.div>
          <motion.div animate={{y:[0,6,0]}} transition={{duration:5,repeat:Infinity,ease:'easeInOut',delay:1}}
            className="absolute card" style={{ bottom:48, left:-8, padding:'8px 12px', display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,0.6)', whiteSpace:'nowrap', borderRadius:8 }}>
            <Download size={13} style={{ color:'var(--cyan)' }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)' }}>PDF ready</div>
              <div style={{ fontSize:10, color:'var(--fg-3)', fontFamily:'JetBrains Mono,monospace' }}>42 pages</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 divider"/>
    </section>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────
function TrustBar() {
  return (
    <div style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-1)', padding:'14px 0' }}>
      <div className="container-app flex items-center gap-8 flex-wrap">
        <span className="text-mono" style={{ fontSize:11, color:'var(--fg-4)', whiteSpace:'nowrap' }}>Analyzes projects built with</span>
        <div className="flex items-center gap-6 flex-wrap">
          {['Next.js','FastAPI','Django','Express','Rust','Go','Spring Boot','Rails','Laravel'].map(t=>(
            <span key={t} className="text-mono" style={{ fontSize:12, color:'var(--fg-4)', transition:'color .15s', cursor:'default' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--fg-2)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--fg-4)')}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  {icon:<Network size={16}/>, title:'Dependency Graph',    desc:'Interactive architecture maps from real AST parsing. Trace imports, services, and boundaries.'},
  {icon:<Lock size={16}/>,    title:'Security Analysis',   desc:'OWASP + CWE pattern scanning. Detects secrets, injection, path traversal, weak crypto.', tag:'Security'},
  {icon:<Eye size={16}/>,     title:'Interview Defense',   desc:'Q&A grounded in your codebase architecture. Not generic — references actual design choices.', tag:'Unique'},
  {icon:<Code2 size={16}/>,   title:'API Inventory',       desc:'Discovers endpoints, middleware, auth boundaries across FastAPI, Express, Django, Rails, and more.'},
  {icon:<BarChart3 size={16}/>,title:'Readiness Score',   desc:'0–100 across logging, error handling, observability, test coverage, and deployment config.'},
  {icon:<Download size={16}/>, title:'Export Engine',      desc:'PDF reports, PPTX slides, Markdown docs, HTML. Ready to share with your team or CTO.'},
  {icon:<GitBranch size={16}/>,title:'14+ Languages',     desc:'Python, TypeScript, Go, Rust, Java, Kotlin, C#, Ruby, PHP, Swift, Scala, Elixir, C/C++.'},
  {icon:<Shield size={16}/>,  title:'Anti-Hallucination', desc:'Every AI claim is cross-validated against parsed AST data. 98.3% accuracy. Fact-grounded.'},
];

function Features() {
  return (
    <section id="features" style={{ padding:'80px 0', borderBottom:'1px solid var(--border)' }}>
      <div className="container-app">
        <div style={{ marginBottom:48 }}>
          <p className="text-mono" style={{ fontSize:11, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Capabilities</p>
          <h2 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:700, letterSpacing:'-0.03em', color:'var(--fg)', maxWidth:480 }}>
            Everything you need to own any codebase.
          </h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'var(--border)', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
          {FEATURES.map((f,i)=>(
            <motion.div key={f.title}
              initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:i*0.05}}
              style={{ background:'var(--bg)', padding:'28px 24px', cursor:'default', transition:'background .15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-1)')}
              onMouseLeave={e=>(e.currentTarget.style.background='var(--bg)')}
            >
              {f.tag
                ? <span className="badge badge-cyan mb-4 block" style={{width:'fit-content'}}>{f.tag}</span>
                : <div style={{height:26,marginBottom:16}}/>}
              <div style={{ width:32, height:32, borderRadius:6, background:'var(--bg-2)', border:'1px solid var(--border-2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, color:'var(--fg-2)' }}>{f.icon}</div>
              <h3 style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:8 }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'var(--fg-3)', lineHeight:1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ────────────────────────────────────────────────────────────
const STEPS = [
  {n:'01', title:'Paste GitHub URL', desc:'Validates against an allowlist, DNS-resolves to block SSRF, shallow-clones into an isolated sandbox.', tag:'git clone --depth 1'},
  {n:'02', title:'AST Parsing',      desc:'Parses every source file with static AST analysis. Extracts imports, classes, routes, patterns. Nothing is executed.', tag:'Static analysis only'},
  {n:'03', title:'Graph Construction',desc:'Builds a directed dependency graph with graph theory algorithms. Scores node importance. Detects circular dependencies.', tag:'Graph theory · PageRank'},
  {n:'04', title:'AI Analysis',      desc:'Every claim is cross-validated against parsed AST. Hallucinations removed before the report is built.', tag:'Fact-grounded · 98.3% accuracy'},
  {n:'05', title:'Export & Share',   desc:'One-click PDF, PPTX, Markdown, or HTML. Workspace deleted immediately after. Report saved to account.', tag:'4 export formats'},
];

function HowItWorks() {
  return (
    <section style={{ padding:'80px 0', borderBottom:'1px solid var(--border)' }}>
      <div className="container-app grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <p className="text-mono" style={{ fontSize:11, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>How it works</p>
          <h2 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:700, letterSpacing:'-0.03em', color:'var(--fg)', marginBottom:20 }}>Real pipeline.<br/>Not a wrapper.</h2>
          <p style={{ fontSize:14, color:'var(--fg-2)', lineHeight:1.7, marginBottom:36 }}>
            Every architectural insight is cross-validated against actual parsed source code before reaching your report. No generic summaries. No hallucinations.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['&lt;90s','avg analysis time'],['98.3%','accuracy rate'],['14+','languages supported'],['0','lines executed']].map(([v,l])=>(
   