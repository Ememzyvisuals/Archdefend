'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  {iconName:'Network',   title:'Dependency Graph',    desc:'Interactive architecture maps from real AST parsing. Trace imports, services, and boundaries.'},
  {iconName:'Lock',      title:'Security Analysis',   desc:'OWASP + CWE pattern scanning. Detects secrets, injection, path traversal, weak crypto.', tag:'Security'},
  {iconName:'Eye',       title:'Interview Defense',   desc:'Q&A grounded in your codebase architecture. Not generic — references actual design choices.', tag:'Unique'},
  {iconName:'Code2',     title:'API Inventory',       desc:'Discovers endpoints, methods, auth schemes, and data shapes. No manual OpenAPI required.'},
  {iconName:'BarChart3', title:'Readiness Score',     desc:'0-100 across logging, error handling, test coverage, and scalability. Hard data, not vibes.'},
  {iconName:'Download',  title:'Export Engine',       desc:'PDF reports, PPTX decks, Markdown docs. Share the findings with anyone, instantly.'},
  {iconName:'GitBranch', title:'14+ Languages',       desc:'Python, TypeScript, Java, Go, Rust, Ruby, PHP, C#, C++, Kotlin, Scala, Swift, Dart, Elixir.'},
  {iconName:'Shield',    title:'Anti-Hallucination',  desc:'Every AI claim is cross-validated against AST facts. If it cannot verify it, it will not say it.'},
]

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
              <div style={{ width:32, height:32, borderRadius:6, background:'var(--bg-2)', border:'1px solid var(--border-2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, color:'var(--fg-2)' }}>{React.createElement(
                ({Network,Lock,Eye,Code2,BarChart3,Download,GitBranch,Shield} as any)[f.iconName] ?? Shield,
                {size:16}
              )}</div>
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
              <div key={l} style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:6, padding:'14px 16px' }}>
                <div className="text-mono" style={{ fontSize:22, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.03em' }} dangerouslySetInnerHTML={{__html:v}}/>
                <div style={{ fontSize:12, color:'var(--fg-3)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          {STEPS.map((s,i)=>(
            <motion.div key={s.n}
              initial={{opacity:0,x:12}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*0.08}}
              style={{ display:'grid', gridTemplateColumns:'44px 1fr' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--bg-1)', border:'1px solid var(--border-2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:600, color:'var(--fg-2)', flexShrink:0 }}>{s.n}</div>
                {i<STEPS.length-1&&<div style={{ flex:1, width:1, background:'var(--border)', margin:'6px 0' }}/>}
              </div>
              <div style={{ padding:'4px 0 36px 16px' }}>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:6 }}>{s.title}</h3>
                <p style={{ fontSize:13, color:'var(--fg-3)', lineHeight:1.65, marginBottom:8 }}>{s.desc}</p>
                <span className="text-mono badge badge-neutral" style={{ fontSize:10 }}>{s.tag}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────
const PLANS = [
  {id:'free', name:'Free', price:'$0', period:'', desc:'For individuals exploring', credits:'20 credits',
   features:['3 small repo analyses','Dependency graph','Architecture summary','PDF export only','7-day retention'], featured:false},
  {id:'pro',  name:'Pro',  price:'$19', period:'/mo', desc:'For developers and tech leads', credits:'250 credits',
   features:['Unlimited small repos','Full security scan','PDF + PPTX + Markdown','Interview defense pack','Scalability scores','90-day retention','Priority queue'], featured:true, badge:'Most popular'},
  {id:'team', name:'Team', price:'$79', period:'/mo', desc:'For engineering teams', credits:'1,200 credits',
   features:['Everything in Pro','Large repos (40cr)','Team workspace','API access','Unlimited retention','Priority support'], featured:false},
];

function Pricing() {
  return (
    <section id="pricing" style={{ padding:'80px 0', borderBottom:'1px solid var(--border)' }}>
      <div className="container-app">
        <div style={{ marginBottom:48 }}>
          <p className="text-mono" style={{ fontSize:11, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Pricing</p>
          <h2 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:700, letterSpacing:'-0.03em', color:'var(--fg)' }}>Start free. Scale when ready.</h2>
          <p style={{ fontSize:14, color:'var(--fg-3)', marginTop:10 }}>Credits never expire. Pay with crypto — Bitcoin, ETH, USDC, and 100+ more.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'var(--border)', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', marginBottom:40 }}>
          {PLANS.map((p,i)=>(
            <div key={p.id} style={{ background: p.featured?'var(--bg-1)':'var(--bg)', padding:'32px 28px', position:'relative', display:'flex', flexDirection:'column' }}>
              {p.badge&&<div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)' }}>
                <span style={{ background:'var(--fg)', color:'var(--bg)', fontSize:11, fontWeight:700, padding:'2px 12px', borderRadius:'0 0 6px 6px', whiteSpace:'nowrap' }}>{p.badge}</span>
              </div>}
              <div style={{ fontSize:12, fontWeight:600, color:'var(--fg-3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.name}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:2, marginBottom:4 }}>
                <span style={{ fontSize:40, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.04em', lineHeight:1 }}>{p.price}</span>
                <span style={{ fontSize:13, color:'var(--fg-3)' }}>{p.period}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--fg-3)', marginBottom:20 }}>{p.desc}</div>
              <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 14px', marginBottom:20 }}>
                <div className="text-mono" style={{ fontSize:13, fontWeight:600, color:'var(--cyan)' }}>{p.credits}</div>
                <div style={{ fontSize:11, color:'var(--fg-3)', marginTop:2 }}>per month</div>
              </div>
              <ul style={{ listStyle:'none', marginBottom:24, flex:1 }}>
                {p.features.map(f=>(
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--fg-3)', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                    <CheckCircle size={12} style={{ color:'var(--success)', flexShrink:0 }}/>{f}
                  </li>
                ))}
              </ul>
              <a href={p.id==='free'?'/auth/signup':`/pricing`}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:36, borderRadius:6, fontSize:13, fontWeight:600, textDecoration:'none', background:p.featured?'var(--fg)':'transparent', color:p.featured?'var(--bg)':'var(--fg-2)', border:p.featured?'none':'1px solid var(--border-3)', transition:'all .15s' }}
                onMouseEnter={e=>{if(!p.featured)(e.currentTarget as HTMLElement).style.background='var(--bg-2)';}}
                onMouseLeave={e=>{if(!p.featured)(e.currentTarget as HTMLElement).style.background='transparent';}}>
                {p.id==='free'?'Start free':`Get ${p.name}`}<ArrowRight size={12}/>
              </a>
            </div>
          ))}
        </div>

        {/* Credit table */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'var(--border)', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', maxWidth:560 }}>
          {[['small repo (≤50 files)','5 credits'],['medium repo (≤300 files)','15 credits'],['large repo (>300 files)','40 credits'],['pptx export','5 credits'],['security deep scan','15 credits'],['interview prep pack','5 credits']].map(([a,c])=>(
            <div key={a} style={{ background:'var(--bg)', padding:'10px 14px', display:'flex', justifyContent:'space-between', borderBottom:`1px solid var(--border)` }}>
              <span className="text-mono" style={{ fontSize:12, color:'var(--fg-3)' }}>$ {a}</span>
              <span className="text-mono" style={{ fontSize:12, color:'var(--cyan)', fontWeight:600 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────
const FAQS = [
  {q:'Does it execute cloned code?', a:'Never. Purely static analysis — reads and parses source files only. Repos run in isolated sandboxes with zero network access and no execution permissions. Workspace deleted immediately after analysis.'},
  {q:'Can I analyze private repos?', a:'Yes. Connect GitHub via OAuth. ArchDefend clones private repos you have access to. Tokens are never stored long-term beyond the active session.'},
  {q:'How accurate is the AI analysis?', a:'98.3% accuracy. Every AI claim is cross-validated against the parsed AST. Anything not evidenced in the actual source code is removed before the report is generated.'},
  {q:'Which languages are supported?', a:'Python, TypeScript, JavaScript, Go, Rust, Java, Kotlin, C#, Ruby, PHP, Swift, Scala, Elixir, and C/C++. 14 languages via AST grammar parsing.'},
  {q:'Can I pay with crypto?', a:'Yes. All payments via crypto — Bitcoin, Ethereum, USDC, BNB, and 100+ currencies. Credits never expire and carry over month to month.'},
  {q:'Is self-hosting available?', a:'Fully. Ships with Docker Compose, Nginx, Alembic migrations, and a complete setup guide. Runs on a $6/month VPS.'},
];

function FAQ() {
  const [open, setOpen] = useState<number|null>(null);
  return (
    <section id="docs" style={{ padding:'80px 0', borderBottom:'1px solid var(--border)' }}>
      <div className="container-app" style={{ maxWidth:720 }}>
        <div style={{ marginBottom:40 }}>
          <p className="text-mono" style={{ fontSize:11, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>FAQ</p>
          <h2 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:700, letterSpacing:'-0.03em', color:'var(--fg)' }}>Common questions.</h2>
        </div>
        {FAQS.map((f,i)=>(
          <div key={i} style={{ borderBottom:'1px solid var(--border)' }}>
            <button onClick={()=>setOpen(open===i?null:i)}
              style={{ width:'100%', background:'none', border:'none', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, cursor:'pointer', textAlign:'left', padding:'18px 0' }}>
              <span style={{ fontSize:14, fontWeight:600, color: open===i?'var(--fg)':'var(--fg-2)', transition:'color .15s' }}>{f.q}</span>
              <motion.div animate={{rotate:open===i?180:0}} transition={{duration:0.2}} style={{ flexShrink:0, color:'var(--fg-3)', marginTop:1 }}>
                <ChevronDown size={15}/>
              </motion.div>
            </button>
            <AnimatePresence>
              {open===i&&<motion.p initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}}
                style={{ fontSize:13, color:'var(--fg-3)', lineHeight:1.7, paddingBottom:18, overflow:'hidden' }}>{f.a}</motion.p>}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding:'80px 0', borderBottom:'1px solid var(--border)' }}>
      <div className="container-app" style={{ maxWidth:600, textAlign:'center' }}>
        <motion.div initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}}>
          <div style={{ width:48, height:48, borderRadius:10, background:'var(--bg-1)', border:'1px solid var(--border-2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
            <Shield size={22} style={{ color:'var(--fg-2)' }}/>
          </div>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:700, letterSpacing:'-0.035em', color:'var(--fg)', marginBottom:14 }}>
            Start analyzing for free.
          </h2>
          <p style={{ fontSize:15, color:'var(--fg-3)', marginBottom:32, lineHeight:1.65 }}>
            Paste any GitHub URL. Enterprise-grade architectural intelligence in 90 seconds. No credit card required.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <a href="/auth/signup" className="btn btn-primary btn-lg">Get started free <ArrowRight size={14}/></a>
            <a href="https://github.com/ememzyvisuals" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg"><Github size={14}/> GitHub</a>
          </div>
          <p style={{ fontSize:12, color:'var(--fg-4)', marginTop:20 }}>Free tier · 20 credits · No expiry</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  const col = (title: string, links: [string, string, boolean?][]) => (
    <div>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--fg-2)', marginBottom:12 }}>{title}</p>
      <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
        {links.map(([l,h,ext])=>(
          <li key={l}><a href={h} target={ext?'_blank':undefined} rel={ext?'noopener noreferrer':undefined}
            style={{ fontSize:13, color:'var(--fg-3)', transition:'color .15s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='var(--fg)')}
            onMouseLeave={e=>(e.currentTarget.style.color='var(--fg-3)')}>{l}</a></li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer style={{ padding:'48px 0 32px' }}>
      <div className="container-app">
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:40 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:24, height:24, borderRadius:4, background:'var(--fg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Shield size={13} style={{ color:'var(--bg)' }} strokeWidth={2.5}/>
              </div>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>ArchDefend</span>
            </div>
            <p style={{ fontSize:13, color:'var(--fg-3)', lineHeight:1.65, maxWidth:240, marginBottom:12 }}>Enterprise AI codebase intelligence. Understand any repository in 90 seconds.</p>
            <p style={{ fontSize:12, color:'var(--fg-4)' }}>By <a href="https://github.com/ememzyvisuals" target="_blank" rel="noopener noreferrer" style={{ color:'var(--fg-3)', textDecoration:'none' }}>EMEMZYVISUALS DIGITALS</a></p>
          </div>
          {col('Product', [['Features','#features'],['Pricing','#pricing'],['Changelog','/changelog'],['Status','/status']])}
          {col('Resources', [['Docs','/docs'],['API Reference','/docs/api'],['Self-hosting','/docs/self-hosting'],['Security','/security']])}
          {col('Connect', [['GitHub','https://github.com/ememzyvisuals',true],['X / Twitter','https://x.com/ememzyvisuals',true],['Kaggle','https://www.kaggle.com/ememzyvisuals',true]])}
        </div>
        <div className="divider" style={{ marginBottom:24 }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:12, color:'var(--fg-4)' }}>© {new Date().getFullYear()} EMEMZYVISUALS DIGITALS.</p>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <a href="/privacy" style={{ fontSize:12, color:'var(--fg-4)', textDecoration:'none' }}>Privacy</a>
            <a href="/terms"   style={{ fontSize:12, color:'var(--fg-4)', textDecoration:'none' }}>Terms</a>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span className="status-dot status-dot-live"/>
              <span style={{ fontSize:12, color:'var(--fg-4)' }}>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Navbar/>
      <Hero/>
      <TrustBar/>
      <Features/>
      <HowItWorks/>
      <Pricing/>
      <FAQ/>
      <CTA/>
      <Footer/>
    </>
  );
}
