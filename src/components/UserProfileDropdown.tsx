'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Settings, LogOut, Telescope, Sparkles, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

interface UserProfileDropdownProps {
  account: {
    email: string;
    role: UserRole | string;
  };
  onSignOut?: () => Promise<void> | void;
}

export function UserProfileDropdown({ account, onSignOut }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
      } else {
        await supabase.auth.signOut();
        router.replace('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  }

  const initialLetter = account.email.charAt(0).toUpperCase();

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Clean Circular Avatar Trigger Button */}
      <button
        type="button"
        id="user-profile-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-sky-500/30 hover:ring-sky-400 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
        title={account.email}
      >
        <span>{initialLetter}</span>
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl glass-panel p-2 shadow-2xl z-50 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-profile-menu-button"
          >
            {/* Header Badge Card */}
            <div className="border-b border-slate-800/90 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate" title={account.email}>
                    {account.email}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium capitalize text-indigo-300 border border-indigo-500/30">
                      {account.role}
                    </span>
                    <span className="text-[10px] text-slate-400">Sky Stargazer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/observations"
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                role="menuitem"
              >
                <Telescope className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-white">My Observations</p>
                  <p className="text-[10px] text-slate-400">Recorded celestial targets</p>
                </div>
              </Link>

              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                role="menuitem"
              >
                <Settings className="h-4 w-4 text-slate-400 group-hover:text-sky-400 group-hover:rotate-45 transition-all" />
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-white">Settings &amp; Profile</p>
                  <p className="text-[10px] text-slate-400">Telescope and alert preferences</p>
                </div>
              </Link>
            </div>

            {/* Sign Out Action */}
            <div className="border-t border-slate-800/80 pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-rose-300/90 hover:bg-rose-500/10 hover:text-rose-200 transition-colors disabled:opacity-50"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <span>{isSigningOut ? 'Signing out…' : 'Sign Out'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
