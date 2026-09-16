'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

type AccountSummary = {
  email: string;
  role: UserRole;
};

export function Navbar() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setAccount(null);
          setIsLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', user.id)
        .maybeSingle();

      if (isMounted) {
        setAccount(
          profile
            ? { email: profile.email, role: profile.role as UserRole }
            : {
                email: user.email ?? 'Unknown email',
                role: 'stargazer',
              },
        );
        setIsLoading(false);
      }
    }

    void loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAccount();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100">
      <nav
        className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        aria-label="Main navigation"
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-white">
            Cosmic Stargazer Hub
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
            <Link href="/dashboard" className="transition hover:text-white">
              Dashboard
            </Link>
            <Link href="/events" className="transition hover:text-white">
              Events
            </Link>
            {account?.role === 'astronomer' ? (
              <Link href="/admin" className="transition hover:text-white">
                Admin
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {isLoading ? (
            <span className="text-slate-400">Loading account…</span>
          ) : account ? (
            <>
              <span className="max-w-48 truncate text-slate-300" title={account.email}>
                {account.email}
              </span>
              <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-200">
                {account.role}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-md border border-slate-600 px-3 py-1.5 font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
