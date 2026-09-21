"use client";

import { motion } from "framer-motion";
import { Compass, MapPin, Sparkles } from "lucide-react";

interface LocationSkeletonLoaderProps {
  message?: string;
}

export function LocationSkeletonLoader({
  message = "Detecting your exact stargazing location...",
}: LocationSkeletonLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="relative flex min-h-[380px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-sky-500/20 bg-slate-900/60 p-8 text-center backdrop-blur-2xl shadow-2xl shadow-sky-950/40"
    >
      {/* Background Cosmic Pulse Glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />

      {/* Pulsing Radar Ring & Compass Icon */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full border border-sky-400/40 bg-sky-500/10" />
        <div className="absolute inset-2 animate-pulse rounded-full border border-indigo-400/50 bg-indigo-500/10" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-400/40 bg-gradient-to-tr from-slate-900 to-sky-950 shadow-lg shadow-sky-500/30">
          <Compass className="h-8 w-8 animate-spin text-sky-300 [animation-duration:8s]" />
          <MapPin className="absolute h-4 w-4 text-indigo-400 animate-bounce" />
        </div>
      </div>

      {/* Main Status Text */}
      <div className="relative z-10 max-w-md space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          High-Precision GPS Lock
        </div>

        <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {message}
        </h3>

        <p className="text-xs text-slate-400 sm:text-sm">
          Calibrating atmospheric parameters, local Bortle light pollution index, and satellite orbital trajectories for your exact coordinates.
        </p>
      </div>

      {/* Animated Shimmer Placeholders */}
      <div className="relative z-10 mt-8 w-full max-w-sm space-y-2.5">
        <div className="h-2.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
          <div className="h-full w-2/3 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Querying GPS Triangulation...</span>
          <span className="text-sky-400">Resolving</span>
        </div>
      </div>
    </motion.div>
  );
}
