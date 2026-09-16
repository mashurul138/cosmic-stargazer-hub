"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Compass,
  Crosshair,
  Download,
  Eye,
  Orbit,
  Radio,
  RefreshCw,
  Rocket,
  Satellite as SatelliteIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { motion } from "framer-motion";
import type { VisualPassPrediction } from "@/lib/api/n2yo";

type TargetFilter = "all" | "25544" | "20580" | "48274";

const FILTER_TABS: { id: TargetFilter; label: string; satId?: number }[] = [
  { id: "all", label: "All Visible" },
  { id: "25544", label: "ISS (Space Station)", satId: 25544 },
  { id: "20580", label: "Hubble Telescope", satId: 20580 },
  { id: "48274", label: "Tiangong Space Station", satId: 48274 },
];

function formatPassDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function getVisibilityBadge(maxElevation: number) {
  if (maxElevation >= 50) {
    return {
      label: "Spectacular Overhead Pass",
      className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    };
  }
  if (maxElevation >= 30) {
    return {
      label: "Great High Pass",
      className: "border-sky-400/40 bg-sky-500/15 text-sky-300",
    };
  }
  return {
    label: "Low Horizon Pass",
    className: "border-amber-400/40 bg-amber-500/15 text-amber-300",
  };
}

/**
 * Generates and triggers download of an RFC 5545 compliant .ics calendar event file
 */
