'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error('GitHub authentication failed. Please try again.');
      router.replace('/auth/login');
      return;
    }

    if (token) {
      setToken(token);
      // Fetch user data
      api.getMe().then(user => {
        setUser(user);
        toast.success('Signed in with GitHub!');
        router.replace('/dashboard');
      }).catch(() => {
        toast.error('Failed to load user profile. Please try again.');
        router.replace('/auth/login');
      });
    } else {
      router.replace('/auth/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-12 h-12 border-2 border-border border-t-accent rounded-full mx-auto mb-4"
        />
        <p className="text-text-secondary text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}
