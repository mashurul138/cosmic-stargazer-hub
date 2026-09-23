'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, AlertCircle, X, Mail, ArrowRight } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { signUpSchema } from '@/lib/validations/auth';
import { mapAuthError } from '@/lib/utils/authErrors';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'stargazer' | 'astronomer'>('stargazer');
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Route authenticated users visiting signup straight to /dashboard
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted && user) {
        router.push('/dashboard');
      }
    });

    // Fallback listener for auth state changes
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
      setError('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    const validation = signUpSchema.safeParse({ email: trimmedEmail, password, role });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Please check your input.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: {
            role: validation.data.role,
          },
        },
      });

      if (signUpError) {
        setError(mapAuthError(signUpError));
        return;
      }

      // Check if session exists (email confirmation disabled in Supabase config)
      if (data.session) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // If user was created but session is null, email confirmation is required
      if (data.user) {
        setSubmittedEmail(validation.data.email);
        setPassword('');
        return;
      }

      // Fallback redirect if session was automatically established
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
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Create your account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Join the community and begin documenting the night sky.
        </p>

        {submittedEmail ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Mail className="h-7 w-7 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Check your inbox!</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="font-semibold text-emerald-300">{submittedEmail}</span>.
              </p>
              <p className="text-xs text-slate-400">
                Please click the link in that email to confirm your address and activate your account.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
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
                  <span className="leading-relaxed text-xs sm:text-sm">{error}</span>
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 pl-3 pr-10 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="At least 6 characters"
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

            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-200">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as 'stargazer' | 'astronomer')
                }
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="stargazer">Stargazer (Community Observer)</option>
                <option value="astronomer">Astronomer (Researcher / Verified)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">
            Sign in
          </Link>
        </p>
      </section>
    </motion.div>
  );
}