function downloadPassIcs(pass: VisualPassPrediction, locationStr: string) {
  const formatIcsDate = (isoStr: string) =>
    new Date(isoStr).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const startUtc = formatIcsDate(pass.startTime);
  const endUtc = formatIcsDate(pass.endTime);
  const summary = `🔭 ${pass.satName} Visual Pass (${pass.maxElevation}° Max Elevation)`;
  const description = [
    `Watch the ${pass.satName} pass overhead!`,
    `Peak Elevation: ${pass.maxElevation}°`,
    `Trajectory: Rises ${pass.startAzimuthCompass} -> Sets ${pass.endAzimuthCompass}`,
    `Estimated Brightness: Mag ${pass.maxBrightnessMag}`,
    `Duration: ${formatDuration(pass.durationSeconds)}`,
    `Observer Coordinates: ${locationStr}`,
  ].join("\\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cosmic Stargazer Hub//Satellite Pass Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:pass-${pass.satId}-${startUtc}@cosmicstargazer.hub`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${locationStr}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${pass.satName} passes in 15 minutes!`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${pass.satName.replace(/[^a-zA-Z0-9]/g, "_")}_${startUtc.slice(0, 8)}.ics`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SatellitesTrackerPage() {
  const [lat, setLat] = useState<number>(40.7128); // Default to NYC coordinates
  const [lng, setLng] = useState<number>(-74.006);
  const [latInput, setLatInput] = useState<string>("40.7128");
  const [lngInput, setLngInput] = useState<string>("-74.006");

  const [selectedFilter, setSelectedFilter] = useState<TargetFilter>("all");
  const [passes, setPasses] = useState<VisualPassPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time countdown clock state
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch passes whenever location or filter changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchPasses() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const satIdParam = selectedFilter !== "all" ? `&satId=${selectedFilter}` : "";
        const url = `/api/satellites/passes?lat=${lat}&lng=${lng}&days=5${satIdParam}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load satellite passes (${response.status})`);
        }

        const data = (await response.json()) as {
          passes: VisualPassPrediction[];
          error?: string;
        };

        if (!isCancelled) {
          setPasses(data.passes || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Unable to retrieve satellite pass schedule.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchPasses();

    return () => {
      isCancelled = true;
    };
  }, [lat, lng, selectedFilter]);

  // Identify next upcoming pass (future passes only)
  const upcomingPasses = useMemo(() => {
    return passes.filter((p) => new Date(p.endTime).getTime() > nowMs);
  }, [passes, nowMs]);

  const featuredPass = upcomingPasses[0] ?? null;

  // Compute countdown string for featured pass
  const countdownString = useMemo(() => {
    if (!featuredPass) return null;
    const startMs = new Date(featuredPass.startTime).getTime();
    const endMs = new Date(featuredPass.endTime).getTime();

    if (nowMs >= startMs && nowMs <= endMs) {
      return "PASS IN PROGRESS NOW";
    }

    const diffMs = Math.max(0, startMs - nowMs);
    const totalSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h ${minutes}m ${seconds}s`;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [featuredPass, nowMs]);

  function handleDetectLocation() {
    if (!("geolocation" in navigator)) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newLat = Number(pos.coords.latitude.toFixed(4));
        const newLng = Number(pos.coords.longitude.toFixed(4));
        setLat(newLat);
        setLng(newLng);
        setLatInput(newLat.toString());
        setLngInput(newLng.toString());
      },
      (error) => {
        setIsLocating(false);
        setErrorMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enter coordinates manually."
            : "Could not retrieve GPS coordinates. Please enter manually.",
        );
      },
      { timeout: 8000 },
    );
  }

  function handleCoordinateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);

    if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      setErrorMessage("Please enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }

    setErrorMessage(null);
    setLat(parsedLat);
    setLng(parsedLng);
  }

  const observerLocationString = `${lat >= 0 ? lat.toFixed(4) + "° N" : Math.abs(lat).toFixed(4) + "° S"}, ${lng >= 0 ? lng.toFixed(4) + "° E" : Math.abs(lng).toFixed(4) + "° W"}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
        {/* Page Header */}
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                <SatelliteIcon className="h-3.5 w-3.5" />
                Feature 2: Live ISS & Satellite Tracker
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                SGP4 Orbital Engine
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Live Space Station & Satellite Pass Tracker
            </h1>
            <p className="text-sm text-slate-400">
              Track upcoming visible passes of the International Space Station, Hubble Space Telescope,
              and Tiangong Space Station above your location.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/25 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
          >
            <Crosshair className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
            {isLocating ? "Detecting GPS…" : "Detect My Location"}
          </button>
        </header>

        {/* Location & Filter Control Bar */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Coordinate Form */}
            <form onSubmit={handleCoordinateSubmit} className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Coordinates:
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="lat-input" className="sr-only">Latitude</label>
                <input
                  id="lat-input"
                  type="number"
                  step="any"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="Lat"
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400"
                />
                <label htmlFor="lng-input" className="sr-only">Longitude</label>
                <input
                  id="lng-input"
                  type="number"
                  step="any"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="Lng"
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                >
                  Update
                </button>
              </div>
              <span className="text-xs text-slate-400">({observerLocationString})</span>
            </form>

            {/* Target Satellite Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Satellite:
              </span>
              <div className="flex flex-wrap rounded-xl border border-slate-800 bg-slate-950 p-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      selectedFilter === tab.id
                        ? "bg-sky-500 text-white shadow-md shadow-sky-950/50"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-200"
            >
              {errorMessage}
            </div>
          ) : null}
        </section>

        {/* Featured Next Pass Card */}
        {featuredPass ? (
          <section className="mb-8 overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 p-6 sm:p-8 shadow-2xl shadow-indigo-950/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-300">
                    <Rocket className="h-3.5 w-3.5" />
                    Next Upcoming Pass
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      getVisibilityBadge(featuredPass.maxElevation).className
                    }`}
                  >
                    {getVisibilityBadge(featuredPass.maxElevation).label}
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {featuredPass.satName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Pass begins at{" "}
                    <span className="font-semibold text-sky-300">
                      {formatPassDate(featuredPass.startTime)}
                    </span>{" "}
                    for a duration of {formatDuration(featuredPass.durationSeconds)}.
                  </p>
                </div>
              </div>

              {/* Countdown Display */}
              <div className="flex flex-col items-start lg:items-end">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Time Until Visible Pass
                </span>
                <div className="mt-1 flex items-baseline gap-2 font-mono text-3xl font-black tabular-nums text-white sm:text-4xl">
                  <span className="text-sky-400">{countdownString}</span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadPassIcs(featuredPass, observerLocationString)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Add to Calendar (.ics)
                </button>
              </div>
            </div>

            {/* Trajectory Metrics Grid */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <TrendingUp className="h-4 w-4 text-sky-400" />
                  <span>Max Elevation</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {featuredPass.maxElevation}°
                </div>
                <p className="text-[11px] text-slate-400">Peak height above horizon</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  <span>Trajectory (Entry → Exit)</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
                  <span className="text-emerald-300">{featuredPass.startAzimuthCompass}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-sky-300">{featuredPass.endAzimuthCompass}</span>
                </div>
                <p className="text-[11px] text-slate-400">Sky travel direction</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Brightness Magnitude</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  Mag {featuredPass.maxBrightnessMag}
                </div>
                <p className="text-[11px] text-slate-400">
                  {featuredPass.maxBrightnessMag < 0 ? "Extremely bright naked-eye" : "Visible naked-eye"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Orbit className="h-4 w-4 text-indigo-400" />
                  <span>Pass Duration</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {formatDuration(featuredPass.durationSeconds)}
                </div>
                <p className="text-[11px] text-slate-400">Total time above horizon</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* 5-Day Pass Schedule Table */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">5-Day Visible Pass Schedule</h2>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  {upcomingPasses.length} {upcomingPasses.length === 1 ? "pass" : "passes"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visual passes where the satellite reflects sunlight during dawn or dusk.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
              <p className="mt-3 text-sm font-semibold text-slate-300">
                Propagating orbital trajectories…
              </p>
              <p className="text-xs text-slate-500">Calculating SGP4 vectors for your observer horizon</p>
            </div>
          ) : upcomingPasses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
              <Eye className="mx-auto h-10 w-10 text-slate-600" />
              <h3 className="mt-3 text-base font-bold text-slate-300">No Visible Passes Found</h3>
              <p className="mt-1 text-xs text-slate-400">
                No high-visibility passes match the selected satellite for this latitude over the next 5 days.
                Try selecting "All Visible" or adjusting observer coordinates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Satellite</th>
                    <th className="pb-3 px-4">Date & Start Time</th>
                    <th className="pb-3 px-4">Duration</th>
                    <th className="pb-3 px-4">Max Elevation</th>
                    <th className="pb-3 px-4">Trajectory</th>
                    <th className="pb-3 px-4">Magnitude</th>
                    <th className="pb-3 pl-4 text-right">Calendar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {upcomingPasses.map((pass, index) => {
                    const badge = getVisibilityBadge(pass.maxElevation);
                    return (
                      <tr
                        key={`${pass.satId}-${pass.startTime}-${index}`}
                        className="transition hover:bg-slate-800/40"
                      >
                        <td className="py-4 pr-4">
                          <div className="font-bold text-white">{pass.satName}</div>
                          <span
                            className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono text-xs text-slate-200">
                          {formatPassDate(pass.startTime)}
                        </td>

                        <td className="py-4 px-4 text-slate-300">
                          {formatDuration(pass.durationSeconds)}
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-bold text-white">{pass.maxElevation}°</span>
                        </td>

                        <td className="py-4 px-4 font-mono text-xs">
                          <span className="text-emerald-300">{pass.startAzimuthCompass}</span>
                          <span className="mx-1 text-slate-600">→</span>
                          <span className="text-sky-300">{pass.endAzimuthCompass}</span>
                        </td>

                        <td className="py-4 px-4 text-slate-300">
                          Mag {pass.maxBrightnessMag}
                        </td>

                        <td className="py-4 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() => downloadPassIcs(pass, observerLocationString)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:bg-slate-700 hover:text-white"
                          >
                            <Download className="h-3 w-3 text-sky-400" />
                            Add .ics
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </motion.div>
  );
}
