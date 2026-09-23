"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Compass,
  Crosshair,
  ExternalLink,
  Eye,
  Globe,
  MapPin,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { getBortleDetails, reverseGeocode, type BortleDetails } from "@/lib/api/mapbox";
import { useUserLocation } from "@/src/hooks/useUserLocation";
import { LocationSkeletonLoader } from "@/src/components/LocationSkeletonLoader";

const DynamicClientMap = dynamic(() => import("@/components/ClientMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[600px] w-full items-center justify-center rounded-xl bg-slate-900/60 text-slate-500 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <Globe className="h-8 w-8 animate-spin text-sky-400" />
        <span className="text-xs">Loading dark sky map...</span>
      </div>
    </div>
  ),
});

interface DarkSkyPreset {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

const DARK_SKY_PRESETS: DarkSkyPreset[] = [
  { name: "Cherry Springs State Park", lat: 41.6624, lon: -77.8231, country: "USA" },
  { name: "Mauna Kea Observatory", lat: 19.8206, lon: -155.4681, country: "Hawaii" },
  { name: "Atacama Dark Sky Reserve", lat: -24.6272, lon: -70.4042, country: "Chile" },
  { name: "Death Valley National Park", lat: 36.5323, lon: -116.9325, country: "USA" },
  { name: "Greenwich Royal Observatory", lat: 51.4769, lon: -0.0005, country: "UK" },
];

export default function LightPollutionMapPage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const isTokenConfigured = Boolean(token && token.trim().length > 0);

