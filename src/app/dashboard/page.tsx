'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Compass,
  Satellite,
  PlusCircle,
  Sparkles,
  Calendar,
  Telescope,
  Star,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Eye,
  Cloud,
  Wind,
  Thermometer,
  Droplets,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

import type { NASAApodResponse } from '@/lib/api/nasa';
import type { StargazingWeather } from '@/lib/api/weather';
import { getBortleDetails, reverseGeocode, type BortleDetails } from '@/lib/api/mapbox';
import { calculateVisibilityScore, type VisibilityScore } from '@/lib/utils/visibility-score';
import { supabase } from '@/lib/supabase';
import type { Equipment, Observation, UserRole } from '@/types/database';
import { useUserLocation } from '@/src/hooks/useUserLocation';
import { LocationSkeletonLoader } from '@/src/components/LocationSkeletonLoader';
import { useAuth } from '@/src/context/AuthContext';

interface DashboardData {
  apod: NASAApodResponse | null;
  weather: StargazingWeather | null;
}

interface SatellitePassSummary {
  satelliteName: string;
  maxElevation: number;
  startTime: string;
  magnitude: number;
  durationSeconds: number;
}

const UPCOMING_EVENTS = [
  {
    id: 'orionids-2026',
    title: 'Orionid Meteor Shower Peak',
    date: 'Oct 21, 2026 · 02:00 UTC',
    description: 'Fast meteors produced by Halley’s Comet. Radiates from Orion in the eastern sky.',
    category: 'Meteor Shower',
    isoDate: '2026-10-21T02:00:00Z',
  },
  {
    id: 'leonids-2026',
    title: 'Leonid Meteor Shower Peak',
    date: 'Nov 17, 2026 · 03:00 UTC',
    description: 'Swift Leonid meteors with persistent glowing trains radiating from Leo before dawn.',
    category: 'Meteor Shower',
    isoDate: '2026-11-17T03:00:00Z',
  },
  {
    id: 'geminids-2026',
    title: 'Geminid Meteor Shower Peak',
    date: 'Dec 13, 2026 · 22:00 UTC',
    description: 'The year’s most intense display with up to 120 multicolored meteors per hour.',
    category: 'Meteor Shower',
    isoDate: '2026-12-13T22:00:00Z',
  },
];

function getMoonPhase(date = new Date()): { phaseName: string; illumination: number; icon: string } {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const diffDays = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const synodicMonth = 29.53058867;
  const phase = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round(((1 - Math.cos((phase / synodicMonth) * 2 * Math.PI)) / 2) * 100);

  if (phase < 1.84) return { phaseName: 'New Moon', illumination, icon: '🌑' };
  if (phase < 5.53) return { phaseName: 'Waxing Crescent', illumination, icon: '🌒' };
  if (phase < 9.22) return { phaseName: 'First Quarter', illumination, icon: '🌓' };
  if (phase < 12.92) return { phaseName: 'Waxing Gibbous', illumination, icon: '🌔' };
  if (phase < 16.61) return { phaseName: 'Full Moon', illumination, icon: '🌕' };
  if (phase < 20.30) return { phaseName: 'Waning Gibbous', illumination, icon: '🌖' };
  if (phase < 23.99) return { phaseName: 'Last Quarter', illumination, icon: '🌗' };
  return { phaseName: 'Waning Crescent', illumination, icon: '🌘' };
}

function getSeeingRating(windSpeed: number, humidity: number, cloudCover: number): { rating: string; badge: string } {
  if (cloudCover > 60 || windSpeed > 30) return { rating: '1/5 (Poor)', badge: 'Poor' };
  if (cloudCover > 30 || windSpeed > 20 || humidity > 85) return { rating: '2/5 (Fair)', badge: 'Fair' };
  if (windSpeed > 12 || humidity > 75) return { rating: '3/5 (Average)', badge: 'Average' };
  if (windSpeed > 6) return { rating: '4/5 (Good)', badge: 'Above Average' };
  return { rating: '5/5 (Excellent)', badge: 'Antoniadi I - Perfect' };
}

