'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  Satellite,
  Maximize2,
  Users,
  Camera,
  Bot,
  Bell,
  Menu,
  X,
  Compass,
  Calendar,
  Layers,
  LogIn,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';
import { UserProfileDropdown } from '@/src/components/UserProfileDropdown';

interface AccountSummary {
  email: string;
  role: UserRole;
}

const PRIMARY_NAV_ITEMS = [
  { name: 'Dark Sky Map', href: '/map', icon: MapPin },
  { name: 'Satellites', href: '/satellites', icon: Satellite },
  { name: 'FOV Simulator', href: '/fov-simulator', icon: Maximize2 },
  { name: 'Star Parties', href: '/star-parties', icon: Users },
  { name: 'Photo Assessor', href: '/astrophotography-assessor', icon: Camera },
  { name: 'AI Guide', href: '/ai-guide', icon: Bot },
];

const SECONDARY_NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: Compass },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Equipment', href: '/equipment', icon: Layers },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      setIsLoading(true);
      try {
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
      } catch (err) {
        console.error('Failed to load user account:', err);
        if (isMounted) {
          setIsLoading(false);
        }
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

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAccount(null);
    router.replace('/login');
    router.refresh();
  }

  const allNavItems = [...SECONDARY_NAV_ITEMS, ...PRIMARY_NAV_ITEMS];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
          aria-label="Cosmic Hub Global Navigation"
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
                <span className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
              </div>
              <div className="flex flex-col">
                <span className="bg-gradient-to-r from-white via-sky-100 to-slate-200 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
                  Cosmic Hub
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-sky-400/80 -mt-1 hidden sm:block">
                  Stargazer Portal
                </span>
              </div>
            </Link>

            {/* Core Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3 py-1.5 text-xs xl:text-sm font-medium transition-colors duration-150 rounded-lg ${
                      isActive ? 'text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-active-indicator"
                        className="absolute inset-0 rounded-lg bg-sky-500/15 border border-sky-400/30 -z-10 shadow-sm shadow-sky-500/20"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Action Items & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Quick Nav Links */}
            <div className="hidden xl:flex items-center gap-1 border-r border-slate-800/80 pr-3 mr-1">
              <Link
                href="/dashboard"
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  pathname === '/dashboard' ? 'text-sky-300 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/events"
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  pathname === '/events' ? 'text-sky-300 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Events
              </Link>
            </div>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/60"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-sky-400 ring-2 ring-slate-950" />
            </Link>

            {/* User Account / Profile Dropdown */}
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-800" />
            ) : account ? (
              <UserProfileDropdown account={account} onSignOut={handleSignOut} />
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-950/50 hover:from-sky-400 hover:to-indigo-500 transition-all duration-200"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-over Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] glass-panel border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl z-50"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-white">Cosmic Hub</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav Links */}
                <div className="mt-6 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Celestial Features
                  </p>
                  {allNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-sky-500/20 text-white border border-sky-500/40'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-slate-800/80 pt-4">
                {account ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 px-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                        {account.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-200 truncate">{account.email}</p>
                        <p className="text-[10px] text-sky-400 capitalize">{account.role}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
