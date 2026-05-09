'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import ThemeToggle from './ThemeToggle';
import PWAInstallButton from './PWAInstallButton';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      await storage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await storage.setItem('refreshToken', data.refreshToken);
      }
      // Small delay ensures IndexedDB writes flush on iOS before navigation
      await new Promise(r => setTimeout(r, 80));
      router.replace('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 lg:p-8 relative overflow-hidden
      bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100
      dark:from-[#0a0a1a] dark:via-[#0d1b3e] dark:to-[#0a0a1a]">

      {/* Decorative blur blobs */}
      <div className="absolute top-1/4 -left-40 w-80 h-80 rounded-full bg-apple-blue/30 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-80 h-80 rounded-full bg-apple-indigo/20 blur-[80px] pointer-events-none" />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* App icon + branding */}
        <div className="flex flex-col items-center animate-spring-in">
          <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-apple-blue to-apple-indigo shadow-apple-lg flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">Budget</h1>
          <p className="text-sm text-muted-foreground dark:text-white/60 mt-0.5">Personal Finance</p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-2xl p-7 shadow-apple-xl animate-spring-in" style={{ animationDelay: '0.08s' }}>
          <div className="text-center mb-6">
            <h2 className="text-[17px] font-semibold text-foreground">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isSignup ? 'Sign up to get started' : 'Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-apple-red text-sm font-medium flex items-center gap-2 animate-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-[50px] rounded-xl bg-secondary/60 border-0 px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 focus:ring-offset-0 transition-all duration-250"
              placeholder="Email"
              autoComplete="email"
            />

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-[50px] rounded-xl bg-secondary/60 border-0 px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 focus:ring-offset-0 transition-all duration-250"
              placeholder="Password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />

            <button
              type="submit"
              disabled={loading}
              className="press-effect w-full h-[50px] rounded-xl bg-apple-blue text-white font-semibold text-[15px] shadow-apple-md hover:bg-apple-blue/90 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Please wait
                </>
              ) : (
                isSignup ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="press-effect text-sm text-apple-blue font-medium transition-colors"
            >
              {isSignup
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground dark:text-white/30">
          &copy; {new Date().getFullYear()} Budget App · Enterprise Grade Security
        </p>
      </div>

      <PWAInstallButton />
    </div>
  );
}