export default function DashboardPage() {
  const { requireAuth } = useAuth();
  // GPS & Location State
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 51.4769, lng: -0.0005 });
  const [locationName, setLocationName] = useState<string>('Greenwich, London');
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);

  // Core Data
  const [dashboardData, setDashboardData] = useState<DashboardData>({ apod: null, weather: null });
  const [bortle, setBortle] = useState<BortleDetails>(() => getBortleDetails(51.4769, -0.0005));
  const [visibilityScore, setVisibilityScore] = useState<VisibilityScore>({
    score: 85,
    level: 'Excellent',
    recommendation: 'Excellent conditions for deep-sky observing.',
  });
  const [nextPass, setNextPass] = useState<SatellitePassSummary | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [recentObservations, setRecentObservations] = useState<Observation[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Quick Observation Logger Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logTarget, setLogTarget] = useState('');
  const [logLocation, setLogLocation] = useState('');
  const [logRating, setLogRating] = useState(5);
  const [logNotes, setLogNotes] = useState('');
  const [logEquipmentId, setLogEquipmentId] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Moon Phase
  const moonPhase = getMoonPhase();

  // 1. Strict GPS Location via useUserLocation
  const { location: userLoc, loading: locationLoading } = useUserLocation();

  useEffect(() => {
    if (!locationLoading && userLoc) {
      setCoords({ lat: userLoc.lat, lng: userLoc.lng });
      setLocationName(userLoc.cityName);
      setIsDetectingLocation(false);
    }
  }, [locationLoading, userLoc]);

  // 2. Fetch Dashboard Space Data (Weather, APOD, Bortle) when coords change
  const loadDashboardData = useCallback(async () => {
    try {
      // Calculate local Bortle
      const localBortle = getBortleDetails(coords.lat, coords.lng);
      setBortle(localBortle);

      // Fetch space data (APOD & Open-Meteo)
      const res = await fetch(`/api/space-data?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json);

        if (json.weather) {
          const w = json.weather;
          const score = calculateVisibilityScore({
            cloudCover: w.cloudCover ?? 10,
            humidity: w.relativeHumidity ?? 50,
            windSpeed: w.windSpeed ?? 10,
            visibility: w.visibility ?? 10000,
          });
          setVisibilityScore(score);
        }
      }

      // Fetch upcoming satellite passes
      const passRes = await fetch(`/api/satellites/passes?lat=${coords.lat}&lng=${coords.lng}&days=3`);
      if (passRes.ok) {
        const passJson = await passRes.json();
        if (passJson.passes && passJson.passes.length > 0) {
          const first = passJson.passes[0];
          setNextPass({
            satelliteName: first.satelliteName || 'ISS (Space Station)',
            maxElevation: Math.round(first.maxElevation || 65),
            startTime: first.startTimeFormatted || 'Tonight',
            magnitude: first.magnitude ?? -2.8,
            durationSeconds: first.durationSeconds || 360,
          });
        }
      }

      // Fetch equipment
      const equipRes = await fetch('/api/equipment');
      if (equipRes.ok) {
        const equipJson = await equipRes.json();
        setEquipmentList(equipJson.equipment || []);
      }

      // Fetch observations
      const obsRes = await fetch('/api/observations');
      if (obsRes.ok) {
        const obsJson = await obsRes.json();
        setRecentObservations(obsJson.observations?.slice(0, 3) || []);
      }

      // Fetch saved events
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: savedEvents } = await supabase
          .from('saved_events')
          .select('event_title')
          .eq('user_id', user.id);
        if (savedEvents) {
          setSavedEventIds(new Set(savedEvents.map((e: any) => e.event_title)));
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    if (!locationLoading) {
      void loadDashboardData();
    }
  }, [locationLoading, loadDashboardData]);

  // Set default modal location when locationName changes
  useEffect(() => {
    setLogLocation(locationName);
  }, [locationName]);

  // Quick Observation Logger Submission
  async function handleQuickLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logTitle || !logTarget || !logLocation || !logNotes) return;

    requireAuth(async () => {
      setIsLogging(true);
      try {
        const res = await fetch('/api/observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: logTitle,
            celestial_target: logTarget,
            location: logLocation,
            rating: logRating,
            notes: logNotes,
            equipment_id: logEquipmentId || null,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save observation.');
        }

        const newObs = await res.json();
        if (newObs.observation) {
          setRecentObservations((prev) => [newObs.observation, ...prev.slice(0, 2)]);
        }

        setLogSuccessMessage('Observation successfully recorded in your Log Book!');
        setTimeout(() => {
          setIsLogModalOpen(false);
          setLogSuccessMessage(null);
          setLogTitle('');
          setLogTarget('');
          setLogNotes('');
        }, 1500);
      } catch (err: any) {
        alert(err.message || 'Error saving observation.');
      } finally {
        setIsLogging(false);
      }
    }, "Sign in to log celestial observations to your personal logbook");
  }

  // Toggle Save Event
  async function handleToggleSaveEvent(eventItem: (typeof UPCOMING_EVENTS)[0]) {
    requireAuth(async () => {
      const isSaved = savedEventIds.has(eventItem.title);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      if (isSaved) {
        // Remove
        await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_title', eventItem.title);
        setSavedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventItem.title);
          return next;
        });
      } else {
        // Add
        await supabase.from('saved_events').insert({
          user_id: user.id,
          event_title: eventItem.title,
          event_date: eventItem.isoDate,
          notes: eventItem.description,
        });
        setSavedEventIds((prev) => new Set([...prev, eventItem.title]));
      }
    }, "Sign in to save celestial events to your observing planner");
  }

  const seeing = getSeeingRating(
    dashboardData.weather?.windSpeed ?? 10,
    dashboardData.weather?.relativeHumidity ?? 50,
    dashboardData.weather?.cloudCover ?? 10
  );

  if (locationLoading) {
    return (
      <div className="space-y-8 pb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Stargazer Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tonight&apos;s Observing Dashboard
          </h1>
        </div>
        <LocationSkeletonLoader message="Detecting your exact stargazing location..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-8"
    >
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Stargazer Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tonight&apos;s Observing Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>
              {isDetectingLocation ? 'Detecting coordinates via GPS…' : locationName}
            </span>
          </div>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => requireAuth(() => setIsLogModalOpen(true), "Sign in to record a new celestial observation")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-950/50 hover:from-sky-400 hover:to-indigo-500 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Log Target</span>
          </button>
          <Link
            href="/map"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:border-sky-500/50 transition-all hover:bg-slate-800"
          >
            <MapPin className="h-4 w-4 text-sky-400" />
            <span>Dark Sky Map</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Location-Aware Live Sky Conditions Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Live Sky Conditions Card */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Live Atmospheric Telemetry
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Sky Conditions in {locationName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                GPS: {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
              </p>
            </div>

            {/* Bortle Badge */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border"
              style={{
                backgroundColor: `${bortle.color}15`,
                borderColor: `${bortle.color}40`,
              }}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: bortle.color }}
              />
              <div>
                <p className="text-xs font-bold text-white">{bortle.title}</p>
                <p className="text-[10px] text-slate-300">NELM: {bortle.nelm} mag</p>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Cloud Cover */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Cloud className="h-4 w-4 text-sky-400" />
                <span>Cloud Cover</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {dashboardData.weather?.cloudCover ?? 12}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {(dashboardData.weather?.cloudCover ?? 12) < 20
                  ? 'Optimal Clear Skies'
                  : 'Partially Obscured'}
              </p>
            </div>

            {/* Moon Phase */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <span className="text-base">{moonPhase.icon}</span>
                <span>Moon Phase</span>
              </div>
              <p className="text-sm font-bold text-white truncate">
                {moonPhase.phaseName}
              </p>
              <p className="text-[10px] text-sky-400 mt-0.5">
                {moonPhase.illumination}% Illumination
              </p>
            </div>

            {/* Seeing Rating */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Eye className="h-4 w-4 text-emerald-400" />
                <span>Seeing Rating</span>
              </div>
              <p className="text-lg font-bold text-white">{seeing.badge}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{seeing.rating}</p>
            </div>

            {/* Temperature / Humidity */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Thermometer className="h-4 w-4 text-amber-400" />
                <span>Air Temp</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {dashboardData.weather?.temperature ?? 16}°C
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                <Droplets className="h-3 w-3 text-sky-400" />
                <span>{dashboardData.weather?.relativeHumidity ?? 65}% Humidity</span>
              </div>
            </div>
          </div>

          {/* Stargazing Recommendation Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-purple-950/20 border border-sky-500/20 p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-sky-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-sky-200">Session Forecast: </strong>
              {visibilityScore.recommendation} Ideal targets:{' '}
              {bortle.suitableTargets.slice(0, 3).join(', ')}.
            </p>
          </div>
        </div>

        {/* Animated Stargazing Score Dial */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Session Feasibility
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">Stargazing Score</h3>
          </div>

          {/* Radial Circular Dial */}
          <div className="relative my-4 flex items-center justify-center">
            <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 160 160">
              {/* Background track */}
              <circle
                cx="80"
                cy="80"
                r="64"
                stroke="currentColor"
                strokeWidth="12"
                className="text-slate-800/80"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="64"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * Math.min(100, visibilityScore.score)) / 100}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${
                  visibilityScore.score >= 80
                    ? 'text-emerald-400'
                    : visibilityScore.score >= 60
                    ? 'text-sky-400'
                    : visibilityScore.score >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
                fill="transparent"
              />
            </svg>

            {/* Inner Score Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white tracking-tighter">
                {Math.round(visibilityScore.score)}
              </span>
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                / 100
              </span>
              <span
                className={`mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  visibilityScore.score >= 80
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : visibilityScore.score >= 60
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {visibilityScore.level}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 px-2">
            Calculated from cloud coverage, wind shears, and optical seeing.
          </p>
        </div>
      </div>

      {/* Row 2: Upcoming Celestial Events Banner (Horizontal Dynamic Deck) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Upcoming Celestial Events
            </h3>
          </div>
          <Link
            href="/events"
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            <span>View All Events</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {UPCOMING_EVENTS.map((event) => {
            const isSaved = savedEventIds.has(event.title);
            return (
              <div
                key={event.id}
                className="glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-sky-500/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      {event.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {event.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{event.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSaveEvent(event)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isSaved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Saved to Events</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-3.5 w-3.5 text-sky-400" />
                      <span>Save to My Calendar</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Widgets Grid (ISS Pass + Equipment Readiness + Recent Logs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Widget 1: ISS / Satellite Pass Quick Tracker */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Satellite className="h-4 w-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Satellite Pass Tracker
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Orbit
              </span>
            </div>

            {nextPass ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">
                    {nextPass.satelliteName}
                  </span>
                  <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/30">
                    Mag {nextPass.magnitude}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Max Elevation</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {nextPass.maxElevation}° Above Horiz.
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pass Duration</span>
                    <span className="font-bold text-white text-sm">
                      {Math.round(nextPass.durationSeconds / 60)} min
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Scheduled arrival at your location:{' '}
                  <strong className="text-slate-200">{nextPass.startTime}</strong>
                </p>
              </div>
            ) : (
              <div className="mt-6 text-center py-6">
                <Satellite className="h-8 w-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-400">
                  Calculating next visible ISS &amp; Tiangong passes for {locationName}…
                </p>
              </div>
            )}
          </div>

          <Link
            href="/satellites"
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Orbit Tracker</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Widget 2: Equipment Readiness Summary */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Equipment Readiness
                </h4>
              </div>
              <span className="text-[10px] text-sky-400 font-medium">
                {equipmentList.length} Registered
              </span>
            </div>

            {equipmentList.length > 0 ? (
              <div className="mt-4 space-y-3">
                {equipmentList.slice(0, 2).map((item) => {
                  const focalRatio = (
                    Number(item.focal_length_mm) / Number(item.aperture_mm)
                  ).toFixed(1);
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        <span className="text-[10px] capitalize px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Aperture: {item.aperture_mm}mm</span>
                        <span>•</span>
                        <span>Focal: {item.focal_length_mm}mm</span>
                        <span>•</span>
                        <span className="text-sky-300 font-medium">f/{focalRatio}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Optical Trains Aligned &amp; Ready</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-4">
                <Telescope className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  No telescope registered yet. Add your optics to calculate magnification limits.
                </p>
              </div>
            )}
          </div>

          <Link
            href="/equipment"
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Manage Optics Inventory</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Widget 3: Recent Observations Stream */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Telescope className="h-4 w-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Recent Target Log
                </h4>
              </div>
              <button
                type="button"
                onClick={() => requireAuth(() => setIsLogModalOpen(true), "Sign in to record a new celestial observation")}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold"
              >
                + Log New
              </button>
            </div>

            {recentObservations.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {recentObservations.map((obs) => (
                  <div
                    key={obs.id}
                    className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate max-w-[140px]">
                        {obs.celestial_target}
                      </span>
                      <div className="flex items-center text-amber-400 text-[10px]">
                        {Array.from({ length: obs.rating || 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{obs.notes}</p>
                    <p className="text-[10px] text-slate-400">{obs.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-center py-4">
                <p className="text-xs text-slate-400">
                  No targets logged yet. Complete your first observation tonight!
                </p>
              </div>
            )}
          </div>

          <Link
            href="/observations"
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Full Observation Log</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Row 4: NASA Astronomy Picture of the Day Hero Spotlight */}
      {dashboardData.apod && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              NASA APOD • Daily Cosmic Spotlight
            </span>
            <span className="text-xs text-slate-400">{dashboardData.apod.date}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {dashboardData.apod.media_type === 'image' ? (
              <div className="lg:col-span-1 rounded-2xl overflow-hidden max-h-72 border border-slate-800">
                <img
                  src={dashboardData.apod.url}
                  alt={dashboardData.apod.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="lg:col-span-1 h-64 rounded-2xl overflow-hidden border border-slate-800">
                <iframe
                  src={dashboardData.apod.url}
                  title={dashboardData.apod.title}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}

            <div className="lg:col-span-2 space-y-2">
              <h3 className="text-xl font-bold text-white">
                {dashboardData.apod.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-5">
                {dashboardData.apod.explanation}
              </p>
              {dashboardData.apod.copyright && (
                <p className="text-[11px] text-slate-400">
                  Credit: {dashboardData.apod.copyright}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Observation Logger Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsLogModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700 z-50"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Telescope className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Quick Observation Logger
                    </h3>
                    <p className="text-xs text-slate-400">
                      Record an observing target without leaving the dashboard
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {logSuccessMessage ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
                  <p className="text-sm font-bold text-white">{logSuccessMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleQuickLogSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Session Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Autumn Planetary Session"
                      value={logTitle}
                      onChange={(e) => setLogTitle(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Celestial Target
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jupiter & Galilean Moons, M42, Pleiades"
                      value={logTarget}
                      onChange={(e) => setLogTarget(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    {/* Quick Target Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Jupiter', 'Saturn', 'M31 Andromeda', 'M42 Orion', 'Pleiades'].map(
                        (chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setLogTarget(chip)}
                            className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-sky-300 hover:bg-sky-500/20 transition-colors"
                          >
                            + {chip}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Observing Location
                      </label>
                      <input
                        type="text"
                        required
                        value={logLocation}
                        onChange={(e) => setLogLocation(e.target.value)}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Rating (1 - 5 Stars)
                      </label>
                      <select
                        value={logRating}
                        onChange={(e) => setLogRating(Number(e.target.value))}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 - Great View)</option>
                        <option value={3}>⭐⭐⭐ (3 - Moderate)</option>
                        <option value={2}>⭐⭐ (2 - Faint / Hazy)</option>
                        <option value={1}>⭐ (1 - Obscured)</option>
                      </select>
                    </div>
                  </div>

                  {equipmentList.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Equipment Used
                      </label>
                      <select
                        value={logEquipmentId}
                        onChange={(e) => setLogEquipmentId(e.target.value)}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="">None / Naked Eye</option>
                        {equipmentList.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} ({eq.aperture_mm}mm {eq.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Observing Notes &amp; Sky Detail
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Atmospheric stability, filters used, magnification, notable features..."
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsLogModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLogging}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-sky-950/50 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50"
                    >
                      {isLogging ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <span>Save Observation</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
