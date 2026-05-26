'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Github, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store';
import { api, ArchDefendAPI } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthShell({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px', opacity: 0.3,
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
      }}/>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 36, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color="#fff" strokeWidth={2.5}/>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.02em' }}>ArchDefend</span>
        </a>

        {/* Card */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border-2)',
          borderRadius: 12, padding: '28px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'var(--fg)', marginBottom: 4, letterSpacing: '-0.02em' }}>{title}</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>{sub}</p>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, marginBottom: 16 }}>
      <AlertCircle size={13} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }}/>
      <p style={{ fontSize: 12, color: 'var(--error)', lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6, letterSpacing: '0.02em' }}>{children}</label>;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { access_token, user } = await api.login(email, password);
      setToken(access_token); setUser(user);
      router.push('/dashboard');
    } catch (err) {
      setError(ArchDefendAPI.getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to continue to ArchDefend">
      <a href={api.getGitHubOAuthUrl()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 40, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-2)', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none', transition: 'all .15s', marginBottom: 20 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-3)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}>
        <Github size={15}/> Continue with GitHub
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'IBM Plex Mono, monospace' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      {error && <ErrorBox message={error}/>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Email</Label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com" className="input"/>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Label>Password</Label>
            <a href="#" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Forgot?</a>
          </div>
          <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••" className="input" style={{ paddingRight: 40 }}/>
            <button type="button" onClick={() => setShow(!show)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--fg-3)', padding: 0, cursor: 'pointer' }}>
              {show ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-md" style={{ width: '100%', marginTop: 4 }}>
          {loading ? <span className="spinner"/> : <>Sign in <ArrowRight size={13}/></>}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--fg-3)' }}>
        No account?{' '}
        <a href="/auth/signup" style={{ color: 'var(--accent)', fontWeight: 500 }}>Create one free</a>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { access_token, user } = await api.signup(email, password);
      setToken(access_token); setUser(user);
      router.push('/dashboard');
    } catch (err) {
      setError(ArchDefendAPI.getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create account" sub="Free tier includes 20 analysis credits">
      <a href={api.getGitHubOAuthUrl()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 40, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-2)', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none', transition: 'all .15s', marginBottom: 20 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-3)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}>
        <Github size={15}/> Continue with GitHub
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'IBM Plex Mono, monospace' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      {error && <ErrorBox message={error}/>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Email</Label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com" className="input"/>
        </div>
        <div>
          <Label>Password</Label>
          <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 8 characters" className="input" minLength={8} style={{ paddingRight: 40 }}/>
            <button type="button" onClick={() => setShow(!show)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--fg-3)', padding: 0, cursor: 'pointer' }}>
              {show ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-md" style={{ width: '100%', marginTop: 4 }}>
          {loading ? <span className="spinner"/> : <>Create account <ArrowRight size={13}/></>}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--fg-3)' }}>
        Already have an account?{' '}
        <a href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</a>
      </p>
      <p style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--fg-4)', lineHeight: 1.5 }}>
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthShell>
  );
}
