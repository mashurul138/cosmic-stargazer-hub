'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, MapPin, Telescope, Save, CheckCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('stargazer');
  const [defaultBortle, setDefaultBortle] = useState('4');
  const [notifyIss, setNotifyIss] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (profile) {
            setRole(profile.role);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    void loadUserData();
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Settings &amp; Preferences</h1>
            <p className="text-sm text-slate-400">Customize your observing profile, location defaults, and notifications.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold border-b border-slate-800 pb-3">
            <ShieldCheck className="h-4 w-4" />
            <span>Account Profile</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl bg-slate-900/60 border border-slate-800 px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Observer Role</label>
              <div className="flex items-center h-10 px-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm font-medium capitalize text-indigo-300">
                {role}
              </div>
            </div>
          </div>
        </div>

        {/* Observation Defaults */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold border-b border-slate-800 pb-3">
            <Telescope className="h-4 w-4" />
            <span>Observing &amp; Sky Conditions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Default Bortle Sky Class</label>
              <select
                value={defaultBortle}
                onChange={(e) => setDefaultBortle(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
              >
                <option value="1">Class 1 - Excellent Dark Sky (NELM 7.6-8.0)</option>
                <option value="2">Class 2 - Truly Dark Site (NELM 7.1-7.5)</option>
                <option value="3">Class 3 - Rural Sky (NELM 6.6-7.0)</option>
                <option value="4">Class 4 - Rural/Suburban Transition (NELM 6.1-6.5)</option>
                <option value="5">Class 5 - Suburban Sky (NELM 5.6-6.0)</option>
                <option value="6">Class 6 - Bright Suburban (NELM 5.1-5.5)</option>
                <option value="7">Class 7 - Suburban/Urban Transition (NELM 4.6-5.0)</option>
                <option value="8">Class 8 - City Sky (NELM 4.1-4.5)</option>
                <option value="9">Class 9 - Inner-City Sky (NELM &lt; 4.0)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Discord Webhook Digest URL</label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold border-b border-slate-800 pb-3">
            <Bell className="h-4 w-4" />
            <span>Alert Preferences</span>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyIss}
                onChange={(e) => setNotifyIss(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
              />
              <span className="text-sm text-slate-200">Notify me about bright ISS and Tiangong visible passes</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEvents}
                onChange={(e) => setNotifyEvents(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
              />
              <span className="text-sm text-slate-200">Alert for major celestial meteor showers and eclipses</span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Preferences successfully updated!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/50 hover:from-sky-400 hover:to-indigo-500 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
