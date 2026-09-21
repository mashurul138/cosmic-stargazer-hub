'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { supabase } from '@/lib/supabase';
import { signUpSchema } from '@/lib/validations/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'stargazer' | 'astronomer'>('stargazer');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);

    const validation = signUpSchema.safeParse({ email, password, role });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Please check your input.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: {
            role: validation.data.role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(
        'Your account has been created. Check your email to confirm your address before signing in.',
      );
      setPassword('');
    } catch {
      setError('Unable to create your account right now. Please try again.');
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
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Join the community and begin documenting the night sky.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          ) : null}

          {success ? (
            <div
              role="status"
              className="rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
            >
              {success}
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
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="At least 6 characters"
            />
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
              <option value="stargazer">Stargazer</option>
              <option value="astronomer">Astronomer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

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
