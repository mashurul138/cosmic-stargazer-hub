'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, AlertCircle, X } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { loginSchema } from '@/lib/validations/auth';
import { mapAuthError } from '@/lib/utils/authErrors';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(mapAuthError(urlError));
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    // Route authenticated users visiting login straight to /dashboard
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted && user) {
        router.push('/dashboard');
      }
    });

    // Fallback listener for auth state changes to route authenticated users straight to /dashboard
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted && session?.user) {
        router.push('/dashboard');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side pre-validation
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    const validation = loginSchema.safeParse({ email: trimmedEmail, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Please check your input.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (signInError) {
        setError(mapAuthError(signInError));
        return;
      }

      if (data?.session) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-8"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/40 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Cosmic Event &amp; Stargazer Hub
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to continue your celestial observations.
        </p>

        <div className="mt-8">
          <OAuthButtons onError={(err) => setError(err)} disabled={isLoading} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-400">
                Or continue with email
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div
                role="alert"
                className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="leading-relaxed text-xs sm:text-sm">{error}</p>
                    {error.includes('Incorrect email or password') ? (
                      <p className="text-xs text-rose-300/80">
                        Need a new account instead?{' '}
                        <Link href="/signup" className="underline font-semibold hover:text-white">
                          Create one here
                        </Link>
                        .
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="rounded-lg p-1 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 pl-3 pr-10 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          New to the hub?{' '}
          <Link href="/signup" className="font-semibold text-indigo-300 hover:text-indigo-200">
            Create an account
          </Link>
        </p>
      </section>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center text-slate-400">
            Loading...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
