'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Navbar } from '@/components/Navbar';
import type { NASAApodResponse } from '@/lib/api/nasa';
import type { StargazingWeather } from '@/lib/api/weather';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

type DashboardData = {
  apod: NASAApodResponse;
  weather: StargazingWeather;
};

type Account = {
  email: string;
  role: UserRole;
};

const DASHBOARD_LOAD_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, DASHBOARD_LOAD_TIMEOUT_MS);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading dashboard">
      <div className="h-28 rounded-2xl bg-slate-800" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-[32rem] rounded-2xl bg-slate-800 lg:col-span-3" />
        <div className="h-[32rem] rounded-2xl bg-slate-800 lg:col-span-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 rounded-2xl bg-slate-800" />
        <div className="h-32 rounded-2xl bg-slate-800" />
      </div>
    </div>
  );
}

function WeatherMetric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold text-white">
        {Math.round(value).toLocaleString()}
        <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>
      </dd>
    </div>
  );
}

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [userResult, spaceDataResponse] = await withTimeout(
        Promise.all([supabase.auth.getUser(), fetch('/api/space-data')]),
        'Dashboard loading timed out. Please refresh and try again.',
      );

      if (userResult.error || !userResult.data.user) {
        throw new Error('Your session could not be verified. Please sign in again.');
      }

      if (!spaceDataResponse.ok) {
        const responseBody = (await spaceDataResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(responseBody?.error ?? 'Unable to load dashboard data.');
      }

      const data = (await spaceDataResponse.json()) as DashboardData;
      const user = userResult.data.user;
      const { data: profile, error: profileError } = await withTimeout(
        supabase
          .from('profiles')
          .select('email, role')
          .eq('id', user.id)
          .maybeSingle(),
        'Profile loading timed out. Please refresh and try again.',
      );

      if (profileError) {
        throw new Error('Unable to load your profile details.');
      }

      setAccount({
        email: profile?.email ?? user.email ?? 'Stargazer',
        role: (profile?.role as UserRole | undefined) ?? 'stargazer',
      });
      setDashboardData(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your dashboard. Please try again.',
      );
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const apod = dashboardData?.apod;
  const weather = dashboardData?.weather;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? <DashboardSkeleton /> : null}

        {!isLoading && error ? (
          <section
            role="alert"
            className="mx-auto max-w-xl rounded-2xl border border-red-400/40 bg-red-950/40 p-6 text-center"
          >
            <h1 className="text-xl font-bold text-red-100">Dashboard data is unavailable</h1>
            <p className="mt-2 text-sm text-red-200">{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-5 rounded-lg bg-red-300 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              Refresh dashboard
            </button>
          </section>
        ) : null}

        {!isLoading && !error && apod && weather ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 shadow-xl shadow-indigo-950/30 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Your celestial dashboard
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Welcome, {account?.email ?? 'Stargazer'}
                  </h1>
                  <p className="mt-2 text-slate-300">
                    Tonight’s sky, conditions, and your next observation are all in one place.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-indigo-300/40 bg-indigo-400/15 px-3 py-1.5 text-sm font-semibold capitalize text-indigo-100">
                  {account?.role ?? 'stargazer'}
                </span>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-5">
              <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl lg:col-span-3">
                <div className="border-b border-slate-700 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">
                    Astronomy Picture of the Day
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">{apod.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{apod.date}</p>
                </div>

                {apod.media_type === 'video' ? (
                  <iframe
                    className="aspect-video w-full border-0 bg-black"
                    src={apod.url}
                    title={apod.title}
                    allowFullScreen
                  />
                ) : (
                  // NASA serves APOD images from dynamic external origins that are not known at build time.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="aspect-video w-full bg-slate-950 object-cover"
                    src={apod.url}
                    alt={apod.title}
                  />
                )}

                <div className="p-6">
                  <p className="text-sm leading-7 text-slate-300">{apod.explanation}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                    <a
                      href={apod.hdurl ?? apod.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-300 transition hover:text-indigo-200"
                    >
                      View high-resolution image →
                    </a>
                    {apod.copyright ? (
                      <span className="text-slate-500">© {apod.copyright}</span>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl lg:col-span-2">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">
                  Stargazing Weather &amp; Conditions
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">Live sky conditions</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Greenwich Observatory · {weather.latitude.toFixed(4)}, {weather.longitude.toFixed(4)}
                </p>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <WeatherMetric label="Temperature" value={weather.temperature} unit="°C" />
                  <WeatherMetric label="Cloud cover" value={weather.cloudCover} unit="%" />
                  <WeatherMetric
                    label="Relative humidity"
                    value={weather.relativeHumidity}
                    unit="%"
                  />
                  <WeatherMetric label="Wind speed" value={weather.windSpeed} unit="km/h" />
                  <WeatherMetric label="Visibility" value={weather.visibility} unit="m" />
                </dl>
              </section>
            </div>

            <section className="grid gap-4 md:grid-cols-2" aria-label="Quick navigation">
              <Link
                href="/observations"
                className="group rounded-2xl border border-slate-700 bg-slate-900 p-6 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-slate-800"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">
                  Observation journal
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">User Observation Logs</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Record what you saw, where you observed, and how the night looked.
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-indigo-300 group-hover:text-indigo-200">
                  Open observation logs →
                </span>
              </Link>

              <Link
                href="/ai-guide"
                className="group rounded-2xl border border-slate-700 bg-slate-900 p-6 transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-slate-800"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">
                  Guided exploration
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">Cosmic AI Assistant</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Get tailored help identifying celestial objects and planning observations.
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-sky-300 group-hover:text-sky-200">
                  Ask the AI guide →
                </span>
              </Link>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
