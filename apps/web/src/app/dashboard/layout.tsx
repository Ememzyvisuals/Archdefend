'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, setUser } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.replace('/auth/login?next=/dashboard');
      return;
    }
    // Validate token and refresh user data on mount
    if (!user) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          router.replace('/auth/login?reason=session_expired');
        });
    }
  }, [token]);

  // Show nothing while redirecting
  if (!token) return null;

  return <>{children}</>;
}
