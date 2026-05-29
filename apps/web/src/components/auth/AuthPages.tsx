'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Github, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store';
import { api, ArchDefendAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

// ─── Shell ────────────────────────────────────────────────────────────────────

function AuthShell({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Subtle top border gradient */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}/>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={15} style={{ color: 'var(--bg)' }} strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>ArchDefend</span>
        </a>

        {/* Card */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)', marginBottom: 4 }}>{title}</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{sub}</p>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Error box ────────────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(220,0,0,0.06)', border: '1px solid rgba(220,0,0,0.2)', borderRadius: 6, marginBottom: 16 }}>
      <AlertCircle size={13} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }}/>
      <p style={{ fontSize: 12, color: 'var(--error)', lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

// ─── Login Page ────────────────────────────────────────────────────────────────

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
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        setError('Cannot connect to the server. Please try again in a moment.');
      } else {
        setError(ArchDefendAPI.getErrorMessage(err));
      }
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to your account to continue">
      {/* GitHub OAuth */}
      <a href={api.getGitHubOAuthUrl()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 36, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-2)', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none', transition: 'all .15s', marginBottom: 20 }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-2)')}>
        <Github size={15}/> Continue with GitHub
      </a>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      {error && <ErrorBox message={error}/>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com" className="input" style={{ width: '100%' }}/>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>Password</label>
            <a href="/auth/forgot" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Forgot?</a>
          </div>
          <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••" className="input" style={{ width: '100%', paddingRight: 36 }}/>
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
              {show ? <EyeOff size={13}/> : <Eye size={13}/>}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', height: 36, marginTop: 4, opacity: loading ? 0.6 : 1 }}>
          {loading
            ? <span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/>
            : <><span>Sign in</span><ArrowRight size={12}/></>}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-4)', marginTop: 20 }}>
        No account?{' '}
        <a href="/auth/signup" style={{ color: 'var(--fg-2)', textDecoration: 'none', fontWeight: 500 }}>Create one free</a>
      </p>
    </AuthShell>
  );
}

// ─── Signup Page ──────────────────────────────────────────────────────────────

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
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { access_token, user } = await api.signup(email, password);
      setToken(access_token); setUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        setError('Cannot connect to the server. Please try again in a moment.');
      } else {
        setError(ArchDefendAPI.getErrorMessage(err));
      }
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create your account" sub="Free forever · 20 credits · No credit card required">
      <a href={api.getGitHubOAuthUrl()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 36, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-2)', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none', transition: 'all .15s', marginBottom: 20 }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-2)')}>
        <Github size={15}/> Continue with GitHub
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      {error && <ErrorBox message={error}/>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com" className="input" style={{ width: '100%' }}/>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 6 }}>
            Password <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>— min. 8 characters</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••" className="input" style={{ width: '100%', paddingRight: 36 }}/>
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
              {show ? <EyeOff size={13}/> : <Eye size={13}/>}
            </button>
          </div>
          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 1, transition: 'all .3s', width: `${Math.min(100, (password.length / 16) * 100)}%`, background: password.length < 8 ? 'var(--error)' : password.length < 12 ? 'var(--warning)' : 'var(--success)' }}/>
              </div>
              <p style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
                {password.length < 8 ? 'Too short' : password.length < 12 ? 'Good' : 'Strong'}
              </p>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', height: 36, marginTop: 4, opacity: loading ? 0.6 : 1 }}>
          {loading
            ? <span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/>
            : <><span>Create account</span><ArrowRight size={12}/></>}
        </button>

        <p style={{ fontSize: 11, color: 'var(--fg-4)', textAlign: 'center', lineHeight: 1.5 }}>
          By signing up you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Privacy Policy</a>
        </p>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-4)', marginTop: 20 }}>
        Already have an account?{' '}
        <a href="/auth/login" style={{ color: 'var(--fg-2)', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
      </p>
    </AuthShell>
  );
}
