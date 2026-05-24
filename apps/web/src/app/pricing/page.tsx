'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, CheckCircle, Zap } from 'lucide-react';
import { useAuthStore } from '@/store';
import { api, ArchDefendAPI } from '@/lib/api';
import { toast } from 'sonner';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', period: '', credits: '20 credits', desc: 'For individuals exploring', cta: 'Start free',
    features: ['3 small repo analyses','Dependency graph','Architecture summary','PDF export','7-day retention'] },
  { id: 'pro', name: 'Pro', price: '$19', period: '/mo', credits: '250 credits', desc: 'For developers and tech leads', cta: 'Get Pro', featured: true, badge: 'Most popular',
    features: ['Unlimited small repos','Full security scan','PDF + PPTX + Markdown','Interview defense pack','Scalability scores','90-day retention','Priority queue'] },
  { id: 'team', name: 'Team', price: '$79', period: '/mo', credits: '1,200 credits', desc: 'For engineering teams', cta: 'Get Team',
    features: ['Everything in Pro','Large repos (40cr)','Team workspace','API access','Unlimited retention','Priority support'] },
] as const;

const COSTS = [
  ['small repo (≤50 files)','5cr'],['medium repo (≤300 files)','15cr'],
  ['large repo (>300 files)','40cr'],['pptx export','5cr'],
  ['security deep scan','15cr'],['interview prep','5cr'],
];

export default function PricingPage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState<string|null>(null);

  const checkout = async (planId: string) => {
    if (planId === 'free') { window.location.href = '/auth/signup'; return; }
    if (!token) { window.location.href = '/auth/signup?next=/pricing'; return; }
    setLoading(planId);
    try {
      const { invoice_url } = await api.createCheckout(planId);
      window.location.href = invoice_url;
    } catch (err) {
      toast.error(ArchDefendAPI.getErrorMessage(err));
    } finally { setLoading(null); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg,#000)', color: 'var(--fg,#ededed)' }}>
      {/* Nav */}
      <div style={{ height: 48, borderBottom: '1px solid var(--border,#222)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: 'var(--fg,#ededed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={13} style={{ color: 'var(--bg,#000)' }} strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg,#ededed)' }}>ArchDefend</span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {token ? <a href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: 'var(--bg,#000)', background: 'var(--fg,#ededed)', padding: '6px 16px', borderRadius: 6, textDecoration: 'none' }}>Dashboard</a>
                 : <><a href="/auth/login" style={{ fontSize: 13, color: 'var(--fg-3,#666)', textDecoration: 'none', padding: '6px 12px' }}>Log in</a>
                    <a href="/auth/signup" style={{ fontSize: 13, fontWeight: 600, color: 'var(--bg,#000)', background: 'var(--fg,#ededed)', padding: '6px 16px', borderRadius: 6, textDecoration: 'none' }}>Sign up</a></>}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4,#444)', fontFamily: 'JetBrains Mono,monospace', marginBottom: 12 }}>Pricing</p>
          <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg,#ededed)', marginBottom: 12 }}>Start free. Scale when ready.</h1>
          <p style={{ fontSize: 14, color: 'var(--fg-3,#666)' }}>Credits never expire · Pay with crypto · Cancel anytime</p>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border,#222)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border,#222)', marginBottom: 48 }}>
          {PLANS.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: (p as any).featured ? 'var(--bg-1,#0a0a0a)' : 'var(--bg,#000)', padding: '32px 28px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {(p as any).badge && (
                <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)' }}>
                  <span style={{ background: 'var(--fg,#ededed)', color: 'var(--bg,#000)', fontSize: 10, fontWeight: 700, padding: '2px 12px', borderRadius: '0 0 6px 6px' }}>{(p as any).badge}</span>
                </div>
              )}
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3,#666)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{p.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--fg,#ededed)', lineHeight: 1 }}>{p.price}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-3,#666)' }}>{p.period}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-3,#666)', marginBottom: 20 }}>{p.desc}</p>
              <div style={{ background: 'var(--bg-2,#111)', border: '1px solid var(--border,#222)', borderRadius: 6, padding: '10px 14px', marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#00b341', fontFamily: 'JetBrains Mono,monospace' }}>{p.credits}</p>
                <p style={{ fontSize: 11, color: 'var(--fg-4,#444)' }}>per month, never expire</p>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-3,#666)', padding: '7px 0', borderBottom: '1px solid var(--border,#222)' }}>
                    <CheckCircle size={12} style={{ color: 'var(--success,#00b341)', flexShrink: 0 }}/>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => checkout(p.id)} disabled={loading === p.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 16px', height: 36, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading === p.id ? 'not-allowed' : 'pointer', transition: 'all .15s', opacity: loading === p.id ? 0.6 : 1, background: (p as any).featured ? 'var(--fg,#ededed)' : 'transparent', color: (p as any).featured ? 'var(--bg,#000)' : 'var(--fg-2,#a1a1a1)', border: (p as any).featured ? 'none' : '1px solid var(--border-3,#333)', width: '100%' }}>
                {loading === p.id ? <span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: (p as any).featured ? 'var(--bg,#000)' : 'var(--fg,#ededed)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/> : <>{p.cta}<ArrowRight size={12}/></>}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Credit table + FAQ split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: 'var(--bg-1,#0a0a0a)', border: '1px solid var(--border,#222)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border,#222)', display: 'flex', gap: 6 }}>
              {['#ff5f56','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }}/>)}
              <span style={{ fontSize: 11, color: 'var(--fg-4,#444)', fontFamily: 'JetBrains Mono,monospace', marginLeft: 6 }}>credit_costs.json</span>
            </div>
            {COSTS.map(([a,c]) => (
              <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid var(--border,#222)', fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>
                <span style={{ color: 'var(--fg-3,#666)' }}>$ {a}</span>
                <span style={{ color: '#00b341', fontWeight: 600 }}>{c}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            {[
              ['Do credits expire?','No. Credits never expire and carry over month to month.'],
              ['Which cryptos are accepted?','Bitcoin, ETH, USDC, BNB and 100+ crypto currencies.'],
              ['Can I cancel anytime?','Yes. Cancel from your dashboard instantly. Keep your credits.'],
              ['Is self-hosting available?','Yes. Docker Compose + full setup guide in the repository.'],
            ].map(([q,a]) => (
              <div key={q} style={{ padding: '14px 0', borderBottom: '1px solid var(--border,#222)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg,#ededed)', marginBottom: 4 }}>{q}</p>
                <p style={{ fontSize: 13, color: 'var(--fg-3,#666)' }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '64px 0 0' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-1,#0a0a0a)', border: '1px solid var(--border-2,#2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Zap size={18} style={{ color: 'var(--fg-2,#a1a1a1)' }}/>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg,#ededed)', marginBottom: 12 }}>Start with 20 free credits.</h2>
          <p style={{ fontSize: 14, color: 'var(--fg-3,#666)', marginBottom: 28 }}>No credit card. No time limit. Paste a URL, get intelligence.</p>
          <a href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 24px', borderRadius: 6, background: 'var(--fg,#ededed)', color: 'var(--bg,#000)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Get started free <ArrowRight size={13}/>
          </a>
        </div>
      </div>
    </div>
  );
}