  // Selected coordinate state (Defaults to Cherry Springs, PA - renowned Dark Sky Park)
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number }>({
    lat: 41.6624,
    lon: -77.8231,
  });
  const [locationName, setLocationName] = useState<string>("Cherry Springs State Park, PA");
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [bortle, setBortle] = useState<BortleDetails>(() =>
    getBortleDetails(41.6624, -77.8231),
  );

  const { location: userLoc, loading: locationLoading } = useUserLocation();

  useEffect(() => {
    if (!locationLoading && userLoc) {
      setCoordinates({ lat: userLoc.lat, lon: userLoc.lng });
      setLocationName(userLoc.cityName);
      const computedBortle = getBortleDetails(userLoc.lat, userLoc.lng);
      setBortle(computedBortle);
    }
  }, [locationLoading, userLoc]);

  // Format latitude & longitude to 4 decimal places with hemisphere designations
  function formatCoordinate(lat: number, lon: number): string {
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
  }

  // Handle location update on map click or preset selection
  async function handleLocationChange(lat: number, lon: number) {
    setCoordinates({ lat, lon });
    const computedBortle = getBortleDetails(lat, lon);
    setBortle(computedBortle);

    setIsGeocoding(true);
    setGeoError(null);
    try {
      const place = await reverseGeocode(lat, lon);
      setLocationName(place);
    } catch {
      setLocationName(formatCoordinate(lat, lon));
    } finally {
      setIsGeocoding(false);
    }
  }

  // "Geolocate Me" handler using browser GPS API
  function handleGeolocateMe() {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        void handleLocationChange(lat, lon);
      },
      (error) => {
        setIsLocating(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Click anywhere on the map instead."
            : "Could not retrieve GPS location. Please select manually on the map.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  // Pre-fill query link for Observations page
  const observationLink = `/observations?location=${encodeURIComponent(
    locationName,
  )}&target=${encodeURIComponent(bortle.suitableTargets[0] ?? "Deep Sky Objects")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              <Globe className="h-3.5 w-3.5" />
              Interactive Light Pollution Map
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
              Bortle Suitability Engine
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Stargazing Dark Sky & Bortle Analyzer
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Click anywhere on the globe to analyze artificial sky glow, Naked-Eye Limiting Magnitude
            (NELM), and discover optimal astronomical targets.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGeolocateMe}
          disabled={isLocating}
          className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Crosshair className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
          {isLocating ? "Locating GPS…" : "Geolocate Me"}
        </button>
      </div>

      {/* Missing Token Alert */}
      {!isTokenConfigured ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-400/40 bg-amber-950/40 p-5 backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-bold text-amber-200">
                Mapbox Access Token Not Configured
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-300/90">
                To view interactive satellite and dark sky map tiles, add your Mapbox public token
                to <code className="rounded bg-amber-900/60 px-1.5 py-0.5 font-mono text-amber-100">.env.local</code>:
              </p>
              <div className="mt-2 rounded-lg bg-slate-950/80 p-2.5 font-mono text-xs text-amber-100">
                NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91...
              </div>
              <p className="mt-2 text-xs text-amber-200/80">
                The Bortle Suitability Engine and celestial target calculations remain fully active below.
                Use the quick preset dark sky locations to test the analyzer.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Geolocation Notice / Error */}
      {geoError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-200"
        >
          {geoError}
        </div>
      ) : null}

      {/* Quick Dark Sky Presets Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <span className="flex items-center gap-1 font-semibold text-slate-400">
          <Compass className="h-3.5 w-3.5 text-sky-400" />
          Quick Presets:
        </span>
        {DARK_SKY_PRESETS.map((preset) => {
          const isCurrent =
            Math.abs(coordinates.lat - preset.lat) < 0.01 &&
            Math.abs(coordinates.lon - preset.lon) < 0.01;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => void handleLocationChange(preset.lat, preset.lon)}
              className={`flex-shrink-0 rounded-full border px-3 py-1 font-medium transition ${
                isCurrent
                  ? "border-sky-400 bg-sky-500/25 text-white"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
              }`}
            >
              {preset.name} <span className="text-slate-500">({preset.country})</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Map Canvas + Glassmorphism Side Panel */}
      {locationLoading ? (
        <LocationSkeletonLoader message="Detecting your exact stargazing location..." />
      ) : (
        <div className="grid flex-1 gap-6 lg:grid-cols-12">
          {/* Map Canvas Column */}
          <div className="relative min-h-[600px] w-full rounded-xl border border-slate-800 bg-slate-900 shadow-2xl lg:col-span-7 xl:col-span-8">
            {isTokenConfigured ? (
              <DynamicClientMap
                coordinates={coordinates}
                onLocationChange={handleLocationChange}
                token={token}
              />
            ) : (
              <div className="flex h-full min-h-[600px] w-full flex-col items-center justify-center p-8 text-center">
                <MapPin className="h-12 w-12 text-slate-600 animate-bounce" />
                <h3 className="mt-4 text-lg font-bold text-slate-300">
                  Interactive Map Tile Mode Paused
                </h3>
                <p className="mt-2 max-w-md text-xs text-slate-400">
                  Provide a valid token to enable Mapbox WebGL dark tiles. You can still select
                  preset dark sky reserves or click below to analyze coordinates.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {DARK_SKY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => void handleLocationChange(preset.lat, preset.lon)}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-sky-400 hover:text-white"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Map Canvas Floating Coordinate Badge */}
            <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-xl border border-slate-700/80 bg-slate-950/85 px-3 py-1.5 font-mono text-xs text-slate-300 shadow-lg backdrop-blur-md">
              {formatCoordinate(coordinates.lat, coordinates.lon)}
            </div>
          </div>

          {/* Side Information Panel (Glassmorphism Card) */}
          <aside className="flex flex-col rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl lg:col-span-5 xl:col-span-4">
            {/* Header: Location & Coordinates */}
            <div className="border-b border-slate-800/80 pb-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Inspected Location
                  </span>
                  <h2 className="mt-1 text-xl font-bold leading-snug text-white">
                    {isGeocoding ? (
                      <span className="animate-pulse text-slate-400">Reverse geocoding…</span>
                    ) : (
                      locationName
                    )}
                  </h2>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-400">
                  <MapPin className="h-5 w-5 text-sky-400" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 font-mono text-xs text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{formatCoordinate(coordinates.lat, coordinates.lon)}</span>
              </div>
            </div>

            {/* Bortle Rating Dynamic Badge */}
            <div className="mt-5 rounded-xl border border-slate-700/60 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Dark Sky Rating
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-sm"
                  style={{
                    backgroundColor: `${bortle.color}25`,
                    borderColor: `${bortle.color}60`,
                    color: bortle.color,
                  }}
                >
                  <span
                    style={{ backgroundColor: bortle.color }}
                    className="h-2 w-2 rounded-full animate-pulse"
                  />
                  Class {bortle.bortleClass} of 9
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-white">{bortle.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {bortle.description}
              </p>
            </div>

            {/* Metrics Breakdown (NELM & Pristine Index) */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                  <span>NELM</span>
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">
                  {bortle.nelm.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-400">mag</span>
                </div>
                <span className="text-[10px] text-slate-500">Limiting Visual Mag</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Sky Darkness</span>
                </div>
                <div className="mt-1 text-lg font-bold text-slate-100">
                  {Math.round(((10 - bortle.bortleClass) / 9) * 100)}%
                </div>
                <span className="text-[10px] text-slate-500">Pristine Index</span>
              </div>
            </div>

            {/* Suitable Observing Targets */}
            <div className="mt-5 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recommended Sky Targets
              </span>
              <ul className="mt-2.5 space-y-2 text-xs">
                {bortle.suitableTargets.map((target, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-slate-300"
                  >
                    <Sparkles className="h-3 w-3 text-sky-400 flex-shrink-0" />
                    <span>{target}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Callout: Log Observation */}
            <div className="mt-6 border-t border-slate-800/80 pt-4">
              <Link
                href={observationLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-950/50 transition hover:from-sky-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <span>Record Observation from Here</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Pre-fills your observation record with {locationName} and suggested targets.
              </p>
            </div>
          </aside>
        </div>
      )}
    </motion.div>
  );
}
