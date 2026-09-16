'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface NotificationSettings {
  user_id: string;
  discord_webhook: string | null;
  min_score_threshold: number;
  enabled: boolean;
  updated_at: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [threshold, setThreshold] = useState(80);
  const [enabled, setEnabled] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to manage notification settings.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/notifications', {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to load notification settings.');
      }

      const json = await res.json();
      const s: NotificationSettings = json.settings;

      setSettings(s);
      setWebhookUrl(s.discord_webhook ?? '');
      setThreshold(s.min_score_threshold);
      setEnabled(s.enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setError(null);

    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_webhook: webhookUrl || null,
          min_score_threshold: threshold,
          enabled,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to save settings.');
      }

      const json = await res.json();
      setSettings(json.settings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }

  async function handleTestWebhook() {
    if (!webhookUrl) {
      setTestResult('Please enter a Discord webhook URL first.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testPayload = {
        username: 'Cosmic Stargazer Hub',
        embeds: [
          {
            title: '🧪 Webhook Test — Connection Verified',
            description: 'Your Discord webhook is correctly configured for night sky digests!',
            color: 0x10b981,
            fields: [
              { name: '🔭 Status', value: '**Connected**', inline: true },
              { name: '📡 Channel', value: 'Receiving digests', inline: true },
            ],
            footer: { text: 'Cosmic Stargazer Hub • Test Notification' },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (res.ok) {
        setTestResult('✅ Test message sent successfully! Check your Discord channel.');
      } else {
        setTestResult(`❌ Discord responded with status ${res.status}. Verify your webhook URL.`);
      }
    } catch {
      setTestResult('❌ Failed to reach Discord. Check your webhook URL and try again.');
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            🔔 Notification Settings
          </h1>
          <p className="mt-2 text-slate-400">
            Configure automated Discord night sky digests. Receive personalized stargazing reports
            when conditions meet your quality threshold.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
            <span className="text-slate-400">Loading notification settings…</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-200">
            {error}
          </div>
        )}

        {/* Settings Form */}
        {!isLoading && settings && (
          <form onSubmit={handleSave} className="space-y-8">
            {/* Enable/Disable Toggle */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Discord Digests</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Enable automated night sky digest notifications
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ${
                    enabled ? 'bg-indigo-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Discord Webhook URL */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label htmlFor="webhook-url" className="block text-lg font-semibold text-white">
                Discord Webhook URL
              </label>
              <p className="mt-1 text-sm text-slate-400">
                Create a webhook in your Discord server settings → Integrations → Webhooks
              </p>
              <input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTesting || !webhookUrl}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isTesting ? 'Sending…' : '🧪 Test Webhook'}
                </button>
                {testResult && (
                  <span className="text-sm text-slate-300">{testResult}</span>
                )}
              </div>
            </div>

            {/* Score Threshold Slider */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label htmlFor="score-threshold" className="block text-lg font-semibold text-white">
                Minimum Stargazing Score
              </label>
              <p className="mt-1 text-sm text-slate-400">
                Only send digests when the stargazing visibility score meets or exceeds this threshold
              </p>
              <div className="mt-4 flex items-center gap-4">
                <input
                  id="score-threshold"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-indigo-500"
                />
                <span className="min-w-[4ch] text-right text-2xl font-bold tabular-nums text-indigo-300">
                  {threshold}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Always notify</span>
                <span>Excellent only</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saveStatus === 'saving'}
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveStatus === 'saving'
                  ? 'Saving…'
                  : saveStatus === 'saved'
                    ? '✓ Saved'
                    : 'Save Settings'}
              </button>
              {saveStatus === 'saved' && (
                <span className="text-sm text-emerald-400">
                  Settings saved successfully!
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-400">
                  Failed to save. Please try again.
                </span>
              )}
            </div>
          </form>
        )}

        {/* Info Card */}
        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            How It Works
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-indigo-400">1.</span>
              The system evaluates current weather and sky conditions hourly.
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400">2.</span>
              When the stargazing score meets your threshold, a rich embed digest is sent to your Discord channel.
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400">3.</span>
              Each digest includes the score, weather summary, top 3 observing targets, and upcoming community star parties.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
