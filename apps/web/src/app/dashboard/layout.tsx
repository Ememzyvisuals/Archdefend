'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, refreshUser, logout } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.replace('/auth/login?next=/dashboard');
      return;
    }
    // CRITICAL: re-inject token into api client on every mount/reload
    // Zustand rehydrates the token value from localStorage but doesn't
    // re-run the setToken action, so api.setToken() was never called.
    api.setToken(token);

    // Validate token is still good and get fresh user data
    refreshUser().catch(() => {
      logout();
    });
  }, [token]);

  if (!token) return null;

  return <>{children}</>;
}
