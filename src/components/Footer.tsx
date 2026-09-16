'use client';

import Link from 'next/link';
import { Sparkles, ArrowUp, Compass, Telescope, MapPin, Satellite, Maximize2, Camera, Bot, Calendar, Bell, Users, Settings } from 'lucide-react';

export function Footer() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-sm text-slate-400 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Status */}
          <div className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 group w-fit">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-white via-sky-100 to-slate-200 bg-clip-text text-base font-extrabold text-transparent">
                Cosmic Hub
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400">
              Next-generation astronomical portal with real-time satellite tracking, dark sky light pollution maps, FOV simulation, and AI astrophotography tools.
            </p>
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>All Celestial APIs Operational</span>
            </div>
          </div>

          {/* Col 2: Observation Workspace */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Observation Workspace
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/observations"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Telescope className="h-3.5 w-3.5 text-sky-400" />
                  <span>Observation Log Book</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/equipment"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Compass className="h-3.5 w-3.5 text-sky-400" />
                  <span>Optical Equipment Manager</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Calendar className="h-3.5 w-3.5 text-sky-400" />
                  <span>Saved Astronomical Events</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <span>Stargazer Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Advanced Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Advanced Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/map"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <MapPin className="h-3.5 w-3.5 text-sky-400" />
                  <span>Dark Sky &amp; Bortle Map</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/satellites"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Satellite className="h-3.5 w-3.5 text-sky-400" />
                  <span>ISS &amp; Satellite Tracker</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/fov-simulator"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Field of View (FOV) Simulator</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/astrophotography-assessor"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Camera className="h-3.5 w-3.5 text-sky-400" />
                  <span>AI Astrophotography Assessor</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Account & Community */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Account &amp; Community
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/settings"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Settings className="h-3.5 w-3.5 text-sky-400" />
                  <span>Settings &amp; Observer Profile</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/notifications"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Bell className="h-3.5 w-3.5 text-sky-400" />
                  <span>Discord Sky Digests</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/star-parties"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span>Community Star Parties</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ai-guide"
                  className="hover:text-sky-300 transition-colors flex items-center gap-2"
                >
                  <Bot className="h-3.5 w-3.5 text-sky-400" />
                  <span>Interactive AI Guide</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-500">
            &copy; {new Date().getFullYear()} Cosmic Event &amp; Stargazer Hub. Built for clear skies and curious minds.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <span>Back to Top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
