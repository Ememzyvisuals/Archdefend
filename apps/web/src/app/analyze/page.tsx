'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuthStore, useAnalysisStore } from '@/store';
import { toast } from 'sonner';
import { ArchDefendAPI } from '@/lib/api';

function AnalyzeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { startAnalysis } = useAnalysisStore();

  useEffect(() => {
    const repo = params.get('repo');

    // Not logged in — redirect to signup with repo in state
    if (!token) {
      router.replace(`/auth/signup?next=/analyze&repo=${encodeURIComponent(repo || '')}`);
      return;
    }

    if (!repo) {
      router.replace('/dashboard');
      return;
    }

    // Kick off analysis and route to dashboard
    startAnalysis(repo)
      .then(id => {
        toast.success('Analysis complete!');
        router.replace('/dashboard');
      })
      .catch(err => {
        toast.error(ArchDefendAPI.getErrorMessage(err));
        router.replace('/dashboard');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#06060A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
          style={{ width: 48, height: 48, border: '2px solid rgba(0,112,243,0.15)', borderTopColor: '#0070f3', borderRadius: '50%', margin: '0 auto 20px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0070f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={14} color="#06060A" strokeWidth={2.3} />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: '#EEEEF5' }}>ArchDefend</span>
        </div>
        <p style={{ fontSize: 14, color: '#5A5A72', fontFamily: 'JetBrains Mono, monospace' }}>
          {params.get('repo') ? `Cloning ${params.get('repo')?.split('/').slice(-2).join('/')}…` : 'Redirecting…'}
        </p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#06060A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(0,112,243,0.15)', borderTopColor: '#0070f3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <AnalyzeInner />
    </Suspense>
  );
}
