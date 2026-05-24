'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setSuccess('Check your email to confirm your account, then sign in.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#080B10' }}>
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      {/* Radial navy glow */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,25,55,0.5) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="leading-none mb-1" style={{ fontFamily: 'var(--font-cinzel)' }}>
            <span
              className="font-black uppercase"
              style={{
                fontSize: '1.6rem',
                letterSpacing: '0.28em',
                color: '#ffffff',
                textShadow: '0 0 32px rgba(0,212,255,0.5), 0 0 12px rgba(0,212,255,0.25)',
              }}
            >CTRL</span>
            <span
              className="font-normal uppercase"
              style={{
                fontSize: '1.6rem',
                letterSpacing: '0.2em',
                color: 'rgba(0,212,255,0.5)',
              }}
            >panel</span>
          </p>
          <a
            href="https://cwmccann.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="uppercase transition-all duration-200"
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '0.52rem',
              letterSpacing: '0.28em',
              color: 'rgba(0,212,255,0.25)',
              textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.25)')}
          >
            by cwmccann.pro
          </a>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 shadow-2xl" style={{ background: 'rgba(8,12,20,0.92)', border: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(20px)' }}>
          {/* Mode toggle */}
          <div className="flex rounded-lg p-1 mb-6" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.08)' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-md transition-all uppercase tracking-widest',
                )}
                style={mode === m ? {
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(0,212,255,0.08)',
                  color: 'rgba(0,212,255,0.9)',
                  border: '1px solid rgba(0,212,255,0.2)',
                } : {
                  fontFamily: 'var(--font-mono)',
                  color: 'rgba(160,175,200,0.35)',
                  border: '1px solid transparent',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'rgba(160,175,200,0.4)', letterSpacing: '0.16em' }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,212,255,0.12)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'rgba(160,175,200,0.4)', letterSpacing: '0.16em' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,212,255,0.12)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-zinc-600 text-[10px] mt-1">Minimum 6 characters</p>
              )}
            </div>

            {/* Error / Success */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                <p className="text-rose-400 text-xs">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <p className="text-emerald-400 text-xs">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: 'rgba(0,212,255,0.9)' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6 uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.2em', color: 'rgba(0,212,255,0.15)' }}>
          CTRLpanel — Private Access
        </p>
      </div>
    </div>
  );
}
