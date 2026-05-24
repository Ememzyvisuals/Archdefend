'use client';

import { Shield, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BillingCancelledPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg,#000)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>

        <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg-1,#0a0a0a)', border: '1px solid var(--border,#222)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Shield size={22} style={{ color: 'var(--fg-3,#666)' }}/>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg,#ededed)', marginBottom: 8 }}>
          Payment cancelled
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-3,#666)', lineHeight: 1.65, marginBottom: 32 }}>
          No charge was made. Your free credits are still available.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 6, background: 'var(--fg,#ededed)', color: 'var(--bg,#000)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            View plans <ArrowRight size={12}/>
          </a>
          <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 6, background: 'transparent', color: 'var(--fg-2,#a1a1a1)', fontSize: 13, textDecoration: 'none', border: '1px solid var(--border-3,#333)' }}>
            <ArrowLeft size={12}/> Dashboard
          </a>
        </div>
      </motion.div>
    </div>
  );
}
