'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, logout, refreshUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Zustand rehydrates token from localStorage but never calls api.setToken()
    // We must do it manually on every mount/reload
    if (!token) {
      router.replace('/auth/login?next=/dashboard');
      return;
    }

    api.setToken(token);

    // Validate token is still good
    refreshUser()
      .then(() => setReady(true))
      .catch(() => {
        logout();
        router.replace('/auth/login?reason=session_expired');
      });
  }, [token]);

  // Don't render children until we've validated the token
  if (!token || !ready) {
    return (
      <div style={{
        minHeight: '100vh', background: '#080808',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 24, height: 24,
          border: '2px solid #222',
          borderTopColor: '#0070f3',
          borderRadius: '50%',
          animation: 'spin .6s linear infinite',
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
