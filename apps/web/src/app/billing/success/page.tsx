'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Shield, Zap, Download, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';

const PLAN_DATA: Record<string, { name: string; credits: number; color: string }> = {
  pro:  { name: 'Pro',  credits: 250,  color: '#00b341' },
  team: { name: 'Team', credits: 1200, color: '#a1a1a1' },
};

function SuccessContent() {
  const params = useSearchParams();
  const { user, refreshUser } = useAuthStore();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const plan = params.get('plan') || 'pro';
  const planInfo = PLAN_DATA[plan] ?? PLAN_DATA.pro;

  useEffect(() => {
    // Poll user credits until they update (IPN webhook might arrive with a short delay)
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 60 seconds

    const poll = async () => {
      try {
        const data = await api.getCredits();
        setCredits(data.credits);
        setPollCount(prev => prev + 1);
        attempts++;

        // Stop polling if credits increased OR max attempts reached
        if (attempts >= MAX_ATTEMPTS) {
          setLoading(false);
          return;
        }

        // Check if plan updated
        if (data.plan === plan || data.plan !== 'free') {
          setLoading(false);
          await refreshUser();
          return;
        }

        // Keep polling every 2 seconds
        setTimeout(poll, 2000);
      } catch {
        setLoading(false);
      }
    };

    poll();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#06060A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #06060A; }
      `}</style>

      {/* Radial glow */}
      <div style={{ position: 'fixed', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
          style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 0 60px rgba(16,185,129,0.15)' }}
        >
          <CheckCircle size={36} color="#10B981" />
        </motion.div>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 100, padding: '5px 14px', fontSize: 11, fontWeight: 600, color: '#10B981', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)', display: 'inline-block' }} />
            Payment confirmed
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#EEEEF5', lineHeight: 1.08, marginBottom: 16 }}
        >
          Welcome to<br/>
          <span style={{ color: planInfo.color }}>ArchDefend {planInfo.name}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ fontSize: 16, color: '#5A5A72', lineHeight: 1.7, marginBottom: 40 }}
        >
          Your payment is being processed on the blockchain.
          Credits will appear in your account within a few minutes.
        </motion.p>

        {/* Credit status card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ background: '#0C0C12', border: '1px solid #1A1A26', borderRadius: 16, padding: '28px 32px', marginBottom: 32 }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                style={{ width: 20, height: 20, border: '2px solid rgba(0,112,243,0.2)', borderTopColor: '#0070f3', borderRadius: '50%' }} />
              <span style={{ fontSize: 14, color: '#5A5A72', fontFamily: 'JetBrains Mono, monospace' }}>
                Waiting for blockchain confirmation{'.'.repeat((pollCount % 3) + 1)}
              </span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#5A5A72', fontFamily: 'JetBrains Mono, monospace' }}>Plan</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: planInfo.color, fontFamily: 'JetBrains Mono, monospace' }}>ArchDefend {planInfo.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#5A5A72', fontFamily: 'JetBrains Mono, monospace' }}>Credits</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#00b341', fontFamily: 'JetBrains Mono, monospace' }}>
                  {credits !== null ? credits : planInfo.credits} credits
                </span>
              </div>
              <div style={{ height: 1, background: '#1A1A26', marginBottom: 16 }} />
              <div style={{ fontSize: 11, color: '#404058', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
                Renews in 30 days · Cancel anytime from dashboard
              </div>
            </div>
          )}
        </motion.div>

        {/* What's included */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 36 }}
        >
          {[
            { icon: <Zap size={15} />, label: `${planInfo.credits} credits`, color: '#00b341' },
            { icon: <BarChart3 size={15} />, label: 'Full analysis suite', color: '#a1a1a1' },
            { icon: <Download size={15} />, label: 'PDF + PPTX exports', color: '#F59E0B' },
            { icon: <Shield size={15} />, label: 'Security scan', color: '#10B981' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#0C0C12', border: '1px solid #1A1A26', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: '#EEEEF5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{ display: 'flex', gap: 12 }}
        >
          <a href="/dashboard"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px', borderRadius: 10, background: '#0070f3', color: '#06060A', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Go to Dashboard <ArrowRight size={14} />
          </a>
          <a href="/dashboard?tab=analyze"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px', borderRadius: 10, background: 'transparent', color: '#9090A8', fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid #1A1A26', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Start analyzing
          </a>
        </motion.div>

        {/* Footer note */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ fontSize: 12, color: '#303048', marginTop: 24, fontFamily: 'JetBrains Mono, monospace' }}
        >
          Questions? Email{' '}
          <a href="mailto:support@archdefend.io" style={{ color: '#404058', textDecoration: 'none' }}>
            support@archdefend.io
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#06060A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(0,112,243,0.15)', borderTopColor: '#0070f3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
